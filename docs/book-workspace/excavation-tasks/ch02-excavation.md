# ch02 挖掘任务卡：为什么强

**认领人：** startheart
**状态：** 待认领
**目标章节：** `docs/book/chapters/ch02-为什么强.md`（当前 104 行）
**写作规范：** `docs/book-workspace/methodology/writing-principles.md`

---

## 背景与现状

ch02 聚焦"Claude Code 为什么比同类工具强"，论证了六个机制：上下文边界拉高（`queryLoop`）、工具执行流水线（`StreamingToolExecutor`）、`--resume`/检查点、多 agent 协调（`tasks.ts`）、卧底模式（`undercover.ts`）、反蒸馏（`anti_distillation`）。

现有内容的主要缺口：
1. **`StreamingToolExecutor` 的流式并发细节没有** — 章节说"工具在流式传输时就开始执行"，但没有说清楚这个"提前执行"具体节省了多少，以及它在什么时候会产生 race condition
2. **多 agent 协调的实际约束没有** — 章节提到 `tasks.ts` 管理协调，但没有量化：最多几个 agent 并发？锁争用的回退机制是什么？
3. **反蒸馏两层机制的设计意图对比缺失** — `fake_tools` 和 `streamlinedTransform` 是两个机制，目的不同，章节把它们合在一起没有分开解释

---

## 挖掘任务

### 🔴 必答（ch02 改稿必须覆盖）

**任务 1：StreamingToolExecutor 的流式提前执行**

文件：`src/services/tools/StreamingToolExecutor.ts`

- 工具在流式传输时开始执行（不等待全部 tool_use 块到达），具体什么时机开始？
- 有没有注释说明这个提前执行节省了多少延迟（具体数字或量级）？
- `streaming_fallback` 错误的触发条件是什么？流式执行启动后，如果流中断了会发生什么？

格式要求：结论 + verified/inference 标注 + 源码行号

---

**任务 2：多 agent 协调的量化约束**

文件：`src/utils/tasks.ts`

- `MAX_AGENTS` 或类似常量：系统允许同时运行的最大 agent 数是多少？有没有硬编码限制？
- `claimTaskWithBusyCheck()` 在锁争用失败时的回退机制：是直接报错，还是有等待重试？重试几次？
- `unassignTeammateTasks()`（agent 宕机归还任务）的具体触发条件：什么状态的 agent 会被认为"宕机"？`terminated` 和 `shutdown` 的区别是什么？

---

**任务 3：反蒸馏两层机制的精确对比**

文件：`src/services/api/claude.ts`（`anti_distillation`）和 `src/utils/streamlinedTransform.ts`

- `fake_tools` 注入：Anthropic API 收到这个参数后，会在响应里注入什么样的虚假工具？是工具名？还是工具定义？虚假工具会影响正常执行流程吗？
- `streamlinedTransform` 的具体过滤：thinking content 怎么被去除？工具调用被简化成哪几个类别？
- 两个机制的触发条件是否相同？（`fake_tools` 需要三重检查，`streamlinedTransform` 的条件是什么？）

---

### 🟡 加分项

**任务 4：`--resume` 的 50MB 截断行为**

`sessionStorage.ts#L225` 的 50MB 上限，在实际中意味着什么？
- 超过 50MB 的会话，`--resume` 时会发生什么用户可见的行为？（静默截断？报警？）
- 注释里的 inc-3930 是否有更多背景？（实际中多大的会话会触发？）

---

**任务 5：Session Memory 的异步写入机制**

`src/services/SessionMemory/` 里的 forked 子 agent：
- 触发条件是什么？每次对话都触发，还是有条件触发？
- 提取哪些类型的信息？（项目偏好？用户习惯？代码风格？）
- 对主会话的性能影响：是完全异步不阻塞，还是有同步点？

---

### 🟢 意外发现区

格式：`[文件路径#行号] 发现 + 为什么有意思`

---

## 写作注意事项

1. ch02 的读者是"刚了解 Claude Code 概念，想知道为什么它比 Copilot/Cursor 强"——技术细节需要有直观对比，不能只讲机制
2. 反蒸馏机制要谨慎写——这是商业策略，不是技术设计，"为什么强"应该聚焦用户体验上的优势，不是竞争手段
3. `StreamingToolExecutor` 的流式并发是 ch02 最有说服力的技术点之一，这里要量化：传统串行是多慢，流式并发具体快多少
