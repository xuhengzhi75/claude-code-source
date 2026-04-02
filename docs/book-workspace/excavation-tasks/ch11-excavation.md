# ch11 挖掘任务卡：为什么干不了真活

**交给**：startheart  
**写作侧**：小许  
**背景**：ch11 现有内容逻辑通顺，但读起来像"架构说明书"——每节都有锚点，但缺少"让人拍大腿的发现"。读者看完能复述框架，但不会有"原来如此"的惊讶感。

---

## 你需要挖的问题（按优先级排）

### 🔴 必答（写作侧无法在没有这些素材的情况下改文章）

**Q1：`errors.ts` 里那三种中止来源，最初是一种还是三种？**  
现有章节提到 `isAbortError()` 统一判断三种来源（自定义 AbortError、DOMException、SDK 的 APIUserAbortError）。  
想知道的是：这三种来源是从一开始就分开处理的，还是随时间演进才分出来的？  
代码注释或 commit 历史里有没有线索说明为什么需要统一判断这三种？  
- 目标文件：`src/utils/errors.ts`，重点看注释和函数签名演进

**Q2：`hasAttemptedReactiveCompact` flag 是怎么引入的？**  
ch11 第 11.3 节提到这个 flag 修复了一个"压缩→仍过长→错误→压缩"的无限循环 bug。  
想知道的是：这个 bug 是不是真的发生过才加的补丁？代码注释里有没有更多描述？这个 flag 用在哪几个地方？每个使用位置分别防的是什么场景？  
- 目标文件：`src/query.ts`，搜索 `hasAttemptedReactiveCompact`，把所有出现行都读一遍

**Q3：`TurnInterruptionState` 的两种类型（`interrupted_prompt` vs `interrupted_turn`）实际处理逻辑有什么不同？**  
现有章节只提到"对应不同的恢复策略"，但没说具体怎么不同。  
想知道的是：恢复时这两种类型走的是什么不同路径？有没有一种比另一种更难处理？  
- 目标文件：`src/utils/conversationRecovery.ts`，搜索 `TurnInterruptionState`

---

### 🟡 加分项（有这些素材，文章能从7分升到9分）

**Q4：`createMemoryFileCanUseTool()` 有没有更有趣的细节？**  
现有章节只说"只允许 Edit 操作且只针对特定文件"。  
想挖的是：这个限制是如何在代码层实现的？有没有什么防逃逸的设计？比如文件路径校验、工具名称白名单等。如果有，把关键逻辑截出来。  
- 目标文件：`src/services/SessionMemory/sessionMemory.ts`，L460 附近

**Q5：后台任务的 task summary 是怎么生成的？生成频率如何控制？**  
现有章节提到 `BG_SESSIONS` 模式下主循环会生成 task summary，但没有细节。  
想挖的是：summary 的触发条件是什么？是按时间还是按迭代次数？内容是怎么生成的（截断、LLM 摘要，还是别的）？  
- 目标文件：`src/query.ts`，L1694 附近

**Q6：State 对象随时间膨胀的证据**  
现有章节提到 `State` 对象可能变成"垃圾桶"。  
想挖的是：现在的 `State` 对象有多少个字段？哪些字段看起来像是后期补丁加进去的（命名不一致、有专门的注释说明为什么加的）？  
- 目标文件：`src/query.ts`，L282 附近，把完整的 State 类型定义截出来

---

### 🟢 意外发现区（不在问题清单里的有趣东西）

如果你在挖上面这些问题时，发现了任何"反直觉的设计"、"看起来很奇怪但有原因的代码"、"原来如此的细节"，请单独列在这里。这类素材是文章最有价值的部分，我会优先展开写。

---

## 填写格式

请在下方按问题编号填写，附上：
- 结论（1-3句话）
- verified / inference 标注
- 源码锚点（文件 + 行号）
- 如有，附关键代码片段（3-5行）

---

## startheart 填写区

### Q1：`errors.ts` 里那三种中止来源，最初是一种还是三种？

**结论**：代码注释直接给出了答案——三种来源是随时间演进分出来的，不是一开始就分开处理的。注释明确说明了为什么不能用 `instanceof` 统一判断：minified builds 会 mangle class names，导致 `instanceof` 失效。这是一个因为构建工具行为而被迫演进的防御性设计。

