# ch13 挖掘任务卡：最小可用 Agent 骨架

**交给**：startheart  
**写作侧**：小许  
**背景**：ch13 是全书最有实操价值的章节，但目前"最小"的边界画得不够清楚——读者知道需要三层，但不知道"每层如果缺失，具体会发生什么灾难"，也不知道"最小可用"和"能用但脆"的区别在哪。

---

## 你需要挖的问题（按优先级排）

### 🔴 必答

**Q1：`main()` 的快路径分流，每条路径的实际代价差多少？**  
ch13 说轻操作不需要拉起完整系统。  
想知道的是：完整主流程（`import('../main.js')`）启动时会加载哪些模块？重量级操作是哪些？`--version` 这类轻操作跳过了什么？代码里有没有延迟加载（dynamic import）的证据？  
- 目标文件：`src/entrypoints/cli.tsx`，L33-L310，把动态 import 的位置全找出来

**Q2：`query.ts#L561` 那条注释（"推导是否继续，不依赖 stop_reason"）背后，stop_reason 到底有多不可靠？**  
现有章节提到"不同 provider/SDK 的 stop_reason 细节不总一致"，但这是个推断还是有真实案例？  
想知道的是：代码里有没有注释或兼容性处理说明某个 provider/SDK 的 stop_reason 表现不一致？具体是哪个 provider 出了问题？  
- 目标文件：`src/query.ts`，L555-L580，把完整注释和判断逻辑截出来

**Q3：`QueryEngine.ts#L443` 的"先落盘再执行"设计，在恢复时是如何使用这条落盘记录的？**  
ch13 提到用户输入在执行前先写入 transcript，防止进程被杀后丢失。  
想知道的是：恢复时是怎么读取这条记录的？恢复后的执行会从哪里继续？有没有去重机制防止同一条用户输入被执行两次？  
- 目标文件：`src/QueryEngine.ts`，L443 附近，再搜索 transcript 相关的读取逻辑

---

### 🟡 加分项

**Q4：`while(true)` 循环的终止路径有几条？**  
ch13 说循环的终止条件是"没有 tool_use"，但这肯定不是唯一退出路径。  
想挖的是：循环里有几条 `return` 或 `break`？每条对应什么场景？哪些是正常退出，哪些是异常退出？把所有退出路径列出来，这是理解"最小骨架"必须知道的。  
- 目标文件：`src/query.ts`，`queryLoop()` 函数，从 L243 开始把所有退出点找出来

**Q5：能力层的"全集再过滤"，filter 具体过滤掉了什么？**  
ch13 提到 `filterToolsByDenyRules()`，但没说规则是什么。  
想挖的是：denyRules 有哪些维度？是工具名称白名单/黑名单，还是基于工具类型？有没有动态规则（比如根据用户权限级别过滤）？  
- 目标文件：`src/tools.ts`，L265 的 `filterToolsByDenyRules()`，把完整逻辑截出来

**Q6：`TOOL_DEFAULTS` 里的 `toAutoClassifierInput: () => ''` 是什么意思？**  
这个默认值意味着：安全相关的工具如果不显式实现 `toAutoClassifierInput`，会被跳过分类。  
想挖的是：AutoClassifier 是用来干什么的？`toAutoClassifierInput` 返回空字符串，在分类系统里会触发什么行为？代码注释里说"security-relevant tools must override"，有没有例子说明哪些工具确实覆盖了这个方法？  
- 目标文件：`src/Tool.ts`，搜索 `toAutoClassifierInput`，找所有有实现的工具

---

### 🟢 意外发现区

ch13 是"三层结构"章节，重点是"三层缺一不可"。如果你发现了"缺了某层会怎样"的具体代码证据（比如某个防御性检查，说明缺少某层真的出过问题），这类素材最有价值。

---

## startheart 填写区

### Q1：`main()` 的快路径分流，每条路径的实际代价差多少？

**结论**：`cli.tsx` 是一个纯分流器，所有 import 都是动态的（`await import(...)`）。`--version` 是唯一零模块加载路径，直接打印编译期内联的 `MACRO.VERSION` 常量后返回，不触发任何 `import`。其余每条快路径只加载自己需要的模块，完整主流程（`import('../main.js')`）是最重的路径，在此之前还会先调用 `startCapturingEarlyInput()` 捕获用户输入。

**verified** — 源码锚点：`src/entrypoints/cli.tsx` L33-L305

快路径清单（按模块加载量从轻到重）：

| 路径 | 触发条件 | 加载模块 |
|------|---------|---------|
| `--version` / `-v` / `-V` | L33-L40 | 零（MACRO.VERSION 编译期内联） |
| `--dump-system-prompt` | L43-L57 | config + model + prompts |
| `--claude-in-chrome-mcp` | L59-L65 | claudeInChrome/mcpServer |
| `--daemon-worker=<kind>` | L68-L73 | daemon/workerRegistry |
| `remote-control` / `bridge` | L76-L165 | config + bridgeEnabled + auth + policyLimits + bridgeMain |
| `daemon` | L168-L184 | config + sinks + daemon/main |
| `ps/logs/attach/kill/--bg` | L186-L213 | config + cli/bg |
| `new/list/reply` (templates) | L215-L226 | cli/handlers/templateJobs |
| `environment-runner` | L228-L237 | environment-runner/main |
| `self-hosted-runner` | L239-L249 | self-hosted-runner/main |
| `--worktree --tmux` | L251-L278 | config + worktreeModeEnabled + worktree |
| 完整主流程 | 兜底 | earlyInput + **main.js（全量）** |

