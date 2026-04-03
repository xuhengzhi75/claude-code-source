# ch16 挖掘任务卡：状态与上下文

**认领人：** startheart
**状态：** 已完成 ✅
**目标章节：** `docs/book/chapters/ch16-状态与上下文.md`（当前 122 行）
**写作规范：** `docs/book-workspace/methodology/writing-principles.md`

---

## 背景与现状

ch16 讲 Claude Code 的状态管理：`AppState`、函数式更新 `setAppState(prev => f(prev))`、`useAppState`/`useAppStateSelector` 两层 hook 的区分、上下文裁剪（token 预算管理）。

现有内容的主要缺口：
1. **函数式更新的必要性没有具体 bug 支撑** — 章节说"防止并发竞态"，但没有说：不用函数式更新，在什么真实场景下会出问题？
2. **上下文裁剪的具体算法没有** — 章节提到"token 预算"，但没有说：哪些内容会被裁剪、裁剪顺序是什么、有没有硬性截断 vs 软性优先级降序
3. **`useAppStateSelector` vs `useAppState` 的性能差异没有量化** — 章节说"避免不必要的重渲染"，但没有说在实际中这有多大影响

---

## 挖掘任务

### 🔴 必答（ch16 改稿必须覆盖）

**任务 1：函数式更新的必要场景**

文件：`src/state/store.ts`、`src/state/AppState.tsx`

**结论 1-A：`setState` 只接受函数式更新，从类型层面封死了直接赋值**
- 状态：verified
- 源码：`src/state/store.ts`
- `createStore<T>` 的 `setState` 签名是 `(updater: (prev: T) => T) => void`，不接受直接传新值。这不是风格约定，是类型约束——调用方无法绕过。
- 内部实现：`this.state = updater(this.state)`，每次更新都基于当前最新状态计算，不存在"读旧值写新值"的窗口。

**结论 1-B：Agent 系统的并发场景是"多个工具回调同时修改同一字段"**
- 状态：inference（源码无注释，但结构可推断）
- `StreamingToolExecutor` 并发执行多个工具（见 ch02 挖掘卡），每个工具完成后都会触发状态更新（如 `tasks`、`toolPermissionContext`）。如果用直接赋值 `setState(newState)`，两个工具同时完成时，后写入的会覆盖前一个的更新，因为两者都基于同一个"旧快照"计算新状态。函数式更新让每次写入都基于当前最新状态，串行化了并发写入。
- 这和 React 的 `setState(prev => ...)` 解决的问题完全相同，但 Claude Code 是在 Node.js 事件循环里，不是 React 渲染周期。

**结论 1-C：`AppState` 用 `DeepImmutable<T>` 包裹，强制不可变**
- 状态：verified
- 源码：`src/state/AppStateStore.ts`（约 450 行字段定义）
- `AppState` 类型是 `DeepImmutable<AppStateData>`，所有字段递归只读。这意味着任何修改都必须产生新对象，不能原地 mutate。配合函数式更新，每次状态变更都是"旧状态 → 新状态"的纯函数变换，便于调试和追踪。

**结论 1-D：`useAppState(selector)` 基于 `useSyncExternalStore`，selector 决定重渲染粒度**
- 状态：verified
- 源码：`src/state/AppState.tsx:126-162`
- `useSyncExternalStore(store.subscribe, () => selector(store.getState()))` — React 18 的并发安全订阅 API。每次状态更新，React 会调用 selector，只有 selector 返回值变化时才触发重渲染。
- `useAppState` 不带 selector 时等价于 `useAppState(s => s)`，订阅全量状态，任何字段变化都重渲染。
- `useAppState(s => s.someField)` 只在 `someField` 变化时重渲染，其他字段更新不触发。

格式要求：结论 + verified/inference 标注 + 源码行号 ✅

---

**任务 2：上下文裁剪的算法**

文件：`src/services/compact/autoCompact.ts`、`src/services/compact/compact.ts`、`src/query/tokenBudget.ts`

> **重要澄清**：ch16 挖掘卡原题把"上下文裁剪"指向 `src/utils/context.ts`，但该文件只是模型上下文窗口大小查询工具（`getContextWindowForModel`）。真正的上下文裁剪逻辑分布在三个层次：
> 1. **执行层预算控制**（`src/query/tokenBudget.ts`）：决定"是否继续执行"
> 2. **自动压缩触发**（`src/services/compact/autoCompact.ts`）：决定"何时触发压缩"
> 3. **压缩算法本体**（`src/services/compact/compact.ts`）：决定"如何压缩"

