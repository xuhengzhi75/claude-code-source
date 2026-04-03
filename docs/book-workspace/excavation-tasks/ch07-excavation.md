# ch07/ch08/ch09 挖掘任务卡：QueryLoop、任务系统、护城河

## 任务背景

ch07、ch08、ch09 描述了 query loop 恢复路径、任务系统并发原语、护城河机制。本卡聚焦三个关键发现：
1. query.ts 实际有**五条**恢复路径（章节只描述了四条）
2. `yieldMissingToolResultBlocks` 的精确实现（不只是"补充占位块"）
3. anti_distillation 机制的精确触发条件（有 feature flag 门控）

---

## Q1：query.ts 实际有五条恢复路径

### 章节原文描述

ch07 描述了四条恢复路径：折叠排空、反应式压缩、输出上限提升、输出截断恢复。

### 源码验证结论

**[verified: src/query.ts L1295-1354]**

实际有**第五条**恢复路径：`stop_hook_blocking`（Stop Hook 阻塞恢复）。

```typescript
if (stopHookResult.blockingErrors.length > 0) {
  const next: State = {
    messages: [...messagesForQuery, ...assistantMessages, ...stopHookResult.blockingErrors],
    // ...
    // Preserve the reactive compact guard — if compact already ran and
    // couldn't recover from prompt-too-long, retrying after a stop-hook
    // blocking error will produce the same result. Resetting to false
    // here caused an infinite loop: compact → still too long → error →
    // stop hook blocking → compact → … burning thousands of API calls.
    hasAttemptedReactiveCompact,
    transition: { reason: 'stop_hook_blocking' },
  }
  state = next
  continue
}
```

**关键设计细节**：`stop_hook_blocking` 路径**保留** `hasAttemptedReactiveCompact` 的当前值（不重置为 false）。注释明确说明了原因：如果重置为 false，会产生无限循环：compact → 仍然过长 → 错误 → stop hook blocking → compact → …，烧掉大量 API 调用。这是一个真实踩过的坑，注释记录了修复历史。

**第六条路径（TOKEN_BUDGET）**：

```typescript
if (feature('TOKEN_BUDGET')) {
  const decision = checkTokenBudget(...)
  if (decision.action === 'continue') {
    state = {
      // ...
      hasAttemptedReactiveCompact: false,  // 注意：这里重置为 false
      transition: { reason: 'token_budget_continuation' },
    }
    continue
  }
}
```

TOKEN_BUDGET 路径重置 `hasAttemptedReactiveCompact` 为 false，与 stop_hook_blocking 路径的处理相反。这是因为 token budget continuation 是用户主动触发的新任务，不是错误恢复，可以重新尝试压缩。

**完整的 `transition.reason` 枚举**（六个值）：
- `collapse_drain_retry`
- `reactive_compact_retry`
- `max_output_tokens_escalate`
- `max_output_tokens_recovery`
- `stop_hook_blocking`
- `token_budget_continuation`

---

## Q2：yieldMissingToolResultBlocks 的精确实现

### 章节原文描述

> `yieldMissingToolResultBlocks()` 在每轮循环结束、构建下一轮消息之前，检查是否存在有 `tool_use` 但没有对应 `tool_result` 的情况，如果有，补充一个占位块，让消息序列在格式上保持合法。

### 源码验证结论

**[verified: src/query.ts L123-149]**

章节描述基本准确，但有一个重要细节：这个函数是一个**生成器函数**（`function*`），不是普通函数：

```typescript
function* yieldMissingToolResultBlocks(
  assistantMessages: AssistantMessage[],
  errorMessage: string,
) {
  for (const assistantMessage of assistantMessages) {
    const toolUseBlocks = assistantMessage.message.content.filter(
      content => content.type === 'tool_use',
    ) as ToolUseBlock[]

    for (const toolUse of toolUseBlocks) {
      yield createUserMessage({
        content: [{
          type: 'tool_result',
          content: errorMessage,  // 错误消息作为 tool_result 内容
          is_error: true,
          tool_use_id: toolUse.id,
        }],
        toolUseResult: errorMessage,
        sourceToolAssistantUUID: assistantMessage.uuid,
      })
    }
  }
}
```

**精确行为**：
- 遍历所有 assistant 消息（不只是最后一条）
- 对每个 `tool_use` 块生成一个对应的 `tool_result`，标记 `is_error: true`
- `errorMessage` 参数是具体的错误信息，不是空占位符
- 调用点有四处（L910、L994、L1035、L910），在不同错误场景下使用

