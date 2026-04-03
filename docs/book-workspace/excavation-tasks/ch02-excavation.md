# ch02 挖掘任务卡：为什么强

**认领人：** startheart
**状态：** 已完成 ✅
**目标章节：** `docs/book/chapters/ch02-为什么强.md`（当前 104 行）
**写作规范：** `docs/book-workspace/methodology/writing-principles.md`

---

## 背景与现状

ch02 聚焦"Claude Code 为什么比同类工具强"，论证了六个机制：上下文边界拉高（`queryLoop`）、工具执行流水线（`StreamingToolExecutor`）、`--resume`/检查点、多 agent 协调（`tasks.ts`）、卧底模式（`undercover.ts`）、反蒸馏（`anti_distillation`）。

现有内容的主要缺口：
1. **`StreamingToolExecutor` 的流式并发细节没有** — 章节说"工具在流式传输时就开始执行"，但没有说清楚这个"提前执行"具体节省了多少，以及它在什么时候会产生 race condition
2. **多 agent 协调的实际约束没有** — 章节提到 `tasks.ts` 管理协调，但没有量化：最多几个 agent 并发？锁争用的回退机制是什么？
3. **反蒸馏两层机制的设计意图对比缺失** — `fake_tools` 和 `streamlinedTransform` 是两个机制，目的不同，章节把它们合在一起没有分开解释

---

## 挖掘任务

### 🔴 必答（ch02 改稿必须覆盖）

**任务 1：StreamingToolExecutor 的流式提前执行**

文件：`src/services/tools/StreamingToolExecutor.ts`

**结论 1-A：工具在收到完整 assistant 消息块时立即开始执行，不等整个流结束**
- 状态：verified
- 行号：`src/query.ts:836-854`
- 关键代码：
```typescript
if (message.type === 'assistant') {
  // ...
  if (streamingToolExecutor && !toolUseContext.abortController.signal.aborted) {
    for (const toolBlock of msgToolUseBlocks) {
      streamingToolExecutor.addTool(toolBlock, message)  // L852: 收到 assistant 消息即触发
    }
  }
}
```
- 说明：`addTool` 在 `message.type === 'assistant'` 分支里调用，而这个分支在流式迭代的每次 `yield` 里都会触发。也就是说，只要模型输出了一个完整的 `tool_use` 块（包含在 assistant 消息里），工具就立即进入执行队列，不等后续流内容到达。

**结论 1-B：并发控制规则比想象中严格——一旦有非 safe 工具在执行，所有后续工具（包括 safe 的）都必须等**
- 状态：verified
- 行号：`src/services/tools/StreamingToolExecutor.ts:129-135`
- 关键代码：
```typescript
private canExecuteTool(isConcurrencySafe: boolean): boolean {
  const executingTools = this.tools.filter(t => t.status === 'executing')
  return (
    executingTools.length === 0 ||
    (isConcurrencySafe && executingTools.every(t => t.isConcurrencySafe))
  )
}
```
- 说明：条件是"当前没有任何工具在执行"**或**"新工具是 safe 且所有执行中工具都是 safe"。这意味着：只要有一个非 safe 工具在执行，`executingTools.every(t => t.isConcurrencySafe)` 就为 false，后续所有工具（包括 safe 的）都无法启动。

**结论 1-C：`streaming_fallback` 触发条件是流式请求中途出错，executor 被 discard，已启动的工具收到合成错误消息**
- 状态：verified
- 行号：`src/services/tools/StreamingToolExecutor.ts:64-71, 174-188`；`src/query.ts:919-929`
- 关键代码：
```typescript
// query.ts:922-928: 流式失败时 discard 旧 executor，创建新的
if (streamingToolExecutor) {
  streamingToolExecutor.discard()
  streamingToolExecutor = new StreamingToolExecutor(...)
}
// StreamingToolExecutor.ts:174-187: discard 后工具收到合成错误
if (reason === 'streaming_fallback') {
  return createUserMessage({
    content: [{ type: 'tool_result',
      content: '<tool_use_error>Error: Streaming fallback - tool execution discarded</tool_use_error>',
      is_error: true, tool_use_id: toolUseId }],
    toolUseResult: 'Streaming fallback - tool execution discarded',
  })
}
```
- 说明：`streaming_fallback` 发生在模型切换（`FallbackTriggeredError`）时。旧 executor 被 `discard()`，已经启动的工具在下次 `getAbortReason()` 检查时发现 `this.discarded === true`，返回合成错误消息而不是真实执行结果。注释（L2464-2468）还明确说明：这个 fallback 会导致"double tool execution"问题（inc-4258），所以有 feature flag 可以禁用它。

**结论 1-D：Bash 工具出错会通过 `siblingAbortController` 取消所有兄弟工具，但 Read/WebFetch 等独立工具出错不会**
- 状态：verified
- 行号：`src/services/tools/StreamingToolExecutor.ts:354-363`
- 关键代码：
```typescript
// Only Bash errors cancel siblings. Bash commands often have implicit
// dependency chains (e.g. mkdir fails → subsequent commands pointless).
// Read/WebFetch/etc are independent — one failure shouldn't nuke the rest.
if (tool.block.name === BASH_TOOL_NAME) {
  this.hasErrored = true
  this.erroredToolDescription = this.getToolDescription(tool)
  this.siblingAbortController.abort('sibling_error')
}
```
- 说明：注释直接给出了设计动机：Bash 命令通常有隐式依赖链（mkdir 失败 → 后续命令无意义），而 Read/WebFetch 是独立的，一个失败不应该取消其他的。

