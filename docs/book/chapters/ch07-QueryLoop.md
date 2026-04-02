# 第7章 Query Loop：生产事故把主循环逼成了状态机

想象一个自动重试的代码：遇到错误就重试，重试失败再重试。这个逻辑写起来三行，在测试环境跑得很好。但如果"错误"本身是不可修复的，重试就永远不会停。

`query.ts` 的主循环最早也是这样一个简单结构。2026 年 3 月 10 日，有人查了 BigQuery，发现 1,279 个会话在单次会话内连续失败了 50 次以上，最极端的一个失败了 3,272 次，全球每天因此浪费约 25 万次 API 调用。

```typescript
const MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3
// BQ 2026-03-10: 1,279 sessions had 50+ consecutive failures (up to 3,272)
// in a single session, wasting ~250K API calls/day globally.
```

这行常量就是事故的终结。`query.ts` 主循环里的每一个 flag、每一个上限，背后都有类似的故事：不是架构师预先设计的，是生产数据逼出来的。

这一章的核心主张：**`query.ts` 主循环通过四条有上限的恢复路径保证终止，每条路径的上限值来自生产数据，而非直觉。**

可迁移原则是：每条恢复路径都必须有明确的终止保证。这个原则在系统存在递归或循环结构、且某个异常状态可能在处理后再次触发相同异常时成立。如果异常本身是一次性的，处理后不会再触发，就不需要上限约束。原则是工具，不是教条。

---

## 7.1 无上限的重试在生产中会失控

Agent 循环的最简形式只有三行：调模型、执行工具、重复。这个结构在理想情况下能工作，在真实环境里有三类问题，每类问题的修复本身都可能制造新的无限循环。

**上下文过长**随着对话轮数增加而来。处理方式是压缩历史，但压缩后可能仍然过长，触发再次压缩，形成压缩循环。**输出截断**出现时，处理方式是注入"继续"消息，但模型可能再次被截断，形成恢复循环。**API 调用失败**时，重试是自然反应，但没有上限就是那 3,272 次。

每类问题的恢复逻辑，在没有终止约束的情况下，都能产生无限循环。

---

## 7.2 每条恢复路径都有单次触发约束

`query.ts` 为三类问题各设计了有上限的恢复路径，共四条。整体流程如下：

```mermaid
flowchart TD
    START([开始一轮循环]) --> API[调用模型 API]
    API --> ERR{API 返回错误?}
    ERR -->|上下文过长| C1{存在已暂存折叠
且上轮非 collapse_drain_retry?}
    C1 -->|是| R1["① 折叠排空\ntransition: collapse_drain_retry"]
    C1 -->|否| C2{hasAttemptedReactiveCompact
为 false?}
    C2 -->|是| R2["② 反应式压缩\n派生子 Agent 摘要历史\nhasAttemptedReactiveCompact = true"]
    C2 -->|否| FAIL1[错误浮出 · 循环终止]
    ERR -->|输出截断| C3{使用默认 8k 上限
且未曾提升?}
    C3 -->|是| R3["③ 上限提升至 64k\ntransition: max_output_tokens_escalate"]
    C3 -->|否| C4{恢复次数 < 3?}
    C4 -->|是| R4["④ 注入继续消息\ntransition: max_output_tokens_recovery"]
    C4 -->|否| FAIL2[错误浮出 · 循环终止]
    ERR -->|无错误| TOOLS{响应含 tool_use 块?}
    TOOLS -->|是| EXEC[执行工具]
    EXEC --> START
    TOOLS -->|否| DONE([任务完成 · 退出循环])
    R1 --> START
    R2 --> START
    R3 --> START
    R4 --> START
```

四条路径的触发条件和源码位置：

| 恢复路径 | 触发条件 | 行为 | 源码位置 |
|---------|---------|------|---------|
| 上下文折叠排空 | 上下文过长 + 存在已暂存折叠 + 上轮不是 `collapse_drain_retry` | 排空所有已暂存的上下文折叠并重试 | [`L1094-L1126`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L1094-L1126) |
| 反应式压缩 | 上下文过长或媒体过大 + `hasAttemptedReactiveCompact` 为 false | 派生压缩子 Agent 摘要历史，用摘要替换历史 | [`L1128-L1175`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L1128-L1175) |
| 输出上限提升 | 输出被截断 + 使用默认 8k 上限 + 未曾提升过 | 用 64k 上限重试同一请求 | [`L1197-L1230`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L1197-L1230) |
| 输出截断恢复 | 输出被截断 + 已提升上限 + 恢复次数 < 3 | 注入"继续输出"元消息，让模型从中途接续 | [`L1232-L1261`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L1232-L1261) |

### 7.2.1 `hasAttemptedReactiveCompact` 保证压缩只触发一次

[`query.ts#L211`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L211) 声明这个 flag，[`L282`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L282) 初始化为 `false`，[`L1166`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L1166) 在触发压缩后设为 `true`，之后不再重置。

压缩死循环的路径是：上下文过长，触发压缩，压缩后保留段本身仍然过大，再次触发压缩，无限进行。[`L1089-L1090`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L1089-L1090) 的注释直接说明了这个设计意图：

```
// post-compact turn will media-error again; hasAttemptedReactiveCompact
// prevents a spiral and the error surfaces.
```

`hasAttemptedReactiveCompact` 设为 `true` 之后，下次再触发上下文过长，错误直接浮出，循环终止。

这个设计有一个已知的用户体验代价：长会话里第二次遭遇上下文过长，系统不会再次尝试压缩，只会报错。这是有意为之的，两害相权，报错比无限循环可控。

### 7.2.2 `needsFollowUp` 用 `tool_use` 块驱动，绕开 `stop_reason` 的不稳定性

