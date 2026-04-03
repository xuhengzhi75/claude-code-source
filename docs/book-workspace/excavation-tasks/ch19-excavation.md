# ch19 挖掘任务卡：提示词工程设计模式

## 任务背景

ch19 已有完整初稿，覆盖 11 个设计模式。本卡聚焦四个需要源码精确验证的点：
1. `outputStyles.ts` 优先级链的精确顺序（章节描述有一处错误）
2. `getProactiveSection()` 的完整内容（章节描述准确但不完整）
3. `TOKEN_BUDGET` 的缓存策略变更历史（章节未提及）
4. `verificationAgent.ts` 的触发条件（章节未提及 feature flag 门控）

---

## Q1：outputStyles.ts 优先级链的精确顺序

### 章节原文描述

> 优先级从低到高：built-in < plugin < user < project < managed

```typescript
const styleGroups = [pluginStyles, userStyles, projectStyles, managedStyles]
```

### 源码验证结论

**[verified: src/constants/outputStyles.ts L137-175]**

章节描述有一处错误：**优先级顺序是 built-in < plugin < user < project < managed，但 managed 对应的是 `policySettings`（企业策略），不是 `managedStyles` 这个变量名暗示的"managed"**。

实际代码：

```typescript
const managedStyles = customStyles.filter(
  style => style.source === 'policySettings',
)
const userStyles = customStyles.filter(
  style => style.source === 'userSettings',
)
const projectStyles = customStyles.filter(
  style => style.source === 'projectSettings',
)

// Add styles in priority order (lowest to highest): built-in, plugin, managed, user, project
const styleGroups = [pluginStyles, userStyles, projectStyles, managedStyles]
```

**注意：注释里写的顺序是 `built-in, plugin, managed, user, project`，但代码里 `styleGroups` 数组的顺序是 `[pluginStyles, userStyles, projectStyles, managedStyles]`。**

由于后面的覆盖前面的（高优先级覆盖低优先级），数组最后的 `managedStyles` 优先级最高，这与注释一致。但注释里的顺序（`plugin, managed, user, project`）和代码里数组的顺序（`plugin, user, project, managed`）不同——注释是按优先级从低到高排列，代码数组是按覆盖顺序排列（后覆盖前）。

**实际优先级从低到高：built-in → plugin → user → project → managed(policySettings)**

章节描述的顺序是正确的，但需要说明 `managed` 对应的是 `policySettings`（企业管理员配置），不是一个独立的 source 类型。

**另一个重要细节：plugin 的强制覆盖机制**

```typescript
const forcedStyles = Object.values(allStyles).filter(
  (style): style is OutputStyleConfig =>
    style !== null &&
    style.source === 'plugin' &&
    style.forceForPlugin === true,
)

const firstForcedStyle = forcedStyles[0]
if (firstForcedStyle) {
  // 直接返回，跳过所有优先级逻辑
  return firstForcedStyle
}
```

Plugin 可以通过 `forceForPlugin: true` 强制激活自己的 output style，完全绕过优先级链。多个 plugin 都设置了 `forceForPlugin` 时，只用第一个，并打 warn 日志。这个机制章节未提及。

---

## Q2：getProactiveSection() 的完整内容

### 章节原文描述

章节描述了 `terminalFocus` 信号、SleepTool 强制调用、缓存 5 分钟过期约束。

### 源码验证结论

**[verified: src/constants/prompts.ts L860-913]**

章节描述准确，但有几个重要细节未提及：

**1. 函数的 feature flag 门控**

```typescript
function getProactiveSection(): string | null {
  if (!(feature('PROACTIVE') || feature('KAIROS'))) return null
  if (!proactiveModule?.isProactiveActive()) return null
  // ...
}
```

只有 `PROACTIVE` 或 `KAIROS` feature flag 开启，且 proactive 模式当前激活时才返回内容。

**2. tick 机制的完整描述**

```
You are running autonomously. You will receive `<tick>` prompts that keep you alive
between turns — just treat them as "you're awake, what now?" The time in each `<tick>`
is the user's current local time. Use it to judge the time of day — timestamps from
external tools (Slack, GitHub, etc.) may be in a different timezone.

Multiple ticks may be batched into a single message. This is normal — just process
the latest one. Never echo or repeat tick content in your response.
```

章节未提及：多个 tick 可能被批量合并进一条消息，只处理最新的那个；不要在回复里重复 tick 内容。

**3. 第一次唤醒的特殊行为**

```
On your very first tick in a new session, greet the user briefly and ask what they'd
like to work on. Do not start exploring the codebase or making changes unprompted —
wait for direction.
```

第一次唤醒时不能自主行动，必须等用户给方向。这是防止 Agent 在用户还没说要做什么时就开始乱动的约束。

**4. "好同事"类比**

```
Look for useful work. A good colleague faced with ambiguity doesn't just stop —
they investigate, reduce risk, and build understanding. Ask yourself: what don't I
know yet? What could go wrong? What would I want to verify before calling this done?
```

用"好同事"类比来定义 Agent 在有歧义时的行为标准：不停下来，而是主动调查、降低风险、建立理解。

**5. BRIEF_PROACTIVE_SECTION 的条件注入**

```typescript
return `...${BRIEF_PROACTIVE_SECTION && briefToolModule?.isBriefEnabled() ? `\n\n${BRIEF_PROACTIVE_SECTION}` : ''}`
```

如果 KAIROS_BRIEF feature 开启且 brief 模式激活，`getProactiveSection()` 会在末尾追加 brief 相关指令。这是两个 feature 的交叉点。

