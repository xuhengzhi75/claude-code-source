# ch15 挖掘任务卡：提示词是工程产物

## 任务背景

ch15 已有完整初稿，但部分细节需要源码验证或补充。本卡聚焦三个关键点：
1. `undercover.ts` 的精确触发逻辑（章节描述有偏差）
2. `userPromptKeywords.ts` 的实际内容（章节只提到"骂人检测"，实际有两个函数）
3. `getOutputEfficiencySection()` 内外部用户的实际差异（章节描述准确但不完整）

---

## Q1：undercover.ts 的精确触发逻辑

### 章节原文描述

> 触发条件：当前用户类型是 `ant`（Anthropic 内部员工），且 git 远程仓库不在内部白名单里。满足这两个条件，卧底模式自动开启，没有强制关闭选项。

### 源码验证结论

**[verified: src/utils/undercover.ts L1-89]**

章节描述基本准确，但有两处需要补充：

**1. 有强制开启选项（`CLAUDE_CODE_UNDERCOVER=1`），但确实没有强制关闭选项**

```typescript
export function isUndercover(): boolean {
  if (process.env.USER_TYPE === 'ant') {
    if (isEnvTruthy(process.env.CLAUDE_CODE_UNDERCOVER)) return true
    // Auto: active unless we've positively confirmed we're in an allowlisted
    // internal repo. 'external', 'none', and null (check not yet run) all
    // resolve to ON. The check is primed in setup.ts; only 'internal' → OFF.
    return getRepoClassCached() !== 'internal'
  }
  return false
}
```

关键设计：`getRepoClassCached()` 返回值有四种：`'internal'`、`'external'`、`'none'`、`null`（检查尚未运行）。只有明确返回 `'internal'` 才关闭卧底模式，其余三种（包括"还不知道"的 null）都默认开启。这是 fail-safe 设计：宁可在内部仓库里多一层保护，也不能在外部仓库里漏掉保护。

**2. 外部构建中整个文件被 dead-code elimination 消除**

文件头注释明确说明：`USER_TYPE` 是 build-time `--define`，bundler 会常量折叠这些检查，在外部构建中所有函数都 reduce 到 trivial return。这意味着卧底模式的代码在外部发布版本里根本不存在。

**3. 有一次性提示对话框（`shouldShowUndercoverAutoNotice`）**

```typescript
export function shouldShowUndercoverAutoNotice(): boolean {
  if (process.env.USER_TYPE === 'ant') {
    if (isEnvTruthy(process.env.CLAUDE_CODE_UNDERCOVER)) return false  // 强制开启时不提示
    if (!isUndercover()) return false
    if (getGlobalConfig().hasSeenUndercoverAutoNotice) return false
    return true
  }
  return false
}
```

自动检测触发时，会弹一次提示对话框告知用户。强制通过环境变量开启时不弹（用户已知情）。

**4. 禁止内容的完整清单（章节描述准确）**

```
NEVER include in commit messages or PR descriptions:
- Internal model codenames (animal names like Capybara, Tengu, etc.)
- Unreleased model version numbers (e.g., opus-4-7, sonnet-4-8)
- Internal repo or project names (e.g., claude-cli-internal, anthropics/…)
- Internal tooling, Slack channels, or short links (e.g., go/cc, #claude-code-…)
- The phrase "Claude Code" or any mention that you are an AI
- Any hint of what model or version you are
- Co-Authored-By lines or any other attribution
```

---

## Q2：userPromptKeywords.ts 的实际内容

### 章节原文描述

> `utils/userPromptKeywords.ts` 只有 26 行，在每条用户输入发送到 API 之前，用两组正则表达式检测用户是否在骂人。这不是内容审核，是用来判断用户体验是否良好的质量信号。

### 源码验证结论

**[verified: src/utils/userPromptKeywords.ts L1-27]**

章节描述有偏差：文件实际有**两个函数**，不只是"骂人检测"：

**函数一：`matchesNegativeKeyword`（负面情绪检测）**

```typescript
export function matchesNegativeKeyword(input: string): boolean {
  const negativePattern =
    /\b(wtf|wth|ffs|omfg|shit(ty|tiest)?|dumbass|horrible|awful|piss(ed|ing)? off|piece of (shit|crap|junk)|what the (fuck|hell)|fucking? (broken|useless|terrible|awful|horrible)|fuck you|screw (this|you)|so frustrating|this sucks|damn it)\b/
  return negativePattern.test(lowerInput)
}
```

这是章节描述的"骂人检测"，用于质量信号。

**函数二：`matchesKeepGoingKeyword`（继续指令检测）**

```typescript
export function matchesKeepGoingKeyword(input: string): boolean {
  const lowerInput = input.toLowerCase().trim()
  // Match "continue" only if it's the entire prompt
  if (lowerInput === 'continue') return true
  // Match "keep going" or "go on" anywhere in the input
  const keepGoingPattern = /\b(keep going|go on)\b/
  return keepGoingPattern.test(lowerInput)
}
```