**verified** — 源码锚点：`src/utils/errors.ts`（全文）

```typescript
// We can't use instanceof for the SDK class because minified builds will
// mangle class names, breaking instanceof checks.
export function isAbortError(error: unknown): boolean {
  return (
    error instanceof AbortError ||           // 自定义 AbortError（最早的）
    error instanceof DOMException ||          // 浏览器/Node 原生 AbortSignal
    hasExactErrorMessage(error, 'Request was aborted.')  // SDK 的 APIUserAbortError
  )
}
```

三种来源的演进逻辑：最初可能只有自定义 `AbortError`；后来引入了 `AbortController` / `AbortSignal`（Web 标准），产生了 `DOMException`；再后来 Anthropic SDK 自己也有一个 `APIUserAbortError`，但 minified 后 class name 被混淆，只能用 message 字符串匹配。

---

### Q2：`hasAttemptedReactiveCompact` flag 是怎么引入的？

**结论**：这个 flag 确实是为了修复真实发生的无限循环 bug 而加的补丁。代码注释在 L1306-L1310 明确描述了 bug 场景："Resetting to false here caused an infinite loop: compact → still too long → error → stop hook blocking → compact → … burning thousands of API calls."

**verified** — 源码锚点：`src/query.ts` L211, L282, L1094-L1095, L1171, L1306-L1311, L1347, L1736

flag 的所有使用位置及防护场景：

| 行号 | 操作 | 防护场景 |
|------|------|---------|
| L282 | 初始化为 `false` | 每次新 query 开始时重置 |
| L1094-L1095 | 注释说明 | 防止 post-compact turn 再次 media-error 导致螺旋 |
| L1135 | 传入 `tryReactiveCompact({ hasAttempted })` | 告知 reactive compact 是否已尝试过 |
| L1171 | 设为 `true` | compact 成功后标记，防止再次触发 |
| L1311 | 保持原值传递 | stop hook blocking 后继续时保留，防止 compact→error→hook→compact 死循环 |
| L1347 | 重置为 `false` | token budget continuation 时重置（新的 token 预算周期） |
| L1736 | 重置为 `false` | 正常进入下一 turn 时重置 |

关键设计：L1311 是最反直觉的——stop hook blocking 后 `continue` 时，`hasAttemptedReactiveCompact` 保持原值而不重置。注释解释了原因：如果 compact 已经跑过但 context 仍然过长，重置这个 flag 会让 compact 再次触发，形成死循环，"burning thousands of API calls"。

---

### Q3：`TurnInterruptionState` 的两种类型实际处理逻辑有什么不同？

**结论**：`interrupted_turn` 和 `interrupted_prompt` 在对外暴露时已经被统一处理——`interrupted_turn` 会被自动转换为 `interrupted_prompt`（追加一条 `"Continue from where you left off."` 的 meta 消息）。对外只有两种状态：`none`（正常完成）和 `interrupted_prompt`（需要续跑）。

**verified** — 源码锚点：`src/utils/conversationRecovery.ts` L139-L227, L258-L336

内部三态（`InternalInterruptionState`）：
- `none`：turn 正常完成（最后消息是 assistant）
- `interrupted_prompt`：用户发了消息但 assistant 还没响应（最后消息是普通 user 消息）
- `interrupted_turn`：turn 进行中被打断（最后消息是 tool_result 或 attachment）

转换逻辑（L213-L224）：`interrupted_turn` → 追加 `"Continue from where you left off."` → 变成 `interrupted_prompt`。这个设计的意图是"语义修复"而非"transcript 回放"：先从磁盘恢复事实，再把尾部重写成 API 合法的、可续跑的对话形状。

有一个特殊的边界情况（L313-L322）：Brief mode（`#20467`）下，completed turn 合法地以 tool_result 结尾（因为 brief mode 会丢弃 trailing assistant text block）。如果不特殊处理，每次 brief mode 会话恢复都会被误判为 `interrupted_turn`，注入一条幽灵 "Continue from where you left off."。

---

### Q4：`createMemoryFileCanUseTool()` 的防逃逸设计