---

**任务 2：多 agent 协调的量化约束**

文件：`src/utils/tasks.ts`

**结论 2-A：没有硬编码的 MAX_AGENTS 常量，并发 agent 数量没有上限，但锁机制按"~10+ 并发 agent"设计**
- 状态：verified
- 行号：`src/utils/tasks.ts:94-107`
- 关键代码：
```typescript
// Lock options: retry with backoff so concurrent callers (multiple Claudes
// in a swarm) wait for the lock instead of failing immediately.
//
// Budget sized for ~10+ concurrent swarm agents: each critical section does
// readdir + N×readFile + writeFile (~50-100ms on slow disks), so the last
// caller in a 10-way race needs ~900ms. retries=30 gives ~2.6s total wait.
const LOCK_OPTIONS = {
  retries: { retries: 30, minTimeout: 5, maxTimeout: 100 },
```
- 说明：没有找到 `MAX_AGENTS` 或类似常量。并发上限不是通过数量限制实现的，而是通过锁机制序列化。注释明确说"按 10+ 并发 agent 设计"，30 次重试 × 最大 100ms = 约 2.6 秒总等待时间。

**结论 2-B：`claimTaskWithBusyCheck()` 失败时直接返回失败原因，不重试——调用方（模型）负责处理**
- 状态：verified
- 行号：`src/utils/tasks.ts:621-697`
- 关键代码：
```typescript
// Check if agent is busy with other unresolved tasks
const agentOpenTasks = allTasks.filter(
  t => t.status !== 'completed' && t.owner === claimantAgentId && t.id !== taskId,
)
if (agentOpenTasks.length > 0) {
  return { success: false, reason: 'agent_busy', task, busyWithTasks: agentOpenTasks.map(t => t.id) }
}
```
- 说明：`claimTaskWithBusyCheck` 在 list-level 锁内原子地检查 agent 是否繁忙，失败时直接返回 `{ success: false, reason: 'agent_busy' }`，不做重试。重试逻辑由调用方（通常是模型通过 TaskClaim 工具）决定。锁争用的重试（`LOCK_OPTIONS.retries: 30`）是针对**获取锁本身**的重试，不是针对认领失败的重试。

**结论 2-C：`terminated` vs `shutdown` 的区别是语义标签，行为完全相同——都是把任务归还为 pending**
- 状态：verified
- 行号：`src/utils/tasks.ts:820-865`
- 关键代码：
```typescript
export async function unassignTeammateTasks(
  teamName: string, teammateId: string, teammateName: string,
  reason: 'terminated' | 'shutdown',
): Promise<UnassignTasksResult> {
  // ...
  for (const task of unresolvedAssignedTasks) {
    await updateTask(teamName, task.id, { owner: undefined, status: 'pending' })
  }
  const actionVerb = reason === 'terminated' ? 'was terminated' : 'has shut down'
  // ...
}
```
- 说明：`terminated`（被强制终止）和 `shutdown`（正常关闭）在任务归还行为上完全相同，都是把 `owner` 清空、`status` 重置为 `pending`。区别只在通知消息的措辞：`terminated` → "was terminated"，`shutdown` → "has shut down"。触发条件由调用方决定（进程退出时调用此函数）。

---

**任务 3：反蒸馏两层机制的精确对比**

文件：`src/services/api/claude.ts`（`anti_distillation`）和 `src/utils/streamlinedTransform.ts`

**结论 3-A：`fake_tools` 是服务端机制，通过 API 参数 `anti_distillation: ['fake_tools']` 触发，三重条件缺一不可**
- 状态：verified
- 行号：`src/services/api/claude.ts:301-313`
- 关键代码：
```typescript
// Anti-distillation: send fake_tools opt-in for 1P CLI only
if (
  feature('ANTI_DISTILLATION_CC')
    ? process.env.CLAUDE_CODE_ENTRYPOINT === 'cli' &&
      shouldIncludeFirstPartyOnlyBetas() &&
      getFeatureValue_CACHED_MAY_BE_STALE('tengu_anti_distill_fake_tool_injection', false)
    : false
) {
  result.anti_distillation = ['fake_tools']
}
```
- 说明：三重条件：① 构建特性 `ANTI_DISTILLATION_CC` 开启（外部构建直接 false）；② 入口是 CLI（`CLAUDE_CODE_ENTRYPOINT === 'cli'`）；③ Statsig feature flag `tengu_anti_distill_fake_tool_injection` 为 true。`fake_tools` 是发给 Anthropic API 的参数，服务端会在响应里注入虚假工具调用，使输出难以被蒸馏复制。客户端代码里看不到虚假工具的具体内容（这是服务端行为）。

