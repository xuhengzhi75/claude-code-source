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

## startheart 填写区

### Q1：JSONL 格式的选型原因

**结论**：JSONL 是有意识的设计决策，不是偶然选择。核心原因是 append-only 写入语义——每条消息独立追加到文件末尾，进程在任何时刻被杀，已写入的行都是完整的、可解析的。单个 JSON 文件需要在写入时持有整个文件的锁并重写全部内容，进程被杀会留下损坏的 JSON；JSONL 的每次写入是原子的（单行 append），不会损坏已有内容。

**verified** — 源码锚点：`src/utils/sessionStorage.ts` L1963-L1974（append-only 注释），L225-L227（50MB 上限注释），L202-L204（`.jsonl` 扩展名）

关键注释原文（L1963）："The JSONL is append-only, so removed messages stay on disk"——这句话同时说明了两件事：(1) JSONL 是 append-only 的；(2) 这个特性意味着"删除"操作不会真正删除磁盘上的内容，只是在内存中过滤。

50MB 上限的影响（L225-L227）：
- `MAX_TRANSCRIPT_READ_BYTES = 50 * 1024 * 1024`
- 注释说"session JSONL can grow to multiple GB (inc-3930)"
- 超过 50MB 时，读取路径会截断，只读取最后 50MB（尾部扫描）
- 这意味着 `--resume` 时只能恢复最近的对话，非常长的会话的早期历史会被截断

另一处 50MB 注释（L121-L123）是 tombstone 重写路径的上限，防止 OOM——说明 JSONL 文件可能大到需要专门的内存保护。

---

### Q2：`getLastSessionLog` 的 queue-operation 过滤

**结论**：`queue-operation` 类型的条目在写入时就被分流到 `enqueueWrite`（L1216-L1218），但它们仍然会被写入 JSONL 文件。关键在于 `loadTranscriptFile` 的解析逻辑：只有通过 `isTranscriptMessage(entry)` 检查的条目（type 为 user/assistant/attachment/system）才会被加入 `messages` Map。`queue-operation` 不在这个类型集合里，所以读取时被静默跳过，根本不进入 `messages` Map。`getLastSessionLog` 返回 null 的精确路径是 `messages.size === 0`（L3890）。

**verified** — 源码锚点：`src/utils/sessionStorage.ts` L139-L146（`isTranscriptMessage`），L1216-L1218（写入分流），L3629-L3650（`loadTranscriptFile` 解析循环），L3873-L3905（`getLastSessionLog`）

返回 null 的精确路径（伪代码）：
```
getLastSessionLog(sessionId)
  → loadSessionFile(sessionId)
    → loadTranscriptFile(sessionFile)
      → 读取 JSONL 文件所有行
      → 对每行：if isTranscriptMessage(entry) → messages.set(uuid, entry)
      → queue-operation 不是 TranscriptMessage → 被跳过
  → if messages.size === 0 → return null  ← 触发点
  → findLatestMessage(messages.values(), m => !m.isSidechain)
  → if !lastMessage → return null  ← 另一个触发点
  → buildConversationChain(messages, lastMessage)
```

所以"JSONL 里有内容但 `--resume` 失败"的场景：JSONL 文件里只有 `queue-operation` 条目（比如只有任务队列操作，没有任何 user/assistant 消息），`messages.size === 0`，返回 null。

---

### Q3：`--resume` 的完整数据流

**结论**：`getLastSessionLog` 在 `--resume` 路径上有一个缓存预热优化（L3891-L3901）：加载完 session 文件后，如果 `getSessionMessages` 缓存为空，就把 UUID 集合写入缓存，节省后续 `recordTranscript` 的重复读取（注释说节省 170-227ms）。`inc-` 编号没有在代码里出现，但注释里有具体数字，说明是实测数据。

**verified** — 源码锚点：`src/utils/sessionStorage.ts` L3891-L3901

---

### Q4：JSONL append-only 和恢复的关系

**结论**：append-only 是主动选择，不是 JSONL 格式的自然结果（JSONL 本身不强制 append-only，也可以重写整个文件）。代码里有多处注释明确说明这是设计约束：L1963 说"JSONL is append-only, so removed messages stay on disk"；L3231 说"Every rewind/ctrl-z leaves an orphaned chain branch in the append-only"；L3259 说"The append-only write discipline guarantees parents appear at earlier file positions"。

**verified** — 源码锚点：`src/utils/sessionStorage.ts` L1963, L3231, L3259

append-only 和"进程会死"的关系：
- 进程被杀时，最后一次 `appendFile` 要么完成（行完整），要么没有执行（行不存在）
- 不存在"写了一半的行"的情况（操作系统保证 append 的原子性，至少在单次 write 系统调用范围内）
- 这让恢复逻辑极其简单：读取文件，解析每一行，跳过解析失败的行，剩下的就是完整的历史

---

### 意外发现

**`progress` 消息曾经在 JSONL 里，后来被移除**（L3621-L3626 注释）：PR #24099 把 progress 从 `isTranscriptMessage` 里移除，但旧的 JSONL 文件里仍然有 progress 条目。`loadTranscriptFile` 有专门的 `progressBridge` 逻辑来处理这些遗留条目，防止 `buildConversationChain` 在遇到 progress 的 parentUuid 时截断链。这是一个典型的"格式演进需要向后兼容"的案例。

**`MAX_TOMBSTONE_REWRITE_BYTES`（50MB）和 `MAX_TRANSCRIPT_READ_BYTES`（50MB）是两个不同的限制**（L121-L123 vs L225-L227）：前者防止 tombstone 重写路径 OOM，后者防止读取路径 OOM。两个限制值相同，但保护的是不同的代码路径。

---

## 写作注意事项

1. ch01 是全书开篇，读者还不知道 `QueryLoop`、`TaskSystem` 等后续章节的内容，**不要引入后续章节的概念**
2. `getLastSessionLog` 的过滤逻辑较复杂，写作时用**反向叙事**效果更好：先说"用户 --resume 失败看到了什么"，再解释"为什么 JSONL 里有内容但找不到消息"
3. JSONL 格式的选型解释，和"进程会死"的主论题要明确对应上，不要写成孤立的技术细节