---

## Q3：TOKEN_BUDGET 的缓存策略变更历史

### 章节原文描述

章节只描述了 TOKEN_BUDGET 的行为语义（"hard minimum, not a suggestion"），未提及缓存策略。

### 源码验证结论

**[verified: src/constants/prompts.ts L538-551]**

TOKEN_BUDGET 节有一段重要的注释，记录了缓存策略的变更历史：

```typescript
...(feature('TOKEN_BUDGET')
  ? [
      // Cached unconditionally — the "When the user specifies..." phrasing
      // makes it a no-op with no budget active. Was DANGEROUS_uncached
      // (toggled on getCurrentTurnTokenBudget()), busting ~20K tokens per
      // budget flip. Not moved to a tail attachment: first-response and
      // budget-continuation paths don't see attachments (#21577).
      systemPromptSection(
        'token_budget',
        () => 'When the user specifies a token target...',
      ),
    ]
  : []),
```

**关键历史**：TOKEN_BUDGET 节曾经是 `DANGEROUS_uncachedSystemPromptSection`（每轮重算），因为它需要根据 `getCurrentTurnTokenBudget()` 的值动态变化。但这导致每次 budget 状态切换都会破坏约 20K token 的缓存（`busting ~20K tokens per budget flip`）。

**解决方案**：把指令措辞改成"当用户指定 token 目标时..."，这样即使没有 budget 激活，这段指令也是 no-op（无操作），可以无条件缓存。用措辞设计消除了动态性，把 `DANGEROUS_` 节变回了普通缓存节。

这是模式一（两级缓存节）的反向应用：不是把动态内容移到边界后，而是通过改写措辞消除动态性，让内容可以无条件缓存。

**为什么不移到 tail attachment**：注释说明了原因——first-response 和 budget-continuation 路径看不到 attachments（issue #21577），所以必须留在 system prompt 里。

---

## Q4：verificationAgent 的触发条件（章节未提及）

### 源码验证结论

**[verified: src/constants/prompts.ts L390-395]**

章节描述了 verificationAgent 的提示词设计，但未提及它的触发条件：

```typescript
hasAgentTool &&
feature('VERIFICATION_AGENT') &&
// 3P default: false — verification agent is ant-only A/B
getFeatureValue_CACHED_MAY_BE_STALE('tengu_hive_evidence', false)
  ? `The contract: when non-trivial implementation happens on your turn, independent
     adversarial verification must happen before you report completion...`
  : null,
```

触发条件是三重门控：
1. `hasAgentTool`：必须有 Agent 工具可用
2. `feature('VERIFICATION_AGENT')`：feature flag 开启
3. `getFeatureValue_CACHED_MAY_BE_STALE('tengu_hive_evidence', false)`：`tengu_hive_evidence` 实验值为 true（默认 false，注释说明是 ant-only A/B 测试）

"non-trivial" 的定义在指令里：3+ 个文件编辑、后端/API 变更、或基础设施变更。

**`_CACHED_MAY_BE_STALE` 后缀**是一个命名约定，说明这个 feature value 可能是缓存的旧值，不保证实时性。这是在 system prompt 构建路径上避免异步调用的权衡。

---

## Q5：numeric_length_anchors 的精确内容

**[verified: src/constants/prompts.ts L527-536]**

章节描述准确。实际指令内容：

```
Length limits: keep text between tool calls to ≤25 words. Keep final responses to
≤100 words unless the task requires more detail.
```

两个数字锚点：工具调用之间的文字 ≤25 词，最终回复 ≤100 词（除非任务需要更多细节）。注释确认是 A/B 测试结果（~1.2% output token reduction），ant-only 先测质量影响。

---

## Q6：getSimpleDoingTasksSection() 的 @[MODEL LAUNCH] 标记数量

**[verified: src/constants/prompts.ts L199-253]**

章节提到"同一节里还有针对 Capybara v8 过度注释问题的专项指令"，实际上这一节有**三个** `@[MODEL LAUNCH]` 标记：

1. **L204**：`@[MODEL LAUNCH]: Update comment writing for Capybara` — 注释写作规范（过度注释问题）
2. **L210**：`@[MODEL LAUNCH]: capy v8 thoroughness counterweight (PR #24302)` — 任务完成前验证（彻底性反制）
3. **L224**：`@[MODEL LAUNCH]: capy v8 assertiveness counterweight (PR #24302)` — 主动指出问题（assertiveness 反制）
4. **L237**：`@[MODEL LAUNCH]: False-claims mitigation for Capybara v8 (29-30% FC rate vs v4's 16.7%)` — 虚假声明缓解

实际上是**四个**标记，全部针对 Capybara v8 的不同行为缺陷，全部是 ant-only（`process.env.USER_TYPE === 'ant'` 门控）。

---

## 写作建议

1. **修正 outputStyles 优先级链描述**：补充 plugin 的 `forceForPlugin` 强制覆盖机制，说明它完全绕过优先级链
2. **补充 getProactiveSection 的 tick 批量合并细节**：多个 tick 合并时只处理最新的
3. **补充 TOKEN_BUDGET 的缓存策略变更历史**：这是模式一（两级缓存节）的反向应用案例，通过措辞设计消除动态性
4. **修正 @[MODEL LAUNCH] 标记数量**：getSimpleDoingTasksSection 里有四个标记，不是一个
5. **可选补充**：verificationAgent 的三重门控条件，以及 `_CACHED_MAY_BE_STALE` 命名约定
