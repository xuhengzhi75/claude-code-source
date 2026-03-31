# QueryEngine 与主循环（query）说明

## 一句话理解
`QueryEngine` 是“总导演”，`query.ts` 是“舞台执行循环”。前者管会话、记账、对外协议；后者管每一轮“问模型→跑工具→决定继续/结束”。

---

## A. QueryEngine 在做什么（会话级）
入口函数：`QueryEngine.submitMessage(...)`

它把一次用户提交拆成四段：

1. **准备段**：组装 system prompt、用户上下文、工具上下文；处理 slash 命令与权限上下文更新。  
2. **进入循环段**：调用 `query(...)`，逐条接收消息（assistant/user/progress/attachment/system）。  
3. **持久化段**：把关键消息写入 transcript，确保会话可恢复（`--resume`）。  
4. **收尾段**：汇总 usage/cost/stop_reason，产出最终 result（成功或各类错误）。

### 关键设计点（非技术视角）
- **“每轮清理 + 会话保留”并存**：每次 submit 会清理轮级追踪（如发现技能名），但保留历史消息和文件缓存。这样既不丢上下文，又不会无限膨胀。  
- **先持久化用户输入，再等模型回复**：即使进程中途被杀，也能从已提交消息恢复。  
- **工具权限拒绝会累计并对 SDK 输出**：方便上层产品解释“为什么没执行”。

**源码依据：**
- 轮级重置：`this.discoveredSkillNames.clear()`
- 主循环接入：`for await (const message of query({...}))`
- 持久化：`recordTranscript(...)`、`flushSessionStorage()`
- 收尾结果：多个 `yield { type: 'result', subtype: ... }`

---

## B. query.ts 在做什么（单轮状态机）
核心函数：`queryLoop(...)`，内部是 `while(true)`。

每次迭代大体顺序：
1. 预处理上下文（snip / microcompact / collapse / autocompact）  
2. 调模型流式输出  
3. 收集并执行 tool_use  
4. 注入附件（记忆、技能发现、队列命令等）  
5. 判断是否继续下一迭代

### 为什么这是“状态机”
因为它把跨迭代的可变状态收敛到 `State`：
- messages / toolUseContext
- 输出 token 恢复计数
- 是否已尝试 reactive compact
- 当前 transition（上一轮为何继续）

这让恢复路径（如 prompt 过长、max_output_tokens）可以“整体替换状态再 continue”，避免局部变量遗漏。

**源码依据：** `type State` 与 `let state: State = {...}`，多个 `state = next; continue`。

---

## C. “继续还是结束”如何决定
最关键判定不是 stop_reason，而是：**本轮 assistant 是否产生 tool_use**。

- 有 tool_use：执行工具后通常继续下一迭代
- 无 tool_use：进入 stop hooks / token budget / 结果收尾流程

**为什么这样设计：**不同 SDK/提供方里 stop_reason 可能缺失或延迟；用 tool_use 事实更稳定。

**源码依据：**
- `needsFollowUp` 由 `toolUseBlocks` 是否出现驱动
- `if (!needsFollowUp) { ... }` 进入终止路径

---

## D. 主要恢复机制（防“卡死/爆上下文”）
1. **Prompt Too Long**：优先 context collapse 排水，再 reactive compact。  
2. **max_output_tokens**：先尝试提升输出上限，再注入“继续输出”meta消息重试（有上限次数）。  
3. **fallback model**：触发 `FallbackTriggeredError` 时切换模型重试。  
4. **中断安全**：中途中断时补齐缺失的 `tool_result`，避免消息链结构损坏。

**源码依据：**
- `isWithheldPromptTooLong` / `tryReactiveCompact(...)`
- `isWithheldMaxOutputTokens(...)` 与 `MAX_OUTPUT_TOKENS_RECOVERY_LIMIT`
- `FallbackTriggeredError` 分支
- `yieldMissingToolResultBlocks(...)`

---

## E. 为什么 QueryEngine + query 要拆开
### 对产品演进的价值
- 新接入层（SDK、REPL、远程）主要复用 query，而各自在 QueryEngine 层做协议适配。  
- 收敛复杂性：会话持久化、统计、对外消息结构不必混进每个恢复分支。  
- 可测试：query 的状态机行为可独立验证，QueryEngine 侧可独立做协议/持久化验证。

**源码依据：**
- QueryEngine 仅“消费 query 产生的消息流”并做转换/持久化
- query 不依赖具体 UI，而只依赖 `ToolUseContext` 与 `deps`

---

## F. 对非技术读者最实用的结论
- 这不是“一问一答”脚本，而是一个可恢复、可中断、可压缩上下文的循环执行系统。  
- 稳定性的关键，不在单个模型请求，而在“请求失败后如何继续”这条主链路。  
- 系统把“工具执行事实”作为推进依据，比依赖模型口头状态（stop_reason）更稳。

---

## 参考文件
- `src/QueryEngine.ts`
- `src/query.ts`
- （关联）`src/Tool.ts`, `src/tools.ts`, `src/commands.ts`, `src/entrypoints/cli.tsx`
