# ch14 挖掘任务卡：工具

**认领人：** startheart  
**状态：** 待认领  
**目标章节：** `docs/book/chapters/ch14-工具.md`（当前 92 行）  
**写作规范：** `docs/book-workspace/methodology/writing-principles.md`

---

## 背景与现状

ch14 现有内容质量不错：Tool 厚接口、fail-closed 默认值、三步工具池组装、cache breakpoint 排序，逻辑清晰，行号锚点完整。

主要缺口：
1. **`isConcurrencySafe` 有声明、无调度机制** — 章节解释了字段含义，但没有说明系统如何利用它实现并发。这个机制有一个反直觉的约束条件，值得专门解释
2. **MCP 工具的注册路径没有** — MCP 工具是怎么进入工具池的？和内建工具的差异在哪里？`assembleToolPool` 合并时有什么处理？

---

## 挖掘任务

### 🔴 必答（ch14 改稿必须覆盖）

**任务 1：`isConcurrencySafe` 的调度机制 — 反直觉约束**

文件：`src/services/tools/StreamingToolExecutor.ts`（`L108`）、`src/services/tools/toolOrchestration.ts`（`L101`）

已发现关键代码（小许预挖）：

`StreamingToolExecutor.ts` 的 `canExecuteTool`：
```typescript
private canExecuteTool(isConcurrencySafe: boolean): boolean {
  const executingTools = this.tools.filter(t => t.status === 'executing')
  return (
    executingTools.length === 0 ||
    (isConcurrencySafe && executingTools.every(t => t.isConcurrencySafe))
  )
}
```

`toolOrchestration.ts` 的 `partitionToolCalls`：把工具调用分批，连续的 concurrencySafe 工具合成一批，非 concurrencySafe 工具单独一批。

需要挖掘的问题：
- **并发的精确条件**：只有"当前所有执行中的工具都是 concurrencySafe，新工具也是 concurrencySafe"才能并发。这意味着一旦有一个非 safe 工具在执行，所有后来的工具（包括 safe 的）都必须等待。有没有注释解释为什么要这么严格？
- **两条路径**：StreamingToolExecutor 和 toolOrchestration 是两套不同的执行路径，哪个在什么情况下被使用？它们的并发行为有区别吗？
- **实际有哪些工具是 concurrencySafe = true**：整理一个表格（工具名 + 文件路径 + 是否 safe + 原因）。已知：GrepTool/GlobTool/FileReadTool = true，BashTool = 取决于 isReadOnly，TaskGetTool = true

格式要求：结论 + verified/inference 标注 + 源码行号

---

**任务 2：MCP 工具进入工具池的完整路径**

文件：`src/services/mcp/client.ts`（`L1795`）、`src/tools.ts`（`L342-L388`）

已知：
- `assembleToolPool(permissionContext, mcpTools)` 在 `L350` 合并内建工具和 MCP 工具
- MCP 工具也实现了 `isConcurrencySafe`（`mcp/client.ts#L1795`，直接返回 false）
- `filterToolsByDenyRules` 对 MCP 工具同样生效（`tools.ts#L259`：`mcp__server` 前缀规则）

需要挖掘的问题：
- MCP 工具在 `client.ts` 里是如何被包装成 `Tool` 接口的？`inputSchema` 怎么来的（动态从 MCP 服务器获取？）
- `assembleToolPool` 把内建工具放在 MCP 工具前面排序（保证 cache breakpoint 有效），MCP 工具的 `isConcurrencySafe` 全部返回 false——这个默认保守策略有没有注释说明原因？
- deny 规则的 `mcp__server` 前缀格式（`tools.ts#L259`）是怎么工作的？一个规则可以禁用整个 MCP 服务器的所有工具吗？

---

### 🟡 加分项

**任务 3：工具的 `toAutoClassifierInput` 字段**

`TOOL_DEFAULTS` 里有一个 `toAutoClassifierInput: (_input?: unknown) => ''` 的默认值。这个字段没有在 ch14 里出现过。

- 它是什么？在权限系统的 auto 模式 YOLO 分类器里有什么作用？
- 有没有哪个内建工具实现了非空的 `toAutoClassifierInput`？如果有，实现了什么内容？
- 这个字段和 ch20 权限系统是什么关系？（可以引用 ch20，不用重复解释）

---

**任务 4：工具执行失败的错误包装**

当工具执行失败（`call()` 抛异常），错误是怎么被包装的？最终返回给模型的 `tool_result` 长什么样？

关注点：
- `StreamingToolExecutor.ts` 里有没有 try/catch 包装？错误消息格式是什么？
- 模型收到工具错误后的行为（继续/重试/停止）是由模型决定，还是系统有什么干预？

---

### 🟢 意外发现区

格式：`[文件路径#行号] 发现 + 为什么有意思`

---

## startheart 填写区

### Q1：`isConcurrencySafe` 的调度机制 — 反直觉约束

