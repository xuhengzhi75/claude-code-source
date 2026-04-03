# ch18 挖掘任务卡：恢复机制

**认领人：** startheart  
**状态：** ✅ 已完成  
**目标章节：** `docs/book/chapters/ch18-恢复机制.md`（当前 105 行）  
**写作规范：** `docs/book-workspace/methodology/writing-principles.md`

---

## 背景与现状

ch18 现有内容质量较高：五层恢复架构（事实恢复、语义修复、压缩后连续性、长期记忆、跨会话整合）逻辑清晰，行号锚点完整。

主要缺口：
1. **`migrateLegacyAttachmentTypes` 的具体迁移内容没有** — 历史上改过哪些字段名？迁移函数里有多少个 case？这能说明系统的演化历史
2. **`isTerminalToolResult` 的判断逻辑没有** — Brief 模式的 `tool_result` 结尾为什么是合法的 turn 终态？这个函数的判断条件是什么？
3. **`autoDream` 的触发阈值具体值没有** — "距上次整理足够久"是多久？"积累了足够的新内容"是多少？

---

## 挖掘任务

### 🔴 必答（ch18 改稿必须覆盖）

**任务 1：`migrateLegacyAttachmentTypes` 的迁移历史**

文件：`src/utils/conversationRecovery.ts`（搜索 `migrateLegacyAttachmentTypes`）

需要挖掘：
- 函数里有多少个迁移 case？每个 case 把什么字段名映射到什么？
- 最早的迁移是什么时候加的？（可以从注释或 git blame 推断）
- 有没有注释说明为什么要改这些字段名？

---

**任务 2：`isTerminalToolResult` 的判断逻辑**

文件：`src/utils/conversationRecovery.ts`（搜索 `isTerminalToolResult`）

需要挖掘：
- 函数的完整实现是什么？
- "Brief 模式的 tool_result 结尾是合法的 turn 终态"——Brief 模式是什么？和普通模式的区别在哪里？
- 如果这个函数判断错误（把中断误判为正常结束），会有什么后果？

---

**任务 3：`autoDream` 的触发阈值**

文件：`src/services/autoDream/autoDream.ts`

需要挖掘：
- 时间阈值：距上次整理多久才触发？
- 数量阈值：积累多少新会话才触发？
- 锁文件路径在哪里？锁的超时是多少？
- 整理失败时的回滚机制是什么？（删除部分写入的文件？还是原子替换？）

---

### 🟡 加分项

**任务 4：`restoreSkillStateFromMessages` 的实现**

文件：`src/utils/conversationRecovery.ts`（搜索 `restoreSkillStateFromMessages`）

- 技能状态是怎么存在 attachment 里的？格式是什么？
- 为什么必须在反序列化前完成？（章节说"否则下次 compact 会遗忘已激活的技能"——具体的因果链是什么？）

---

**任务 5：`buildPostCompactMessages` 的 boundary 消息格式**

文件：`src/services/compact/compact.ts`（`L326-L371`）

- boundary 消息长什么样？（完整的消息结构）
- `annotateCompactBoundary` 在 boundary 上记录了哪些元数据？
- suffix-preserving 和 prefix-preserving 两种模式的区别是什么？什么情况下用哪种？

---

### 🟢 意外发现区

格式：`[文件路径#行号] 发现 + 为什么有意思`

---

## startheart 填写区

### Q1：`migrateLegacyAttachmentTypes` 的迁移历史

**结论**：函数有 3 个迁移 case，覆盖两次字段重命名和一次 `displayPath` 字段的补填。迁移的是 attachment 类型名（`new_file` → `file`，`new_directory` → `directory`）和 `displayPath` 字段的补填（旧版本没有这个字段，从 `filename`/`path`/`skillDir` 推导）。没有注释说明改名原因，但从命名可以推断：去掉 `new_` 前缀是为了让类型名更通用（文件不一定是"新建的"）。

**verified** — 源码锚点：`src/utils/conversationRecovery.ts` L77-L132

```typescript
// L88-L108：两次类型重命名
if (attachment.type === 'new_file') {
  return { ...message, attachment: { ...attachment, type: 'file',
    displayPath: relative(getCwd(), attachment.filename as string) } }
}
if (attachment.type === 'new_directory') {
  return { ...message, attachment: { ...attachment, type: 'directory',
    displayPath: relative(getCwd(), attachment.path as string) } }
}

// L110-L129：displayPath 补填（旧版本没有这个字段）
if (!('displayPath' in attachment)) {
  const path = 'filename' in attachment ? attachment.filename
    : 'path' in attachment ? attachment.path
    : 'skillDir' in attachment ? attachment.skillDir
    : undefined
  if (path) {
    return { ...message, attachment: { ...attachment,
      displayPath: relative(getCwd(), path) } }
  }
}
```