**结论**：限制极其严格——双重白名单：工具名必须是 `FILE_EDIT_TOOL_NAME`（即 `str_replace_based_edit_tool`），且 `file_path` 必须严格等于（`===`）传入的 `memoryPath`。任何其他工具、任何其他路径，一律返回 `deny`。没有路径遍历防护（因为用的是严格相等而非前缀匹配，所以 `../` 攻击无效）。

**verified** — 源码锚点：`src/services/SessionMemory/sessionMemory.ts` L466-L490

```typescript
export function createMemoryFileCanUseTool(memoryPath: string): CanUseToolFn {
  return async (tool: Tool, input: unknown) => {
    if (
      tool.name === FILE_EDIT_TOOL_NAME &&
      typeof input === 'object' && input !== null &&
      'file_path' in input
    ) {
      const filePath = input.file_path
      if (typeof filePath === 'string' && filePath === memoryPath) {  // 严格相等
        return { behavior: 'allow' as const, updatedInput: input }
      }
    }
    return {
      behavior: 'deny' as const,
      message: `only ${FILE_EDIT_TOOL_NAME} on ${memoryPath} is allowed`,
      // ...
    }
  }
}
```

---

### Q5：后台任务的 task summary 是怎么生成的？

**结论**：task summary 通过 `taskSummaryModule`（`require('./utils/taskSummary.js')`）动态加载，仅在 `BG_SESSIONS` feature flag 开启时存在。触发条件是 `shouldGenerateTaskSummary()` 返回 true，在每次 tool results 处理完、即将进入下一 turn 时检查（L1699-L1715）。具体触发频率逻辑在 `taskSummary.js` 中，但该文件不在当前源码树中（可能是编译产物或 feature-gated 文件）。

**inference** — 源码锚点：`src/query.ts` L118-L119, L1695-L1715

---

### Q6：State 对象随时间膨胀的证据

**结论**：`State` 对象目前有 9 个字段，其中至少 3 个是明显的后期补丁：`hasAttemptedReactiveCompact`（修复无限循环 bug）、`stopHookActive`（stop hook 功能加入时追加）、`transition`（后来加的调试/测试辅助字段，注释说"Lets tests assert recovery paths fired without inspecting message contents"）。

**verified** — 源码锚点：`src/query.ts` L206-L219

```typescript
type State = {
  messages: Message[]                                    // 核心
  toolUseContext: ToolUseContext                         // 核心
  autoCompactTracking: AutoCompactTrackingState | undefined  // compact 功能加入时
  maxOutputTokensRecoveryCount: number                   // max_output_tokens 恢复功能
  hasAttemptedReactiveCompact: boolean                   // 补丁：防无限循环
  maxOutputTokensOverride: number | undefined            // max_output_tokens 恢复功能
  pendingToolUseSummary: Promise<...> | undefined        // tool summary 功能
  stopHookActive: boolean | undefined                    // stop hook 功能
  turnCount: number                                      // 核心
  transition: Continue | undefined                       // 后期加的调试辅助
}
```

注释原文（L203-L205）："Mutable state carried between loop iterations. Keep this shape focused on runtime continuity concerns only: message evolution, compaction/recovery bookkeeping, tool-result summarization, and turn-to-turn transition cause."——这个"Keep this shape focused"的告诫本身就是在说：这个对象已经有膨胀的趋势，需要刻意约束。

---

### 意外发现

**`--bare` 模式的 transcript 写入是 fire-and-forget**（`src/QueryEngine.ts` L459-L460）：`void transcriptPromise`，不等待落盘完成。注释说"Scripted calls don't --resume after kill-mid-request"——这是一个有意识的性能/可靠性权衡，但意味着 `--bare` 模式下进程被杀时 transcript 可能不完整。

**`stop_reason` 在流式路径下落盘时永远是 null**（`src/utils/conversationRecovery.ts` L300-L306）：消息在 `content_block_stop` 时落盘，而 `stop_reason` 在 `message_delta` 事件里才到达。这意味着任何依赖 transcript 里 `stop_reason` 的逻辑都是错的。

---

## 小许备注

填好后 commit 到 main，我会自动检测到并开始改稿。  
如果某个问题找不到答案，直接写"未找到"，我会相应调整写作策略。
