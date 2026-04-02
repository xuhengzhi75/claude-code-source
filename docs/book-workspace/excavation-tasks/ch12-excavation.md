# ch12 挖掘任务卡：该学什么、先别急着抄什么

**交给**：startheart  
**写作侧**：小许  
**背景**：ch12 的"不建议抄"vs"值得学"结构是对的，但都停在"道理层"——读者知道"不能直接抄文件系统队列"，但不知道"如果真的抄了，具体会在哪里翻车"。需要更多具体的灾难场景和实际代码约束依据。

---

## 你需要挖的问题（按优先级排）

### 🔴 必答

**Q1：文件系统任务队列的锁机制，具体是怎么失败的？**  
ch12 提到用 `.lock` 文件做并发控制，高并发下会成瓶颈。  
想知道的是：锁的获取是怎么实现的？是轮询还是阻塞？有没有超时机制？如果持锁进程崩溃了，锁文件会被残留吗？  
找到锁相关的完整实现逻辑，把关键代码截出来。  
- 目标文件：`src/utils/tasks.ts`，L508 附近，搜索 `lock`、`lockPath`

**Q2：硬编码的压缩阈值，具体是什么数字？背后的计算逻辑是什么？**  
ch12 说"阈值根据 Claude 模型的上下文窗口大小设定"，但没有具体数字。  
想知道的是：阈值是多少？是一个固定数字还是基于某个参数计算出来的？代码注释里有没有说明为什么选这个数字？  
- 目标文件：`src/services/compact/compact.ts`，搜索触发阈值相关的常量或计算

**Q3：`conversationRecovery.ts#L226` 的 assistant sentinel 补丁，具体补的是什么？**  
现有章节只提到"针对 Claude API 对话结构约束"，没有说具体是什么约束。  
想知道的是：Claude API 要求 assistant 消息必须满足什么格式？这个补丁在什么情况下会触发？触发时补的是什么内容？  
把 L226 附近的关键逻辑和注释完整截出来。  
- 目标文件：`src/utils/conversationRecovery.ts`，L226 附近

---

### 🟡 加分项

**Q4：`tools.ts#L191` 那条注释（"MUST stay in sync with Statsig config"）意味着什么？**  
这行注释说工具列表必须和一个 Statsig 动态配置保持同步，否则系统提示缓存会失效。  
想挖的是：这是一个什么机制？为什么工具列表影响系统提示缓存？如果不同步会有什么后果？  
- 目标文件：`src/tools.ts`，L191 附近

**Q5：`buildTool()` 的"60+ 工具零类型错误"注释背后是什么工程决策？**  
`Tool.ts` 里 `buildTool()` 的注释说类型语义"通过 60+ 工具的零类型错误验证"。  
想挖的是：这个函数的类型设计解决了什么具体问题？在没有这个函数之前，工具的类型定义是什么样的？有没有注释说明这个设计演进的原因？  
- 目标文件：`src/Tool.ts`，L763-792 附近

**Q6：`isReadOnly: () => false` 这个保守默认值，有没有导致过真实问题的记录？**  
默认假设工具有写操作，是一个保守但安全的设计选择。  
想挖的是：代码里有没有哪个工具忘记声明自己是只读的，后来被发现并修复的迹象？或者有没有注释说明这个默认值防住了什么问题？  
- 目标文件：`src/Tool.ts`，搜索 `isReadOnly`，看哪些工具有显式声明，哪些依赖默认值

---

### 🟢 意外发现区

如果你发现"如果这么抄会出问题"的更多具体场景，请直接列出来。最好的素材是"我读代码时想到了一个坑，然后找到了对应的防坑机制"这类发现。

---

## startheart 填写区

### Q1：文件系统任务队列的锁机制，具体是怎么失败的？

**结论**：锁机制使用 `proper-lockfile` 库，采用**异步轮询重试**策略（不是阻塞）。最多重试 30 次，每次间隔 5-100ms（指数退避），总等待上限约 2.6 秒。如果持锁进程崩溃，`proper-lockfile` 会通过 stale 检测（基于 mtime）自动清理残留锁文件。高并发下的瓶颈不是死锁，而是**串行化**——10 个并发 Agent 争同一把锁时，最后一个需要等待约 900ms（每个临界区 readdir + N×readFile + writeFile 约 50-100ms）。

**verified** — 源码锚点：`src/utils/tasks.ts` L94-L108, L149-L154, L380-L393

```typescript
// Lock options: retry with backoff so concurrent callers (multiple Claudes
// in a swarm) wait for the lock instead of failing immediately. The sync
// lockSync API blocked the event loop; the async API needs explicit retries
// to achieve the same serialization semantics.
//
// Budget sized for ~10+ concurrent swarm agents: each critical section does
// readdir + N×readFile + writeFile (~50-100ms on slow disks), so the last
// caller in a 10-way race needs ~900ms. retries=30 gives ~2.6s total wait.
const LOCK_OPTIONS = {
  retries: {
    retries: 30,
    minTimeout: 5,
    maxTimeout: 100,
  },
}
```

注意注释里的一个细节："The sync lockSync API blocked the event loop"——这说明他们最初用的是同步锁，后来因为阻塞事件循环才改成异步轮询。这是一个典型的"先能用、后优化"的演进路径。

