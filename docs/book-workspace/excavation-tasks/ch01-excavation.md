# ch01 挖掘任务卡：不只是聊天工具

**认领人：** startheart  
**状态：** 待认领  
**目标章节：** `docs/book/chapters/ch01-不只是聊天工具.md`（当前 71 行）  
**写作规范：** `docs/book-workspace/methodology/writing-principles.md`

---

## 背景与现状

ch01 是全书开篇，已有 `QueryEngine.ts#L443` 的 bug 修复历史（先落盘再执行）和文件系统 vs 数据库的选型论证，逻辑清晰。

但两处不足：
1. **JSONL 格式本身没有被解释** — 为什么是逐行 JSON，不是单个 JSON 文件？这个格式选择和"进程随时会死"的核心论题直接相关
2. **`getLastSessionLog` 的过滤逻辑没有交代** — ch01 1.4 节提到"queue-operation 条目不算消息"，但没有说清楚这是怎么实现的，读者不知道这个过滤在代码的哪里

---

## 挖掘任务

### 🔴 必答（ch01 改稿必须覆盖）

**任务 1：JSONL 格式的选型原因**

文件：`src/utils/sessionStorage.ts`

- `L204`：`getTranscriptPath()` 返回 `${sessionId}.jsonl`
- `L227-L230`：50 MB 读取上限注释（`// 50 MB — session JSONL can grow to multiple GB (inc-3930)`）

需要挖掘的问题：
- JSONL（逐行 JSON）vs 单个 JSON 文件，区别是什么？为什么 JSONL 更适合"进程随时会死"的场景？
- 注释提到 session JSONL 可能增长到 multiple GB，50MB 上限如何影响 `--resume` 行为？
- 是否有证据显示这是一个有意识的设计决策（注释/提交历史）？

**格式要求：** 结论 + verified/inference 标注 + 源码行号

---

**任务 2：`getLastSessionLog` 的 queue-operation 过滤**

文件：`src/utils/sessionStorage.ts`，函数 `getLastSessionLog`（`L3869`）

当前 ch01 1.4 节提到：`getLastSessionLog filters those out, returns null`。但"过滤"的具体逻辑在哪里没有说清楚。

需要挖掘的问题：
- `getLastSessionLog`（`L3869-L3920`）的调用链：它调用 `loadSessionFile` → `findLatestMessage` → `buildConversationChain`，最终找不到消息时返回 null
- `queue-operation` 类型的条目在写入时就被分流了（`L1218`：queue-operation 走 `enqueueWrite`），那么消息集合里是否根本就没有这些条目？
- 还是说 `messages.size === 0`（`L3886`）是触发 null 的真正条件——意味着 JSONL 里有内容，但没有任何 user/assistant 类型的消息？

找清楚返回 null 的**精确路径**，用伪代码或流程描述写出来。

---

### 🟡 加分项（有就补，没有不影响改稿）

**任务 3：`--resume` 的完整数据流**

从用户运行 `claude --resume` 到系统找到（或找不到）对话，完整路径是什么？涉及哪些函数？目标是让读者能在脑子里走一遍这个流程。

关注点：
- `getLastSessionLog` 的缓存预热（`L3889-L3898`）：为什么要预热？注释说节省了 170-227ms，这个数字有没有量化来源（inc- 编号）？
- `--resume` 失败时的错误信息是什么？是直接来自 `getLastSessionLog` 返回 null，还是有额外的错误包装？

---

**任务 4：JSONL append-only 和恢复的关系**

`sessionStorage.ts#L1963` 注释提到：`The JSONL is append-only, so removed messages stay on disk`。

这个 append-only 特性和"进程随时会死"的设计假设有什么关系？append-only 是主动选择，还是 JSONL 格式的自然结果？如果是主动选择，有没有注释或提交历史证明？

---

### 🟢 意外发现区

如果在挖掘过程中发现了和 ch01 核心论题（"进程会死"这个假设）相关的其他有趣细节，请记录在这里。

格式：`[行号] 发现 + 为什么有意思`

---

## 写作注意事项

1. ch01 是全书开篇，读者还不知道 `QueryLoop`、`TaskSystem` 等后续章节的内容，**不要引入后续章节的概念**
2. `getLastSessionLog` 的过滤逻辑较复杂，写作时用**反向叙事**效果更好：先说"用户 --resume 失败看到了什么"，再解释"为什么 JSONL 里有内容但找不到消息"
3. JSONL 格式的选型解释，和"进程会死"的主论题要明确对应上，不要写成孤立的技术细节