---

## Q3：anti_distillation 机制的精确触发条件

### 章节原文描述

> 触发条件是三重检查：入口必须是 CLI（`CLAUDE_CODE_ENTRYPOINT === 'cli'`）、必须是一方客户端（`shouldIncludeFirstPartyOnlyBetas()`）、且 GrowthBook feature flag `tengu_anti_distill_fake_tool_injection` 为 true。

### 源码验证结论

**[verified: src/services/api/claude.ts L301-313]**

章节描述基本准确，但遗漏了最外层的 feature flag 门控：

```typescript
// Anti-distillation: send fake_tools opt-in for 1P CLI only
if (
  feature('ANTI_DISTILLATION_CC')
    ? process.env.CLAUDE_CODE_ENTRYPOINT === 'cli' &&
      shouldIncludeFirstPartyOnlyBetas() &&
      getFeatureValue_CACHED_MAY_BE_STALE(
        'tengu_anti_distill_fake_tool_injection',
        false,
      )
    : false
) {
  result.anti_distillation = ['fake_tools']
}
```

实际是**四重门控**：
1. `feature('ANTI_DISTILLATION_CC')`：构建时 feature flag（外部构建中整个块被 DCE 消除）
2. `process.env.CLAUDE_CODE_ENTRYPOINT === 'cli'`：必须是 CLI 入口
3. `shouldIncludeFirstPartyOnlyBetas()`：必须是一方客户端
4. `getFeatureValue_CACHED_MAY_BE_STALE('tengu_anti_distill_fake_tool_injection', false)`：GrowthBook 实验值

最外层的 `feature('ANTI_DISTILLATION_CC')` 是构建时常量，在外部构建中整个 if 块被 dead-code elimination 消除，外部用户的构建产物里根本不存在这段代码。

---

## Q4：State 类型的完整字段（比章节描述的更多）

**[verified: src/query.ts L206-219]**

章节描述的 `State` 字段不完整。实际字段：

```typescript
type State = {
  messages: Message[]
  toolUseContext: ToolUseContext
  autoCompactTracking: AutoCompactTrackingState | undefined  // 章节未提及
  maxOutputTokensRecoveryCount: number
  hasAttemptedReactiveCompact: boolean
  maxOutputTokensOverride: number | undefined
  pendingToolUseSummary: Promise<ToolUseSummaryMessage | null> | undefined  // 章节未提及
  stopHookActive: boolean | undefined  // 章节未提及
  turnCount: number
  transition: Continue | undefined
}
```

新增字段说明：
- `autoCompactTracking`：自动压缩的追踪状态，用于 auto-compact 功能
- `pendingToolUseSummary`：待处理的工具使用摘要 Promise，用于工具结果摘要功能
- `stopHookActive`：当前是否有 stop hook 在阻塞，用于 stop_hook_blocking 路径

---

## Q5：tasks.ts LOCK_OPTIONS 的精确配置

**[verified: src/utils/tasks.ts L94-108（来自 ch17 挖掘卡）]**

章节描述准确。精确配置：

```typescript
const LOCK_OPTIONS = {
  retries: { retries: 30, minTimeout: 5, maxTimeout: 100 },
}
```

注意：没有 `stale` 字段，使用 `proper-lockfile` 库的默认值（10 秒）。`retries: 30` 按 10 个并发 agent 的 swarm 场景估算，每个临界区做 readdir + N×readFile + writeFile（慢磁盘约 50-100ms），最后一个调用者在 10 路竞争中需要约 900ms，30 次重试给约 2.6 秒总等待时间。

---

## 写作建议

1. **修正 ch07 恢复路径数量**：实际有五条（加上 stop_hook_blocking），如果算 TOKEN_BUDGET 则有六条
2. **补充 stop_hook_blocking 路径的关键设计**：保留 `hasAttemptedReactiveCompact` 防止无限循环，这是真实踩过的坑
3. **补充 anti_distillation 的四重门控**：最外层的 `feature('ANTI_DISTILLATION_CC')` 是构建时 DCE
4. **补充 State 类型的完整字段**：`autoCompactTracking`、`pendingToolUseSummary`、`stopHookActive`
5. **修正 yieldMissingToolResultBlocks 描述**：是生成器函数，有四个调用点，errorMessage 是具体错误信息
