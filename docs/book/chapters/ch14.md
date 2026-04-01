# 第14章 工具作为手脚

**核心主张：Claude Code 的工具系统把安全语义放在工具定义里，而不是放在调用方——这意味着新增工具时，安全约束自动生效，不需要在每个调用点单独处理。**

## 14.1 Tool 是厚接口，不是 RPC 壳

[`src/Tool.ts#L398-L474`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/Tool.ts#L398-L474) 定义了 `Tool` 接口的核心字段。一个工具同时携带：

- [`inputSchema`（`L398`）](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/Tool.ts#L398)：基于 Zod 的 JSON Schema，用于参数校验
- `call()`：实际执行逻辑
- `checkPermissions()`：权限检查，决定这次调用是否需要用户确认
- [`isReadOnly()`（`L408`）](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/Tool.ts#L408)：是否只读，决定能否在 plan 模式下运行
- [`isDestructive()`（`L410`）](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/Tool.ts#L410)：是否破坏性操作，注释说明"只在执行不可逆操作时设置"
- [`isConcurrencySafe()`（`L406`）](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/Tool.ts#L406)：是否可以并发执行
- [`renderToolUse()` / `renderToolResult()`（`L570`、`L609`）](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/Tool.ts#L570)：在终端 UI 里如何渲染

这些字段不是装饰，而是系统在执行前用来做决策的依据。`isReadOnly()` 决定 plan 模式下能不能运行，`isConcurrencySafe()` 决定多个工具调用能不能同时执行，`checkPermissions()` 决定是否弹出确认对话框。

把这些语义放在工具定义里，而不是放在调用方，有一个关键好处：新增工具时，安全约束跟着工具走，不需要在每个调用点单独处理。

## 14.2 `buildTool()` 的默认值是 fail-closed

[`Tool.ts#L763-L775`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/Tool.ts#L763-L775) 定义了 `TOOL_DEFAULTS`：

```typescript
const TOOL_DEFAULTS = {
  isEnabled: () => true,
  isConcurrencySafe: (_input?: unknown) => false,
  isReadOnly: (_input?: unknown) => false,
  isDestructive: (_input?: unknown) => false,
  checkPermissions: (...) => Promise.resolve({ behavior: 'allow', updatedInput: input }),
  toAutoClassifierInput: (_input?: unknown) => '',
  userFacingName: (_input?: unknown) => '',
}
```

注释（[`L752-L758`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/Tool.ts#L752-L758)）明确说明了设计意图：

```
// Defaults (fail-closed where it matters):
// - isConcurrencySafe → false (assume not safe)
// - isReadOnly → false (assume writes)
// - isDestructive → false
```

[`buildTool()`（`L789`）](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/Tool.ts#L789) 用 `{ ...TOOL_DEFAULTS, ...def }` 合并，工具定义里的字段覆盖默认值。

这是 secure-by-default 的设计风格。工具作者如果想要更宽的权限（比如声明工具是只读的，允许在 plan 模式下运行），必须显式声明。如果忘了声明，系统会选择更保守的行为，而不是更宽松的行为。

## 14.3 工具池的三步组装，以及为什么顺序重要

`src/tools.ts` 管理工具池，流程是三步：

**第一步**，[`getAllBaseTools()`（`tools.ts#L193`）](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/tools.ts#L193) 给出所有内建工具的理论全集。注释（[`L194-L196`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/tools.ts#L194-L196)）说明了设计意图：

```
// 设计意图：这里维护"理论可用工具全集"（受构建特性与环境变量裁剪）。
// 下游 getTools()/权限过滤会再按运行态进一步收敛，形成最终暴露给模型的集合。
// 先全集、后过滤，便于统一审计工具可见性与 system prompt 缓存一致性。
```

**第二步**，[`getTools(permissionContext)`（`tools.ts#L274`）](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/tools.ts#L274) 按当前权限上下文过滤。[`filterToolsByDenyRules()`（`tools.ts#L265`）](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/tools.ts#L265) 根据 deny 规则裁剪——注释（[`L257-L264`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/tools.ts#L257-L264)）说明这个过滤在工具可见性层面生效，不只是在调用时生效，所以模型根本看不到被 deny 的工具。

**第三步**，[`assembleToolPool(permissionContext, mcpTools)`（`tools.ts#L350`）](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/tools.ts#L350) 把内建工具和 MCP 工具合并。

这个顺序的价值在于：权限规则集中在一处，不散落在各个工具实现里。新增工具时，只需要把工具加入 `getAllBaseTools()` 的列表，权限过滤自动生效。

## 14.4 工具排序服务于 prompt cache 稳定性，而不是整洁

[`assembleToolPool()` 在合并工具时做排序（`tools.ts#L367-L371`）](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/tools.ts#L367-L371)：

```typescript
const byName = (a: Tool, b: Tool) => a.name.localeCompare(b.name)
return uniqBy(
  [...builtInTools].sort(byName).concat(allowedMcpTools.sort(byName)),
  'name',
)
```

注释（[`L359-L364`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/tools.ts#L359-L364)）解释了为什么要这样排序，而不是简单地把内建工具和 MCP 工具混合排序：

```
// Sort each partition for prompt-cache stability, keeping built-ins as a
// contiguous prefix. The server's claude_code_system_cache_policy places a
// global cache breakpoint after the last prefix-matched built-in tool; a flat
// sort would interleave MCP tools into built-ins and invalidate all downstream
// cache keys whenever an MCP tool sorts between existing built-ins.
```

关键点是：服务器在内建工具列表末尾设置了 cache breakpoint。如果 MCP 工具插入到内建工具之间，这个 breakpoint 就会失效，所有下游的 cache key 都会失效，每次请求都要重新计算，增加 API 成本和延迟。

把内建工具和 MCP 工具分成两个分区分别排序，保证了内建工具始终是连续的前缀，cache breakpoint 始终有效。

这是一个在代码里不显眼、但对运行时性能有实际影响的设计决策。

## 14.5 `filterToolsByDenyRules` 在工具可见性层面生效

[`tools.ts#L265-L271`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/tools.ts#L265-L271) 的 `filterToolsByDenyRules()` 有一个值得注意的细节：

```typescript
export function filterToolsByDenyRules<T extends { name: string; mcpInfo?: ... }>(
  tools: readonly T[],
  permissionContext: ToolPermissionContext,
): T[] {
  return tools.filter(tool => !getDenyRuleForTool(permissionContext, tool))
}
```

注释（[`L257-L264`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/tools.ts#L257-L264)）说明：MCP 服务器前缀规则（如 `mcp__server`）会在工具可见性层面过滤掉该服务器的所有工具，而不只是在调用时拒绝。这意味着被 deny 的工具不会出现在系统提示词里，模型根本不知道它们存在。

这个设计防止了一种浪费：如果工具出现在系统提示词里但调用时被拒绝，模型可能会反复尝试调用，浪费 token。在可见性层面过滤，从根本上消除了这个问题。

## 14.6 本章小结

工具系统的核心主张是：把安全语义放在工具定义里，而不是放在调用方。[`Tool.ts` 的厚接口（`L398-L474`）](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/Tool.ts#L398-L474)、[`buildTool()` 的 fail-closed 默认值（`L763-L775`）](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/Tool.ts#L763-L775)、[`tools.ts` 的三步组装（`L193`、`L274`、`L350`）](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/tools.ts#L193)，共同实现了这个主张。

工具排序服务于 prompt cache 稳定性（[`L359-L364`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/tools.ts#L359-L364)），这是一个不显眼但有实际影响的设计决策。`filterToolsByDenyRules` 在工具可见性层面生效，防止模型反复尝试调用被拒绝的工具。