[`query.ts#L561-L565`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L561-L565) 的注释说明了这个选择：

```typescript
// We intentionally derive "need another model turn" from observed tool_use
// blocks instead of stop_reason. This keeps behavior stable across provider/
// SDK differences where stop_reason may be missing or delayed in stream events.
```

`stop_reason` 是模型对自己行为的描述，不同 provider 和 SDK 对这个字段的语义不完全稳定，可能缺失，也可能在流式事件中延迟到达。`tool_use` 块是否真实出现在响应里，是可以直接观察的事实。

代价是：如果模型产生了 `tool_use` 块但实际上任务已完成（模型行为异常），循环会多跑一轮。这比误判任务完成、提前退出要安全。

### 7.2.3 截断恢复的注入措辞精确控制了模型行为

[`L1233-L1238`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L1233-L1238) 注入的恢复消息：

```typescript
const recoveryMessage = createUserMessage({
  content:
    `Output token limit hit. Resume directly — no apology, no recap of what you were doing. ` +
    `Pick up mid-thought if that is where the cut happened. Break remaining work into smaller pieces.`,
  isMeta: true,
})
```

模型在恢复时有道歉和总结的倾向，两者都会浪费 token，在截断场景下没有意义。措辞直接排除了这两种行为。`isMeta: true`（一个系统注入标记）让这条消息不显示在 UI 里。

`MAX_OUTPUT_TOKENS_RECOVERY_LIMIT = 3`（[`L164`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L164)）限制这条路径最多走三次，超过后错误浮出。

---

## 7.3 阈值来自实测数据，换模型需要重测

`MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3` 直接来自 BQ 数据：连续失败超过 3 次的会话全都在浪费 API 调用，没有一个最终成功。这个阈值不是拍脑袋的，是从 3,272 次失败里得出的结论。

上下文窗口的两个触发点设计了一个 10,000 token 的无感知压缩窗口：

- **自动压缩触发点**：`context_window - max_output_tokens - 13,000 buffer`。13,000 的余量确保触发压缩时还有足够空间完成当前轮次输出，不会在压缩过程中再次报错。
- **强制压缩触发点**（阻塞用户）：`context_window - max_output_tokens - 3,000 buffer`。到这里必须压缩，否则下次 API 调用大概率失败。

摘要预留 20,000 tokens，基于历史观测中摘要长度的 p99.99 约为 17,387 tokens，加约 15% 安全边距（inference）。

这些阈值针对当前模型的上下文大小和输出特征校准。换用不同上下文大小或不同摘要风格的模型时，需要重新测量，不能直接沿用。

### 7.3.1 `transition` 字段让测试直接断言恢复路径

[`query.ts#L206-L219`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L206-L219) 定义了 `State`，注释说明其边界：

```
// Mutable state carried between loop iterations. Keep this shape focused on
// runtime continuity concerns only: message evolution, compaction/recovery
// bookkeeping, and turn-to-turn transition cause.
```

`transition` 字段（[`L218`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L218)）记录上一轮为什么继续，可能的值：`collapse_drain_retry`、`reactive_compact_retry`、`max_output_tokens_escalate`、`max_output_tokens_recovery`。

[`L216-L218`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L216-L218) 解释了这个字段的设计目的：

```
// Why the previous iteration continued. Undefined on first iteration.
// Lets tests assert recovery paths fired without inspecting message contents.
```

测试可以直接断言"这次循环走了 reactive_compact_retry 路径"，不需要通过消息内容或日志推断。显式记录转换原因，是让状态机可测试的关键设计。

### 7.3.2 Capybara v8 补丁：消息构建层集中处理模型特定行为

主循环还有一个更低调的防护机制：`yieldMissingToolResultBlocks()`。

Capybara v8（某个模型版本的内部代号）在特定条件下会产生 `tool_use` 块但对应的 `tool_result` 为空。把这个空 `tool_result` 传给下一轮 API，触发格式校验错误，导致循环中断。`yieldMissingToolResultBlocks()` 在每轮循环结束、构建下一轮消息之前，检查是否存在有 `tool_use` 但没有对应 `tool_result` 的情况，如果有，补充一个占位块，让消息序列在格式上保持合法。

这是针对特定模型版本行为的补丁，把这类补丁集中在消息构建层而不是散落在业务逻辑里，版本升级时的清理工作更容易定位。

---

## 7.4 边界与技术债

四条恢复路径的优先级由代码顺序隐式决定，没有显式配置。调整顺序意味着修改代码，而不是修改参数，需要小心测试覆盖。

`hasAttemptedReactiveCompact` 在会话内全局生效，意味着一次会话最多触发一次反应式压缩。如果用户在一次长会话里多次遇到上下文过长，第二次只会报错，不会再次压缩。这是有意为之，但用户侧可能不理解为什么第二次压缩没有发生。

压缩阈值（13,000 buffer、20,000 摘要预留）是模型特定参数。换用不同上下文大小或不同摘要风格的模型时，这些阈值需要重新测量。

---

## 7.5 本章不覆盖项

压缩子 Agent 的内部逻辑（如何摘要、如何重建上下文连续性）在第18章展开。`--resume` 时的反序列化和语义修复流程在第18章。`query.ts` 和 `QueryEngine` 之间的接缝、`State` 字段的生命周期在第6章和第16章。

---

**验证题：** 去掉 `hasAttemptedReactiveCompact` 这个 flag，在什么条件下会出现无限循环？用户对话包含大量不可压缩内容（大段代码），压缩后的摘要仍然超过上下文窗口。没有这个 flag，系统触发压缩，压缩后仍然过长，再次触发，形成无限循环，直到进程被外部杀死。
