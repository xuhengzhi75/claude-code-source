# ch17 挖掘任务卡：任务推进

**认领人：** 待认领  
**状态：** 待认领  
**目标章节：** `docs/book/chapters/ch17-任务推进.md`（当前 167 行）  
**写作规范：** `docs/book-workspace/methodology/writing-principles.md`

---

## 背景与现状

ch17 现有内容质量较高：原子化认领、双向阻塞图、高水位标记、宕机归还、通知隔离，逻辑清晰，行号锚点完整。

主要缺口：
1. **`LOCK_OPTIONS` 的具体参数值没有** — 章节提到"retries=30 给了约 2.6s 总等待时间"，但没有展示完整的 `LOCK_OPTIONS` 配置，也没有说明 `stale` 超时（锁文件多久算过期）
2. **`enqueuePendingNotification` 的跨 Agent 通知机制没有深挖** — 通知是怎么被"注入下一次迭代的 tool results"的？具体的数据流是什么？
3. **`taskSummaryModule.maybeGenerateTaskSummary()` 的触发条件和内容格式** — 什么时候生成摘要？摘要长什么样？

---

## 挖掘任务

### 🔴 必答（ch17 改稿必须覆盖）

**任务 1：`LOCK_OPTIONS` 完整配置**

文件：`src/utils/tasks.ts`（搜索 `LOCK_OPTIONS`）

需要挖掘：
- `retries`、`retryWait`、`stale` 的具体值
- `stale` 超时的含义：锁文件多久没有更新就认为持锁进程已死？这个值和 Agent 宕机检测有什么关系？
- 注释里有没有解释为什么选这些参数值？

---

**任务 2：跨 Agent 通知的完整数据流**

文件：`src/utils/tasks.ts`（`enqueuePendingNotification`）、`src/query.ts`（`L1577` 附近）

已知：通知用 XML 格式，被注入下一次迭代的 tool results。

需要挖掘：
- `enqueuePendingNotification` 把通知写到哪里？（文件？内存队列？）
- 主循环在哪里读取这些通知并注入 tool results？具体的注入点是哪一行？
- 通知的 XML 格式是固定的还是动态生成的？有没有 schema 定义？

---

### 🟡 加分项

**任务 3：`maybeGenerateTaskSummary` 的触发条件和摘要格式**

文件：`src/utils/task/` 目录下（搜索 `maybeGenerateTaskSummary`）

- 什么条件触发摘要生成？（任务完成？token 阈值？）
- 摘要写到哪里？格式是什么？
- 摘要和 `diskOutput.ts` 的 output 文件有什么关系？

---

**任务 4：`getTaskOutputDelta` 的字节偏移实现**

文件：`src/utils/task/diskOutput.ts`

- 字节偏移是怎么持久化的？（存在哪里？）
- 如果 output 文件被截断或损坏，偏移读取会怎么处理？

---

### 🟢 意外发现区

格式：`[文件路径#行号] 发现 + 为什么有意思`

---

## startheart 填写区

（待填写）
