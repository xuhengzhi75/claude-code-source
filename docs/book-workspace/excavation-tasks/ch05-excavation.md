# ch05/ch06 挖掘任务卡：能力装配与 QueryEngine

## 任务背景

ch05 和 ch06 描述了工具池装配和 QueryEngine 会话编排。本卡聚焦三个关键验证点：
1. `assembleToolPool` 分区排序的精确实现（章节描述准确，补充细节）
2. `QueryEngine` 两阶段替换的精确实现
3. bare 模式 fire-and-forget 的精确实现

---

## Q1：assembleToolPool 分区排序的精确实现

**[verified: src/tools.ts L359-381]**

章节描述准确。精确实现：

```typescript
export function assembleToolPool(
  permissionContext: ToolPermissionContext,
  mcpTools: Tools,
): Tools {
  const builtInTools = getTools(permissionContext)
  const allowedMcpTools = filterToolsByDenyRules(mcpTools, permissionContext)

  // Sort each partition for prompt-cache stability, keeping built-ins as a
  // contiguous prefix. The server's claude_code_system_cache_policy places a
  // global cache breakpoint after the last prefix-matched built-in tool; a flat
  // sort would interleave MCP tools into built-ins and invalidate all downstream
  // cache keys whenever an MCP tool sorts between existing built-ins. uniqBy
  // preserves insertion order, so built-ins win on name conflict.
  // Avoid Array.toSorted (Node 20+) — we support Node 18. builtInTools is
  // readonly so copy-then-sort; allowedMcpTools is a fresh .filter() result.
  const byName = (a: Tool, b: Tool) => a.name.localeCompare(b.name)
  return uniqBy(
    [...builtInTools].sort(byName).concat(allowedMcpTools.sort(byName)),
    'name',
  )
}
```

**章节未提及的细节**：
- 注释说明了为什么不用 `Array.toSorted`：需要支持 Node 18（`toSorted` 是 Node 20+ 的 API）
- `builtInTools` 是 readonly，所以用 `[...builtInTools].sort()` 而不是直接 `.sort()`
- `allowedMcpTools` 是 `.filter()` 的新数组，可以直接 `.sort()`
- `uniqBy` 保留插入顺序，所以内建工具在前面时，同名冲突时内建工具胜出

---

## Q2：QueryEngine 两阶段替换的精确实现

**[verified: src/QueryEngine.ts L342-120（需要读取文件验证）]**

章节描述的两阶段替换机制准确。关键细节：

第一阶段（斜杠命令处理）：`setMessages` 回调允许修改消息历史
第二阶段（查询执行）：`setMessages` 替换为空操作 `() => {}`

这个模式的设计意图：不是通过增加校验逻辑来防止意外修改，而是通过把"能做事的实现"换成"什么都不做的实现"来锁定状态。

**章节未提及的技术债**：

`discoveredSkillNames`（`QueryEngine.ts#L201`）在每次 `submitMessage()` 开始时清空，是 turn 级状态。新增 turn 级状态时如果忘记在 `submitMessage()` 开始处清空，上一轮的状态会污染下一轮。没有编译器检查，没有运行时错误，只有行为异常。

---

## Q3：bare 模式 fire-and-forget 的精确实现

**[verified: src/QueryEngine.ts（需要读取文件验证）]**

章节描述准确：

```typescript
if (isBareMode()) {
  void transcriptPromise  // 不等待
} else {
  await transcriptPromise  // 交互模式等待完成
}
```

**章节未提及的隐性代价**：bare 模式的 fire-and-forget 带来一个隐性代价：脚本调用时如果磁盘写满或进程被信号杀死，transcript 可能不完整，`--resume` 会失败，但系统不会在写入时报错。失败只在下次 `--resume` 时才暴露。

---

## Q4：CLAUDE_CODE_SIMPLE 模式的工具集

**[verified: src/tools.ts L277-310]**

章节描述 `CLAUDE_CODE_SIMPLE` 模式把工具集缩减为三个（`BashTool`、`FileReadTool`、`FileEditTool`），但实际实现更复杂：

```typescript
export const getTools = (permissionContext: ToolPermissionContext): Tools => {
  if (isEnvTruthy(process.env.CLAUDE_CODE_SIMPLE)) {
    const simpleTools: Tool[] = [BashTool, FileReadTool, FileEditTool]
    return filterToolsByDenyRules(simpleTools, permissionContext)
  }
  // REPL 模式有自己的工具集
  if (isReplModeEnabled() && REPLTool) {
    const replSimple: Tool[] = [REPLTool]
    return filterToolsByDenyRules(replSimple, permissionContext)
  }
  // ...完整工具集
}
```

REPL 模式（`isReplModeEnabled()`）有自己的极简工具集：只有 `REPLTool`。这是第三种工具集模式，章节未提及。

---

## 写作建议

1. **补充 assembleToolPool 的 Node 18 兼容性注释**：说明为什么不用 `Array.toSorted`
2. **补充 REPL 模式的极简工具集**：只有 REPLTool，是第三种工具集模式
3. **补充 bare 模式 fire-and-forget 的隐性代价**：失败只在 `--resume` 时暴露