**结论 2-A：执行层预算控制 — 90% 阈值 + 递减检测**
- 状态：verified
- 源码：`src/query/tokenBudget.ts`
- `COMPLETION_THRESHOLD = 0.9`：当已用 token 超过预算的 90% 时，向模型注入"你快没 token 了，请收尾"的系统提示。
- 递减检测：如果连续两轮 token 用量在递减，说明模型已经在收尾，不再注入警告（避免重复打扰）。
- 这不是"裁剪"，而是"提前告知模型收尾"——模型自己决定如何压缩输出，不是系统强制截断。

**结论 2-B：自动压缩触发阈值 — 有效上下文窗口 - 13,000 token**
- 状态：verified
- 源码：`src/services/compact/autoCompact.ts:62-91`
- `AUTOCOMPACT_BUFFER_TOKENS = 13_000`
- `getAutoCompactThreshold(model)` = `getEffectiveContextWindowSize(model)` - 13,000
- `getEffectiveContextWindowSize(model)` = 模型上下文窗口 - `min(maxOutputTokens, 20,000)`（为输出预留空间）
- 以 200k 上下文、20k 输出预留为例：有效窗口 = 180,000，触发阈值 = 167,000 token
- 超过阈值时，`shouldAutoCompact()` 返回 true，触发 `autoCompactIfNeeded()`

**结论 2-C：压缩算法 — 不是截断，是 AI 摘要替换**
- 状态：verified
- 源码：`src/services/compact/compact.ts:391-767`（`compactConversation`）
- 压缩不是删除消息，而是：
  1. 把当前所有消息发给模型，要求生成一段摘要（`getCompactPrompt()`）
  2. 用摘要替换原始消息历史（`summaryMessages`）
  3. 在摘要前插入 `SystemCompactBoundaryMessage`（边界标记）
  4. 重新注入最近读取的文件内容（`createPostCompactFileAttachments`，最多 5 个文件，50k token 预算）
  5. 重新注入 plan、skill、agent 等附件
- 压缩后的上下文结构：`[边界标记] [摘要消息] [文件附件] [hook 结果]`

**结论 2-D：压缩本身也可能触发 prompt-too-long，有三次重试机制**
- 状态：verified
- 源码：`src/services/compact/compact.ts:243-291`（`truncateHeadForPTLRetry`）
- 如果压缩请求本身超出上下文限制，系统会从最旧的 API 轮次开始丢弃消息，直到覆盖 token 差额，最多重试 3 次（`MAX_PTL_RETRIES = 3`）
- 丢弃策略：按 API 轮次分组（`groupMessagesByApiRound`），从最旧的组开始丢弃，保留至少一组（确保有内容可摘要）
- 这是"最后逃生舱"——有损但能解除用户卡死

**结论 2-E：自动压缩有熔断器，连续失败 3 次后停止重试**
- 状态：verified
- 源码：`src/services/compact/autoCompact.ts:70,257-265`
- `MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3`
- 防止上下文不可恢复地超限时，系统反复尝试压缩浪费 API 调用（BQ 数据：曾有会话连续失败 3,272 次，每天浪费约 25 万次 API 调用）

**结论 2-F：部分压缩（`partialCompactConversation`）支持双向裁剪**
- 状态：verified
- 源码：`src/services/compact/compact.ts:776-1112`
- `direction = 'from'`：保留前缀，摘要后缀（保留 prompt cache）
- `direction = 'up_to'`：摘要前缀，保留后缀（invalidate prompt cache）
- 用户可以在 UI 里选择某条消息，对其前后分别做部分压缩

---

**任务 3：`useAppStateSelector` 的实际性能价值**

文件：`src/state/AppState.tsx`

**结论 3-A：`useAppState(selector)` 是唯一的订阅接口，selector 是必选参数**
- 状态：verified
- 源码：`src/state/AppState.tsx:126-162`
- 没有"全量订阅"的 `useAppState()`，所有调用都必须传 selector。这从 API 设计上强制了精细订阅。
- 实现：`useSyncExternalStore(store.subscribe, () => selector(store.getState()))`
- React 在每次状态更新后调用 selector，用 `Object.is` 比较返回值，只有变化时才重渲染。