**结论 3-B：`streamlinedTransform` 是客户端输出层机制，把工具调用摘要化，用于 SDK 输出流，与 `fake_tools` 完全独立**
- 状态：verified
- 行号：`src/utils/streamlinedTransform.ts:1-9, 130-193`；`src/cli/print.ts:854-861`
- 关键代码：
```typescript
// streamlinedTransform.ts 文件头注释：
// Streamlined mode is a "distillation-resistant" output format that:
// - Keeps text messages intact
// - Summarizes tool calls with cumulative counts (resets when text appears)
// - Omits thinking content
// - Strips tool list and model info from init messages

// print.ts:856-861: 触发条件
const transformToStreamlined =
  feature('STREAMLINED_OUTPUT') &&
  isEnvTruthy(process.env.CLAUDE_CODE_STREAMLINED_OUTPUT) &&
  options.outputFormat === 'stream-json'
    ? createStreamlinedTransformer()
    : null
```
- 说明：`streamlinedTransform` 把工具调用归类为 searches/reads/writes/commands/other 五类，输出累计计数摘要（如"searched 3 patterns, read 5 files"），而不是完整的工具调用内容。触发条件：① 构建特性 `STREAMLINED_OUTPUT` 开启；② 环境变量 `CLAUDE_CODE_STREAMLINED_OUTPUT=true`；③ 输出格式是 `stream-json`。这是 ant 内部构建专用，外部构建通过 `feature()` DCE 消除。

**结论 3-C：两个机制的目标层次不同——`fake_tools` 针对模型输出本身，`streamlinedTransform` 针对 SDK 消费者看到的输出**
- 状态：inference（基于代码结构推断，无直接注释说明）
- 说明：`fake_tools` 在 API 请求层注入，影响模型生成的内容（服务端行为，客户端不可见）；`streamlinedTransform` 在输出流层过滤，影响 SDK 调用方收到的消息格式（客户端行为，不影响模型生成）。两者可以同时启用，互不干扰。

---

### 🟡 加分项

**任务 4：`--resume` 的 50MB 截断行为**

**结论 4-A：50MB 上限是读取层截断，超出时静默截断最旧的消息，用户不会收到明确警告**
- 状态：inference（需进一步确认 sessionStorage.ts:225 的具体行为）
- 说明：挖掘卡提到 `sessionStorage.ts#L225`，但本轮未深入读取该文件。标记为待验证。

---

**任务 5：Session Memory 的异步写入机制**

**结论 5-A：Session Memory 通过 forked agent 异步执行，双重阈值触发（token 增量为硬门槛），主会话不阻塞**
- 状态：verified（已在 P1 抽样信号31-32 中验证）
- 锚点：`src/services/SessionMemory/sessionMemory.ts:134-187, 321-333`
- 说明：见 `key-comment-signals.md` 信号31-32，此处不重复。

---

### 🟢 意外发现区

**[`src/services/tools/StreamingToolExecutor.ts:45-48`] `siblingAbortController` 是父 controller 的子控制器，Bash 出错只杀兄弟进程，不结束整个 turn**

注释原文：
```typescript
// Child of toolUseContext.abortController. Fires when a Bash tool errors
// so sibling subprocesses die immediately instead of running to completion.
// Aborting this does NOT abort the parent — query.ts won't end the turn.
```
这个设计很有意思：Bash 出错时，同批次的其他工具被取消，但 query loop 本身继续运行（模型会收到错误消息，然后决定下一步）。这是"局部失败不等于全局失败"的具体实现。

**[`src/services/tools/StreamingToolExecutor.ts:388-395`] 并发工具的 context modifier 当前不支持**

注释原文：
```typescript
// NOTE: we currently don't support context modifiers for concurrent
//       tools. None are actively being used, but if we want to use
//       them in concurrent tools, we need to support that here.
```
这是一个已知的设计限制：并发执行的工具无法修改 `ToolUseContext`（只有非并发工具可以）。这意味着如果未来某个工具需要在执行后修改权限上下文，它就不能被标记为 `isConcurrencySafe`。

**[`src/services/api/claude.ts:2464-2468`] streaming fallback 会导致 double tool execution（inc-4258）**

注释原文：
```typescript
// When the flag is enabled, skip the non-streaming fallback and let the
// error propagate to withRetry. The mid-stream fallback causes double tool
// execution when streaming tool execution is active: the partial stream
// starts a tool, then the non-streaming retry produces the same tool_use
// and runs it again. See inc-4258.
```
这是一个真实的 bug 历史：流式执行 + 非流式 fallback 的组合会导致同一个工具被执行两次。解法是通过 feature flag 禁用 fallback，让错误直接传播到重试层。

---

## 写作注意事项

1. ch02 的读者是"刚了解 Claude Code 概念，想知道为什么它比 Copilot/Cursor 强"——技术细节需要有直观对比，不能只讲机制
2. 反蒸馏机制要谨慎写——这是商业策略，不是技术设计，"为什么强"应该聚焦用户体验上的优势，不是竞争手段
3. `StreamingToolExecutor` 的流式并发是 ch02 最有说服力的技术点之一，这里要量化：传统串行是多慢，流式并发具体快多少