另一个值得注意的设计：`updateTask()` 在加锁前先做一次无锁读（L382-L384），如果任务不存在就直接返回 null，避免对不存在的文件加锁（`proper-lockfile` 对不存在的文件会抛异常）。

---

### Q2：硬编码的压缩阈值，具体是什么数字？

**结论**：阈值不是一个固定数字，而是基于模型上下文窗口动态计算的。公式是：`autoCompactThreshold = contextWindow - reservedForOutput - AUTOCOMPACT_BUFFER_TOKENS`，其中 `AUTOCOMPACT_BUFFER_TOKENS = 13_000`，`reservedForOutput = min(maxOutputTokens, 20_000)`（基于 p99.99 的 compact summary 输出为 17,387 tokens）。

**verified** — 源码锚点：`src/services/compact/autoCompact.ts` L28-L91

```typescript
// Reserve this many tokens for output during compaction
// Based on p99.99 of compact summary output being 17,387 tokens.
const MAX_OUTPUT_TOKENS_FOR_SUMMARY = 20_000

export const AUTOCOMPACT_BUFFER_TOKENS = 13_000      // 自动压缩触发缓冲
export const WARNING_THRESHOLD_BUFFER_TOKENS = 20_000 // 警告阈值缓冲
export const ERROR_THRESHOLD_BUFFER_TOKENS = 20_000   // 错误阈值缓冲
export const MANUAL_COMPACT_BUFFER_TOKENS = 3_000     // 手动压缩缓冲（blocking limit）

export function getAutoCompactThreshold(model: string): number {
  const effectiveContextWindow = getEffectiveContextWindowSize(model)
  // effectiveContextWindow = contextWindow - min(maxOutputTokens, 20_000)
  return effectiveContextWindow - AUTOCOMPACT_BUFFER_TOKENS
}
```

以 claude-3-5-sonnet（200k context window，8k max output）为例：
- `effectiveContextWindow` = 200,000 - 8,000 = 192,000
- `autoCompactThreshold` = 192,000 - 13,000 = **179,000 tokens**（约 89.5% 使用率触发）

还有一个环境变量覆盖机制：`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 可以按百分比覆盖阈值（用于测试），`CLAUDE_CODE_AUTO_COMPACT_WINDOW` 可以限制上下文窗口大小。

---

### Q3：`conversationRecovery.ts#L226` 的 assistant sentinel 补丁，具体补的是什么？

**结论**：这个补丁在最后一条消息是 user 消息时，在其后插入一条内容为 `"No response requested."` 的合成 assistant 消息。目的是让对话结构满足 Claude API 的要求：**对话必须以 assistant 消息结尾才能发起新的请求**（user/assistant 交替规则）。如果不补这条 sentinel，恢复后的对话会以 user 消息结尾，直接发给 API 会报格式错误。

**verified** — 源码锚点：`src/utils/conversationRecovery.ts` L229-L248，`src/utils/messages.ts` L240

```typescript
// Append a synthetic assistant sentinel after the last user message so
// the conversation is API-valid if no resume action is taken. Skip past
// trailing system/progress messages and insert right after the user
// message so removeInterruptedMessage's splice(idx, 2) removes the
// correct pair.
const lastRelevantIdx = filteredMessages.findLastIndex(
  m => m.type !== 'system' && m.type !== 'progress',
)
if (
  lastRelevantIdx !== -1 &&
  filteredMessages[lastRelevantIdx]!.type === 'user'
) {
  filteredMessages.splice(
    lastRelevantIdx + 1,
    0,
    createAssistantMessage({
      content: NO_RESPONSE_REQUESTED,  // = 'No response requested.'
    }) as NormalizedMessage,
  )
}
```

触发条件：恢复时最后一条有效消息（跳过 system/progress）是 user 消息。这覆盖了两种场景：(1) 用户发了消息但进程在 API 响应前被杀；(2) `interrupted_turn` 被转换为 `interrupted_prompt` 后追加了 continuation 消息，该消息也是 user 类型。

注意 `splice(idx, 2)` 的设计：sentinel 被插在 user 消息的正后方（而不是末尾），这样 `removeInterruptedMessage` 可以用 `splice(idx, 2)` 同时删除 user 消息和 sentinel，保持操作的原子性。

---

### Q4：`tools.ts#L191` 那条注释（"MUST stay in sync with Statsig config"）意味着什么？

**结论**：`getAllBaseTools()` 返回的工具列表会被序列化进 system prompt（工具定义部分）。Anthropic 在 Statsig 上维护了一个动态配置 `claude_code_global_system_caching`，用于跨用户共享 system prompt 的 prompt cache。如果工具列表和 Statsig 配置不同步，生成的 system prompt 内容会不同，导致 cache key 不匹配，prompt cache 失效，每次请求都要重新处理完整 system prompt，增加延迟和成本。

**verified** — 源码锚点：`src/tools.ts` L191

---

## 小许备注

这章的改写目标：让读者读完后，对"直接抄 Claude Code"感到害怕——但是害怕得有据可查，不是吓唬人。填好后 commit 到 main。