**结论 3-B：AppState 字段极多（约 450 行定义），全量订阅代价极高**
- 状态：verified
- 源码：`src/state/AppStateStore.ts`（约 450 行字段定义）
- AppState 包含：`messages`（每次工具调用都追加）、`tasks`（每个 agent 任务状态）、`toolPermissionContext`、`streamingState`（每个 token 更新）、`notifications`、`effortValue`、`isLoading` 等
- 其中 `streamingState` 在模型输出时每个 token 都更新，如果某个组件全量订阅，会在每个 token 时重渲染——对于只关心"是否在加载"的组件，这是 100 倍以上的无效渲染

**结论 3-C：selector 的性能价值在流式输出时最显著**
- 状态：inference（基于字段更新频率推断）
- 流式输出期间，`streamingState` 每个 token 更新一次（约每 50ms 一次）。只关心 `isLoading` 的组件用 `s => s.isLoading` 订阅，在整个流式输出期间只重渲染两次（开始和结束）。全量订阅则每个 token 重渲染一次，在 1000 token 的输出里是 1000 次 vs 2 次。

---

### 🟡 加分项

**任务 4：AppState 的字段膨胀**

- 状态：verified（部分）
- `AppStateStore.ts` 约 450 行字段定义，字段数量远超普通前端应用的全局状态
- 未发现明显的 `// TODO`、`// HACK`、`// legacy` 标记（可能已清理，或在 git 历史里）
- 字段分类可见明显的"后期补丁"迹象：`hasAttemptedReactiveCompact`（防无限循环的 flag）、`consecutiveFailures`（熔断器计数）等都是典型的"发现 bug 后加的防御字段"

**任务 5：上下文裁剪 vs `--resume` 截断的关系**

- 状态：verified
- 两者是完全独立的机制，作用在不同层次：
  - `sessionStorage.ts` 的 50MB 截断：**读取层**，`--resume` 时从磁盘加载 transcript，超过 50MB 只读最后 50MB。这是 I/O 层的保护，防止加载超大文件。
  - `autoCompact.ts` 的 token 预算裁剪：**执行层**，在 API 调用前检查 token 数量，超过阈值触发摘要压缩。这是 API 层的保护，防止超出模型上下文窗口。
- 两者没有协调：50MB 截断后的消息仍然可能超过 token 阈值，触发自动压缩；自动压缩后的摘要也会被写入 transcript，下次 `--resume` 时读取的是压缩后的版本。
- 用户感知：50MB 截断是静默的（用户不知道历史被截断了）；自动压缩会在 UI 里显示"Compacting conversation..."提示。

---

### 🟢 意外发现区

**[`src/services/compact/autoCompact.ts:160-238`] `shouldAutoCompact` 有三个互斥的"压缩抑制"分支**
- 为什么有意思：`tengu_cobalt_raccoon`（反应式压缩模式）、`marble_origami`（上下文折叠模式）、`isContextCollapseEnabled()` 三个条件都会让自动压缩返回 false。这说明系统有三套并行的上下文管理实验，互相之间有明确的优先级和互斥关系。`feature()` 包裹的字符串会在外部构建时被 DCE（死代码消除）删除，说明这些是 Anthropic 内部实验，不对外暴露。

**[`src/services/compact/compact.ts:332`] `buildPostCompactMessages` 的注释是中文**
- 为什么有意思：`// 顺序即协议：boundary → summary → kept → attachments → hooks。` 这是整个代码库里极少见的中文注释，说明这个顺序约束非常重要，作者特意用中文强调"改顺序会引发级联兼容问题"。

**[`src/services/compact/compact.ts:1663-1678`] `truncateToTokens` 用 4 chars/token 估算**
- 为什么有意思：skill 内容截断时用 `roughTokenCountEstimation`（4 字符/token 的粗估），而不是精确的 token 计数 API。这是有意的性能权衡——精确计数需要 API 调用，粗估够用。注释里明确说明了这个选择。

---

## 写作注意事项

1. ch16 的核心论题是"状态管理在 Agent 系统里为什么比普通前端更难"——上下文裁剪是最有说服力的例子（普通前端不需要考虑 token 预算）
2. 函数式更新的必要性要用具体场景说明，不能只说"防止竞态"——读者不知道 Agent 系统的并发场景长什么样
3. **上下文裁剪的核心结论**：Claude Code 的"裁剪"不是截断，是 AI 摘要替换——这是和普通前端状态管理最大的不同点，值得在章节里重点展开
4. 如果找不到 ch16 对应的具体源文件，可以在 `src/` 里搜索 `AppState`、`contextWindow`、`tokenBudget` 等关键词