**结论**：并发的精确条件是"当前所有执行中的工具都是 concurrencySafe，且新工具也是 concurrencySafe"——任何一个不满足，新工具就必须等待。这意味着一旦有一个非 safe 工具在执行，所有后来的工具（包括 safe 的）都必须等待。没有注释解释为什么这么严格，但逻辑是显然的：非 safe 工具可能修改文件系统状态，safe 工具如果在此期间并发读取，可能读到中间态。

**verified** — 源码锚点：`src/services/tools/StreamingToolExecutor.ts` L129-L151，`src/services/tools/toolOrchestration.ts` L96-L123

两条路径的区别：
- **StreamingToolExecutor**（`config.gates.streamingToolExecution` 为 true 时使用）：工具在流式传输时就开始执行，不等待所有工具块到达。`canExecuteTool` 在每次 `addTool` 时检查，`processQueue` 遇到不能执行的非 safe 工具就 `break`（保证顺序）。
- **toolOrchestration**（`runTools`，非流式路径）：先用 `partitionToolCalls` 把所有工具分批，连续的 safe 工具合成一批并发执行，非 safe 工具单独一批串行执行。并发批次的 contextModifier 暂存后按顺序回放，避免并发写 context 竞态。

```typescript
// StreamingToolExecutor.ts L129-L134
private canExecuteTool(isConcurrencySafe: boolean): boolean {
  const executingTools = this.tools.filter(t => t.status === 'executing')
  return (
    executingTools.length === 0 ||
    (isConcurrencySafe && executingTools.every(t => t.isConcurrencySafe))
  )
}
```

具体例子（Grep + Glob + Bash 同时发出）：
1. Grep 到达 → `canExecuteTool(true)` → 执行中的工具为空 → 立即执行
2. Glob 到达 → `canExecuteTool(true)` → 执行中只有 Grep（safe）→ 立即并发执行
3. Bash 到达 → `canExecuteTool(false)` → 执行中有 Grep/Glob → 等待
4. Grep/Glob 完成 → processQueue 重新检查 → Bash 开始执行

并发上限由 `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` 控制（默认 10），注释说是"资源与安全双重阀门"（`toolOrchestration.ts` L165-L167）。

**concurrencySafe = true 的工具清单**（已验证）：

| 工具 | 文件 | safe 值 | 原因 |
|------|------|---------|------|
| GrepTool | `src/tools/GrepTool/GrepTool.ts:183` | `true` | 只读搜索 |
| GlobTool | `src/tools/GlobTool/GlobTool.ts:76` | `true` | 只读文件列表 |
| FileReadTool | `src/tools/FileReadTool/FileReadTool.ts:373` | `true` | 只读 |
| WebFetchTool | `src/tools/WebFetchTool/WebFetchTool.ts:95` | `true` | 只读网络请求 |
| WebSearchTool | `src/tools/WebSearchTool/WebSearchTool.ts:200` | `true` | 只读搜索 |
| TaskGetTool | `src/tools/TaskGetTool/TaskGetTool.ts:61` | `true` | 只读任务查询 |
| TaskListTool | `src/tools/TaskListTool/TaskListTool.ts:56` | `true` | 只读任务列表 |
| TaskCreateTool | `src/tools/TaskCreateTool/TaskCreateTool.ts:71` | `true` | 写操作但有文件锁保护 |
| TaskUpdateTool | `src/tools/TaskUpdateTool/TaskUpdateTool.ts:111` | `true` | 写操作但有文件锁保护 |
| LSPTool | `src/tools/LSPTool/LSPTool.ts:146` | `true` | 只读语言服务 |
| BashTool | `src/tools/BashTool/BashTool.tsx:434` | `isReadOnly(input) ?? false` | 动态：只有只读命令才 safe |
| McpAuthTool | `src/tools/McpAuthTool/McpAuthTool.ts:67` | `false` | 认证操作 |

注意 TaskCreateTool/TaskUpdateTool 声明为 safe——这是因为它们内部有文件锁（`proper-lockfile`），并发调用是安全的。

---

### Q2：MCP 工具进入工具池的完整路径

**结论**：MCP 工具通过 `fetchToolsForClient`（`client.ts:L1743`）从 MCP 服务器动态拉取，每个工具被包装成实现 `Tool` 接口的对象。`isConcurrencySafe` 直接读取 MCP 协议的 `annotations.readOnlyHint` 字段（不是默认 false，而是由 MCP 服务器声明）。`assembleToolPool` 把内建工具放在前面，MCP 工具追加在后，保证 cache breakpoint 有效。deny 规则的 `mcp__server` 前缀可以一次性隐藏整个 MCP 服务器的所有工具。

**verified** — 源码锚点：`src/services/mcp/client.ts` L1743-L1813，`src/tools.ts` L357-L381，`src/tools.ts` L256-L275

