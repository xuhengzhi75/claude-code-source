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

## 写作注意事项

1. `isConcurrencySafe` 的并发约束要用**具体例子**说明：如果模型同时发出 3 个工具调用（Grep + Glob + Bash），会发生什么顺序？结合 `canExecuteTool` 的逻辑写出来
2. MCP 工具章节可以简短，但要说清楚它和内建工具的**关键差异**（全部 concurrencySafe = false、动态 schema、deny 前缀规则）
3. ch14 现有内容的 fail-closed 和 cache 排序部分质量已经不错，改稿时**保留并小幅增强**，不要重写
