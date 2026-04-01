# 第7章 Query Loop：`hasAttemptedReactiveCompact` 为什么存在

**核心主张：`query.ts` 的主循环不是"调模型→执行工具→重复"的简单循环，而是一个防止无限循环的状态机——每个 flag 的存在都有一个真实的故障场景作为背书。**

`hasAttemptedReactiveCompact` 这个 flag 是最好的例子。它不是随意加的布尔值，而是修复了一个真实的无限循环 bug。

## 7.1 `hasAttemptedReactiveCompact` 防止了什么

[`query.ts#L211`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L211) 声明了这个 flag：

```typescript
hasAttemptedReactiveCompact: boolean
```

[`L282`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L282) 初始化为 `false`，[`L1166`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L1166) 在触发压缩后设为 `true`，之后不再重置。

为什么需要这个 flag？[`query.ts#L1089-L1090`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L1089-L1090) 的注释解释了：

```
// post-compact turn will media-error again; hasAttemptedReactiveCompact
// prevents a spiral and the error surfaces.
```

没有这个 flag 时，系统会陷入这个循环：上下文过长 → 触发压缩 → 压缩后仍然过长（因为保留段本身就很大）→ 再次触发压缩 → 无限循环，烧掉大量 API 调用。

`hasAttemptedReactiveCompact` 保证压缩只触发一次。如果压缩后仍然过长，错误会被 surface 出来，而不是继续循环。

这个 flag 的存在，是系统在真实运行中踩过坑之后的产物。

## 7.2 继续条件为什么不看 `stop_reason`

[`query.ts#L561-L565`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L561-L565) 有一段注释，解释了一个反直觉的设计决策：

```typescript
// We intentionally derive "need another model turn" from observed tool_use
// blocks instead of stop_reason. This keeps behavior stable across provider/
// SDK differences where stop_reason may be missing or delayed in stream events.
const toolUseBlocks: ToolUseBlock[] = []
let needsFollowUp = false
```

[`L1071`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L1071) 是终止判定的关键点：

```typescript
if (!needsFollowUp) {
  // 进入收尾分支
}
```

`needsFollowUp` 由 `toolUseBlocks` 是否出现驱动，而不是 `stop_reason`。

这个选择的理由是：不同 provider 和 SDK 对 `stop_reason` 的语义不完全稳定，`stop_reason` 可能缺失或在流式事件中延迟到达。但 `tool_use` 块是否真的出现在响应里，是可以直接观察的事实。

系统选择相信"发生了什么"，而不是相信"模型怎么描述自己停下来的原因"。

## 7.3 `State` 的形状揭示了什么被认为是"运行时关键状态"

[`query.ts#L206-L219`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L206-L219) 定义了 `State`：

```typescript
type State = {
  messages: Message[]
  toolUseContext: ToolUseContext
  autoCompactTracking: AutoCompactTrackingState | undefined
  maxOutputTokensRecoveryCount: number
  hasAttemptedReactiveCompact: boolean
  maxOutputTokensOverride: number | undefined
  pendingToolUseSummary: Promise<ToolUseSummaryMessage | null> | undefined
  stopHookActive: boolean | undefined
  turnCount: number
  transition: Continue | undefined
}
```

注释（[`L203-L205`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L203-L205)）说明了这个类型的设计意图：

```
// Mutable state carried between loop iterations. Keep this shape focused on
// runtime continuity concerns only: message evolution, compaction/recovery
// bookkeeping, and turn-to-turn transition cause.
```

`transition` 字段（[`L218`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L218)）特别值得注意。它记录了上一轮为什么继续，可能的值包括 `collapse_drain_retry`、`reactive_compact_retry`、`max_output_tokens_escalate`、`max_output_tokens_recovery`。

这个字段不是给用户看的，而是给测试用的——注释（[`L216-L218`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L216-L218)）说：

```
// Why the previous iteration continued. Undefined on first iteration.
// Lets tests assert recovery paths fired without inspecting message contents.
```

测试可以断言"这次循环走了 reactive_compact_retry 路径"，而不需要检查消息内容。这是一个为可测试性而设计的字段。

## 7.4 四条恢复路径的完整决策表

主循环里有四条恢复路径，每条路径的触发条件和行为都是精确的：

| 恢复路径 | 触发条件 | 行为 | 源码位置 |
|---------|---------|------|---------|
| 上下文折叠排空 | 上下文过长 + 存在已暂存的折叠 + 上一轮不是 `collapse_drain_retry` | 排空所有已暂存的上下文折叠并重试 | [`L1094-L1126`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L1094-L1126) |
| 反应式压缩 | 上下文过长或媒体过大 + `hasAttemptedReactiveCompact` 为 false | 派生压缩子 Agent 摘要历史，用摘要替换历史 | [`L1128-L1175`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L1128-L1175) |
| 输出上限提升 | 输出被截断 + 使用默认 8k 上限 + 未曾提升过 | 用 64k 上限重试同一请求 | [`L1197-L1230`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L1197-L1230) |
| 输出截断恢复 | 输出被截断 + 已提升上限 + 恢复次数 < 3 | 注入"继续输出"元消息，让模型从中途接续 | [`L1232-L1261`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L1232-L1261) |

`MAX_OUTPUT_TOKENS_RECOVERY_LIMIT = 3`（[`L164`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L164)）限制了恢复次数。超过 3 次后，错误会被 surface 出来。

这四条路径的顺序是有意义的：先尝试代价最小的（折叠排空），再尝试代价较大的（压缩），最后是最后手段（注入元消息）。

## 7.5 输出截断时注入的元消息是什么

[`L1233-L1238`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L1233-L1238) 里，当输出被截断时，系统注入这条消息：

```typescript
const recoveryMessage = createUserMessage({
  content:
    `Output token limit hit. Resume directly — no apology, no recap of what you were doing. ` +
    `Pick up mid-thought if that is where the cut happened. Break remaining work into smaller pieces.`,
  isMeta: true,
})
```

这条消息的措辞是精心设计的：不要道歉，不要回顾，直接继续，从中途接续。这是因为模型在恢复时有一个倾向：先道歉，再总结之前做了什么，然后才继续。这会浪费 token，而且在截断场景下没有意义。

`isMeta: true` 标记这条消息是系统注入的，不是用户输入的，不会显示在 UI 里。

## 7.6 本章小结

`query.ts` 的主循环是一个防止无限循环的状态机。`hasAttemptedReactiveCompact` 防止压缩触发无限循环，`needsFollowUp` 基于 `tool_use` 事实而非 `stop_reason` 判断是否继续，`transition` 字段为测试提供可断言的路径记录。

四条恢复路径按代价从小到大排列，每条路径的触发条件和行为都是精确的。输出截断时注入的元消息措辞是刻意设计的，防止模型在恢复时浪费 token 在道歉和回顾上。