迁移的演化逻辑（inference）：
1. 最早版本：attachment 类型叫 `new_file`/`new_directory`，路径字段叫 `filename`/`path`
2. 中间版本：类型改名为 `file`/`directory`，同时加了 `displayPath` 字段（相对路径，用于 UI 显示）
3. 当前版本：`displayPath` 是必须字段，旧版本的 attachment 在读取时动态补填

这 3 个 case 说明系统至少经历了两次 schema 变更，且每次都选择"读取时迁移"而不是"写入时迁移"——文件系统存储的代价：不能做 schema migration，只能在读取时处理所有历史格式。

---

### Q2：`isTerminalToolResult` 的判断逻辑

**结论**：`isTerminalToolResult` 向前遍历消息链，找到当前 `tool_result` 对应的 `tool_use` 块，检查工具名是否是 `BRIEF_TOOL_NAME`、`LEGACY_BRIEF_TOOL_NAME` 或 `SEND_USER_FILE_TOOL_NAME`。这三个工具是"以 tool_result 结尾的合法 turn 终态"——调用它们就是 turn 的最后一步，不需要后续的 assistant 文本块。

**verified** — 源码锚点：`src/utils/conversationRecovery.ts` L351-L376

```typescript
function isTerminalToolResult(
  result: NormalizedUserMessage,
  messages: NormalizedMessage[],
  resultIdx: number,
): boolean {
  const content = result.message.content
  if (!Array.isArray(content)) return false
  const block = content[0]
  if (block?.type !== 'tool_result') return false
  const toolUseId = block.tool_use_id

  // 向前遍历找到对应的 tool_use
  for (let i = resultIdx - 1; i >= 0; i--) {
    const msg = messages[i]!
    if (msg.type !== 'assistant') continue
    for (const b of msg.message.content) {
      if (b.type === 'tool_use' && b.id === toolUseId) {
        return (
          b.name === BRIEF_TOOL_NAME ||
          b.name === LEGACY_BRIEF_TOOL_NAME ||
          b.name === SEND_USER_FILE_TOOL_NAME
        )
      }
    }
  }
  return false
}
```

Brief 模式是什么（inference）：Brief 模式（`feature('KAIROS')`）是一种精简输出模式，模型调用 `SendUserMessage` 工具把回复发给用户，而不是生成 assistant 文本块。这样 turn 的最后一条消息是 `tool_result`（SendUserMessage 的结果），而不是 assistant 文本。

注释（L314-L319）明确说明了这个 bug 的历史：
> "Brief mode (#20467) drops the trailing assistant text block, so a completed brief-mode turn legitimately ends on SendUserMessage's tool_result. Without this check, resume misclassifies every brief-mode session as interrupted mid-turn and injects a phantom 'Continue from where you left off.' before the user's real next prompt."

误判的后果：如果把正常结束的 brief-mode turn 误判为中断，系统会注入 `"Continue from where you left off."` 元消息，模型会重新执行已经完成的操作，导致重复执行。

三个工具名都是 feature-gated（`src/utils/conversationRecovery.ts` L55-L70）：
- `BRIEF_TOOL_NAME`：`feature('KAIROS')` 时从 KAIROS 模块加载
- `LEGACY_BRIEF_TOOL_NAME`：同上，向后兼容旧名称
- `SEND_USER_FILE_TOOL_NAME`：同上，文件发送工具

---

### Q3：`autoDream` 的触发阈值

**结论**：默认阈值是 `minHours: 24`（24小时）和 `minSessions: 5`（5个新会话）。两个条件都满足才触发。阈值可以通过 GrowthBook 的 `tengu_onyx_plover` 配置动态调整。锁文件是 `{memoryDir}/.consolidate-lock`，锁的超时是 `HOLDER_STALE_MS = 60 * 60 * 1000`（1小时）。失败时回滚机制是**重置锁文件的 mtime**（不是删除文件），让时间门重新打开。

**verified** — 源码锚点：`src/services/autoDream/autoDream.ts` L56-L100；`src/services/autoDream/consolidationLock.ts` L16-L108

```typescript
// autoDream.ts L63-L66：默认阈值
const DEFAULTS: AutoDreamConfig = {
  minHours: 24,
  minSessions: 5,
}
```

触发门控顺序（"先便宜后昂贵"）：
1. **时间门**（最便宜：一次 `stat`）：`(Date.now() - lastConsolidatedAt) / 3_600_000 >= minHours`
2. **扫描节流**（防止时间门通过但会话门不通过时每轮都扫描）：`sinceScanMs >= SESSION_SCAN_INTERVAL_MS`（10分钟）
3. **会话门**（需要 `readdir` + 多次 `stat`）：`sessionIds.length >= minSessions`（排除当前会话）
4. **锁门**（最昂贵：文件读写 + PID 检查）：`tryAcquireConsolidationLock()` 返回非 null

