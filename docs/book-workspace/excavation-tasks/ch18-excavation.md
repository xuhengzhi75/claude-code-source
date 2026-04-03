# ch18 挖掘任务卡：恢复机制

**认领人：** 待认领  
**状态：** 待认领  
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

（待填写）