关键设计：`feature()` 调用在 `if` 条件里内联，不提取为变量，这是为了让构建工具（Bun bundle）做编译期死代码消除（DCE）——外部构建版本中 `DAEMON`、`BRIDGE_MODE` 等 feature flag 为 false，对应分支整块被裁掉。

---

### Q2：`stop_reason` 到底有多不可靠？

**结论**：这是有真实代码证据的设计决策，不是推断。注释明确说"We intentionally derive 'need another model turn' from observed tool_use blocks instead of stop_reason. This keeps behavior stable across provider/SDK differences where stop_reason may be missing or delayed in stream events."

**verified** — 源码锚点：`src/query.ts` L563-L568

```typescript
// We intentionally derive "need another model turn" from observed tool_use
// blocks instead of stop_reason. This keeps behavior stable across provider/
// SDK differences where stop_reason may be missing or delayed in stream events.
const toolUseBlocks: ToolUseBlock[] = []
let needsFollowUp = false
```

另一处佐证在 `conversationRecovery.ts` L300-L306：恢复逻辑判断 turn 是否完成时，也明确注释"In the streaming path, stop_reason is always null on persisted messages because messages are recorded at content_block_stop time, before message_delta delivers the stop_reason."——即 stop_reason 在流式路径下落盘时永远是 null，根本不可用于恢复判断。

---

### Q3：`QueryEngine.ts#L443` 的"先落盘再执行"设计，恢复时如何使用？

**结论**：用户消息在进入 query loop 之前就通过 `recordTranscript(messages)` 写入磁盘。恢复时 `deserializeMessagesWithInterruptDetection()` 读取 transcript，通过 `detectTurnInterruption()` 判断中断类型，然后将 `interrupted_turn` 统一转换为 `interrupted_prompt`（追加一条 `"Continue from where you left off."` 的 meta 消息），从而让 SDK/REPL 两条恢复路径走同一个代码分支。去重机制：`filterUnresolvedToolUses()` 会过滤掉没有对应 tool_result 的 tool_use 块，防止重复执行。

**verified** — 源码锚点：`src/QueryEngine.ts` L443-L469，`src/utils/conversationRecovery.ts` L204-L227

```typescript
// QueryEngine.ts L443-L462
// Persist the user's message(s) to transcript BEFORE entering the query
// loop. ... Writing now makes the transcript resumable from the point the
// user message was accepted, even if no API response ever arrives.
if (persistSession && messagesFromUserInput.length > 0) {
  const transcriptPromise = recordTranscript(messages)
  if (isBareMode()) {
    void transcriptPromise  // --bare 模式：fire-and-forget，不阻塞
  } else {
    await transcriptPromise  // 正常模式：等待落盘完成再继续
  }
}
```

注意：`--bare` / `SIMPLE` 模式下是 fire-and-forget，因为脚本调用不需要 `--resume`，而 await 在 SSD 上约 4ms、磁盘竞争时约 30ms，是整个启动路径中最大的可控延迟。

---

### Q4：`while(true)` 循环的终止路径有几条？

**结论**：`queryLoop()` 共有 **13 条 `return` 退出路径**，分为正常退出、异常退出、资源限制退出三类。

**verified** — 源码锚点：`src/query.ts` L243-L1744

| 退出原因 | `reason` 值 | 行号 | 类型 |
|---------|------------|------|------|
| 超出 blocking limit（无 auto-compact） | `'blocking_limit'` | L656 | 资源限制 |
| 图片尺寸错误 | `'image_error'` | L987, L1189 | 异常 |
| 模型调用抛出异常 | `'model_error'` | L1006 | 异常 |
| 流式传输中被中断（Ctrl+C） | `'aborted_streaming'` | L1061 | 用户中断 |
| prompt 过长且无法恢复 | `'prompt_too_long'` | L1189, L1196 | 资源限制 |
| API 错误（限流/认证等） | `'completed'` | L1278 | 异常（伪装成完成） |
| stop hook 阻止继续 | `'stop_hook_prevented'` | L1293 | hook 干预 |
| token budget 耗尽/正常完成 | `'completed'` | L1371 | 正常 |
| 工具执行中被中断 | `'aborted_tools'` | L1529 | 用户中断 |
| hook 停止 | `'hook_stopped'` | L1534 | hook 干预 |
| 超出 maxTurns | `'max_turns'` | L1726 | 资源限制 |

值得注意的是 L1278 那条：当最后一条消息是 API 错误时（限流、认证失败等），返回的是 `'completed'` 而不是 `'error'`——这是为了防止 stop hook 在错误消息上触发死循环（error → hook blocking → retry → error → …）。

---

## 小许备注

这章改写的目标读者：打算自己从零搭 Agent 的工程师。改完之后他应该能说出"我知道为什么三层都要有，而不只是因为书上这么说"。填好后 commit 到 main。