锁文件的精妙设计（`consolidationLock.ts`）：
- 锁文件的 **mtime 就是 `lastConsolidatedAt`**，一个文件同时承担两个职责：锁 + 时间戳
- 锁文件内容是持锁进程的 PID，用于检测死锁（进程已死但锁文件还在）
- `HOLDER_STALE_MS = 1小时`：即使 PID 还活着，超过 1 小时也认为是 PID 重用，强制回收锁
- 竞态处理：两个进程同时写 PID，最后写入的赢，输家在 re-read 时发现 PID 不是自己，返回 null

失败回滚机制（`rollbackConsolidationLock`）：
- 不删除锁文件，而是把 mtime 回退到 `priorMtime`（获取锁之前的时间戳）
- 这样时间门在下次检查时仍然通过，但扫描节流（10分钟）提供退避
- 如果 `priorMtime === 0`（首次运行，没有锁文件），则删除锁文件

---

### Q4：`restoreSkillStateFromMessages` 的实现

**结论**：函数遍历消息列表，找到 `invoked_skills` 类型的 attachment，把其中的技能逐一调用 `addInvokedSkill` 恢复到进程内存（`STATE.invokedSkills`）。同时处理 `skill_listing` attachment，调用 `suppressNextSkillListing()` 防止下次 compact 时重复发送技能列表（约 600 tokens）。

**verified** — 源码锚点：`src/utils/conversationRecovery.ts` L385-L408

```typescript
export function restoreSkillStateFromMessages(messages: Message[]): void {
  for (const message of messages) {
    if (message.type !== 'attachment') continue
    if (message.attachment.type === 'invoked_skills') {
      for (const skill of message.attachment.skills) {
        if (skill.name && skill.path && skill.content) {
          addInvokedSkill(skill.name, skill.path, skill.content, null)
        }
      }
    }
    // 防止重复发送技能列表（约 600 tokens）
    if (message.attachment.type === 'skill_listing') {
      suppressNextSkillListing()
    }
  }
}
```

为什么必须在反序列化前完成（注释 L386-L388）：
> "This ensures that skills are preserved across resume after compaction. Without this, if another compaction happens after resume, the skills would be lost because STATE.invokedSkills would be empty."

因果链：
1. 用户 resume 会话，`restoreSkillStateFromMessages` 从 attachment 回放技能到 `STATE.invokedSkills`
2. 会话继续，上下文增长，触发 compact
3. compact 时，系统把 `STATE.invokedSkills` 里的技能写入新的 `invoked_skills` attachment
4. 如果第 1 步没有执行，`STATE.invokedSkills` 为空，compact 后技能 attachment 也为空，技能永久丢失

---

### 意外发现

**`autoDream` 的 `isForced()` 函数**（`autoDream.ts` L102-L107）：
```typescript
// Ant-build-only test override. Bypasses enabled/time/session gates but NOT
// the lock (so repeated turns don't pile up dreams) or the memory-dir
// precondition.
function isForced(): boolean {
  return false
}
```
这个函数永远返回 false，但注释说明它是"ant-build-only test override"。这意味着在 ant 内部构建中，这个函数可能被替换为返回 true 的版本，用于测试。这是一种"编译时注入"的测试机制，不通过环境变量，而是直接替换函数实现。

**锁文件 mtime 双重职责**（`consolidationLock.ts` L1-L3）：
> "Lock file whose mtime IS lastConsolidatedAt. Body is the holder's PID."

一个文件同时承担锁和时间戳两个职责，是零依赖方案的极致：不需要额外的 `lastConsolidatedAt` 文件，mtime 本身就是时间戳。代价是：如果文件系统不保证 mtime 精度（某些 NFS 挂载），时间门可能失效。

**`SESSION_SCAN_INTERVAL_MS = 10分钟` 的扫描节流**（`autoDream.ts` L56）：
时间门通过但会话门不通过时，如果没有节流，每次 turn 结束都会触发一次 `readdir` + 多次 `stat`（扫描所有会话文件）。10分钟节流把这个开销从"每轮"降到"每10分钟最多一次"。注释说明这是"per-turn cost when enabled: one GB cache read + one stat"——正常情况下只有一次 stat（读锁文件 mtime），扫描是额外开销。

**`migrateLegacyAttachmentTypes` 的 `displayPath` 补填支持三种字段名**（`conversationRecovery.ts` L113-L119）：
```typescript
const path =
  'filename' in attachment ? attachment.filename
  : 'path' in attachment ? attachment.path
  : 'skillDir' in attachment ? attachment.skillDir
  : undefined
```
三种字段名（`filename`/`path`/`skillDir`）对应三种不同类型的 attachment（文件、目录、技能），说明 `displayPath` 字段是在这三种类型都已存在之后才统一加入的。这是一次横切多个类型的 schema 变更，迁移函数需要处理所有历史变体。