MCP 工具注册路径：
1. `fetchToolsForClient(client)` 调用 MCP 协议的 `tools/list` 方法（L1752）
2. 对每个工具调用 `recursivelySanitizeUnicode`（L1758）清理 Unicode
3. 每个工具被包装为 `{ ...MCPTool, name: fullyQualifiedName, isMcp: true, ... }`（L1767-1813）
4. `isConcurrencySafe` 读取 `tool.annotations?.readOnlyHint ?? false`（L1795-1797）——不是默认 false，而是由 MCP 服务器通过协议声明
5. `inputSchema` 来自 `tool.inputSchema`（MCP 服务器动态提供的 JSON Schema）
6. `assembleToolPool` 把内建工具（已排序）放前面，MCP 工具（已排序）追加在后（L377-380）

deny 规则的 `mcp__server` 前缀工作方式（`tools.ts` L256-L275 注释）：
- `filterToolsByDenyRules` 在"暴露给模型之前"先执行，属于前置裁剪（pre-exposure gate）
- 目的是减少模型对受限能力的可见性，不只是在调用时报错
- `mcp__server` 前缀规则可以一次性隐藏整个 MCP 服务器的所有工具（`getDenyRuleForTool` 支持前缀匹配）

---

### Q3：`toAutoClassifierInput` 字段

**结论**：`toAutoClassifierInput` 是 auto 模式（YOLO 模式）安全分类器的输入编码接口。分类器把对话历史 + 当前工具调用序列化为紧凑的 JSONL 格式，发给一个专门的安全分类模型判断是否应该阻止。返回 `''` 意味着"该工具对安全分类器没有意义"，分类器会直接跳过（`shouldBlock: false`，reason: "Tool declares no classifier-relevant input"）。

**verified** — 源码锚点：`src/utils/permissions/yoloClassifier.ts` L375-L416，L1021-L1028，`src/Tool.ts` L768, L785

有实现非空 `toAutoClassifierInput` 的工具（部分）：
- `BashTool`：返回 `input.command`（命令字符串，最关键的安全相关输入）
- `FileWriteTool`：返回 `input.file_path`
- `WebFetchTool`：返回 `input.url`
- `TaskCreateTool`：返回 `input.subject`
- MCP 工具：返回 `key=value` 格式的所有输入字段（`mcpToolInputToAutoClassifierInput`）

依赖默认 `''` 的工具（不参与分类）：GrepTool、GlobTool、FileReadTool、LSPTool 等只读工具——这些工具不需要安全分类，因为它们不会修改系统状态。

---

### Q4：工具执行失败的错误包装

**结论**：工具执行失败时，错误被包装为 `tool_result` 消息（`is_error: true`），内容格式为 `<tool_use_error>错误信息</tool_use_error>`。模型收到后自行决定是否重试——系统不干预，但有一个重要的级联取消机制：**只有 Bash 工具的错误会取消兄弟工具**（`siblingAbortController.abort('sibling_error')`），其他工具（Read/WebFetch 等）的错误不会影响并发中的其他工具。

**verified** — 源码锚点：`src/services/tools/StreamingToolExecutor.ts` L153-L205, L354-L363

```typescript
// L354-L363: 只有 Bash 错误才取消兄弟工具
if (isErrorResult) {
  thisToolErrored = true
  // Only Bash errors cancel siblings. Bash commands often have implicit
  // dependency chains (e.g. mkdir fails → subsequent commands pointless).
  // Read/WebFetch/etc are independent — one failure shouldn't nuke the rest.
  if (tool.block.name === BASH_TOOL_NAME) {
    this.hasErrored = true
    this.siblingAbortController.abort('sibling_error')
  }
}
```

三种合成错误消息：
- `sibling_error`：`"Cancelled: parallel tool call <desc> errored"`
- `user_interrupted`：`REJECT_MESSAGE`（"User rejected edit"，让 UI 显示正确文案）
- `streaming_fallback`：`"Streaming fallback - tool execution discarded"`

---

### 意外发现

**`isConcurrencySafe` 在 input 解析失败时降级为 false**（`toolOrchestration.ts` L100-L101 注释）："关键安全兜底：只要 input 解析失败或 isConcurrencySafe 抛错，就降级为串行。这保证'并发'是显式声明能力，而不是默认假设，避免误判带来的跨工具状态污染。"——这是 fail-closed 原则在并发调度层的体现。

**TaskCreateTool/TaskUpdateTool 声明为 concurrencySafe = true**，但它们是写操作。这是因为它们内部有 `proper-lockfile` 保护，并发调用是安全的。这说明 `isConcurrencySafe` 的语义不是"只读"，而是"并发调用不会产生竞态"——更精确的定义。

---

## 写作注意事项

1. `isConcurrencySafe` 的并发约束要用**具体例子**说明：如果模型同时发出 3 个工具调用（Grep + Glob + Bash），会发生什么顺序？结合 `canExecuteTool` 的逻辑写出来
2. MCP 工具章节可以简短，但要说清楚它和内建工具的**关键差异**（全部 concurrencySafe = false、动态 schema、deny 前缀规则）
3. ch14 现有内容的 fail-closed 和 cache 排序部分质量已经不错，改稿时**保留并小幅增强**，不要重写