这个函数检测用户是否在说"继续"/"keep going"/"go on"，用于触发 Agent 继续执行。注意 `continue` 只在**整条消息就是这个词**时才匹配（防止误触发），而 `keep going` 和 `go on` 可以出现在消息任意位置。

**章节需要修正**：文件不只是"骂人检测"，还有"继续指令检测"，两者服务于完全不同的目的。

---

## Q3：getOutputEfficiencySection() 内外部用户的实际差异

### 章节原文描述

> 外部用户版本的核心词是"极简"：直接给答案，跳过推理，不要铺垫，不要过渡。内部用户版本的核心是"写给人看的散文"：倒金字塔结构、语义回溯、避免过度使用破折号和符号。

### 源码验证结论

**[verified: src/constants/prompts.ts L402-428]**

章节描述准确，但有一个重要细节未提及：

**函数头有 `@[MODEL LAUNCH]` 标记**

```typescript
// @[MODEL LAUNCH]: Remove this section when we launch numbat.
function getOutputEfficiencySection(): string {
```

这个函数整体是针对 "numbat"（下一个模型版本代号）的临时补丁，计划在 numbat 发布时移除。说明当前的内外部差异化输出策略本身也是版本补丁，不是永久设计。

**内部用户版本的完整指令（比章节描述更丰富）**

```
When sending user-facing text, you're writing for a person, not logging to a console.
Assume users can't see most tool calls or thinking - only your text output.
Before your first tool call, briefly state what you're about to do.
While working, give short updates at key moments: when you find something load-bearing
(a bug, a root cause), when changing direction, when you've made progress without an update.
```

内部版本不只是"倒金字塔+语义回溯"，还包含：
- 假设用户看不到工具调用，只看文字输出
- 第一次工具调用前要简短说明要做什么
- 在关键节点（发现 bug、改变方向、有进展时）给出简短更新

**外部用户版本的完整指令**

```
IMPORTANT: Go straight to the point. Try the simplest approach first without going in circles.
Do not overdo it. Be extra concise.
Keep your text output brief and direct. Lead with the answer or action, not the reasoning.
Skip filler words, preamble, and unnecessary transitions.
Do not restate what the user said — just do it.
```

---

## Q4：SYSTEM_PROMPT_DYNAMIC_BOUNDARY 的精确实现

**[verified: src/constants/prompts.ts L105-115]**

章节描述准确。边界标记的实际值是字符串 `'__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__'`，注释明确警告不要在不同步更新两处下游的情况下移动这个边界：
- `src/utils/api.ts` 的 `splitSysPromptPrefix`
- `src/services/api/claude.ts` 的 `buildSystemPromptBlocks`

边界标记只在 `shouldUseGlobalCacheScope()` 返回 true 时才注入（`...(shouldUseGlobalCacheScope() ? [SYSTEM_PROMPT_DYNAMIC_BOUNDARY] : [])`），说明全局缓存是可选的，不是所有部署都启用。

---

## Q5：getSystemPrompt() 的 PROACTIVE/KAIROS 快速路径

**[verified: src/constants/prompts.ts L466-489]**

章节未提及的重要细节：当 PROACTIVE 或 KAIROS feature flag 开启且 proactive 模式激活时，`getSystemPrompt()` 走完全不同的快速路径：

```typescript
if (
  (feature('PROACTIVE') || feature('KAIROS')) &&
  proactiveModule?.isProactiveActive()
) {
  return [
    `\nYou are an autonomous agent. Use the available tools to do useful work.\n\n${CYBER_RISK_INSTRUCTION}`,
    getSystemRemindersSection(),
    await loadMemoryPrompt(),
    envInfo,
    getLanguageSection(settings.language),
    isMcpInstructionsDeltaEnabled() ? null : getMcpInstructionsSection(mcpClients),
    getScratchpadInstructions(),
    getFunctionResultClearingSection(model),
    SUMMARIZE_TOOL_RESULTS_SECTION,
    getProactiveSection(),
  ].filter(s => s !== null)
}
```

自主 Agent 模式下，整个常规系统提示词（做任务、工具使用、输出风格等）都被跳过，替换为极简的"你是自主 Agent"开头 + `CYBER_RISK_INSTRUCTION` + `getProactiveSection()`。这是两套完全不同的提示词体系，不是在常规提示词上叠加。

---

## 写作建议

1. **修正 userPromptKeywords.ts 描述**：补充 `matchesKeepGoingKeyword` 函数，说明文件有两个用途不同的函数
2. **补充 undercover 的 fail-safe 设计**：强调 `null`/`'none'`/`'external'` 都默认开启，只有明确 `'internal'` 才关闭
3. **补充 getOutputEfficiencySection 的 `@[MODEL LAUNCH]` 标记**：整个函数本身也是版本补丁
4. **可选补充**：PROACTIVE/KAIROS 快速路径说明自主 Agent 模式是完全不同的提示词体系
