# Status Index（状态归档索引）

> 目的：给后续 Agent 一个“最快恢复上下文”的入口，并明确 `status-*.md` 的定位：它们是**过程快照日志**，不是单一真相来源。

## 1) `status-*.md` 的用途（它们是什么）

`docs/book/status-*.md` 是按时间滚动写入的短周期状态快照，主要记录：
- 当轮 10~15 分钟自检结果（是否跑偏）
- 本轮最小增量（通常是一条新增证据或一处文档更新）
- 本地与远程同步状态（ahead/behind）
- 下一步执行节奏

它们的价值：
- 保留“推进轨迹”和“决策上下文”
- 便于追溯某条事实是何时补入、为什么补入
- 给交接时提供高频、低粒度的过程证据

它们的边界：
- 可能有重复表述（同一主线多轮确认）
- 不是全局汇总，不适合作为唯一入口
- 早期文件会包含当时有效、但后续可能被收口的临时判断

---

## 2) 当前状态 vs 历史快照（如何区分）

### A. 当前状态（优先读取，作为“现在”）
1. `docs/book-workspace/planning/project-status.md`（当前阶段、完成面、风险、优先级）
2. `docs/book-workspace/planning/completed-coverage-and-writing-queue.md`（已覆盖与待写队列）
3. `docs/book-workspace/references/code-annotation-roadmap.md`（源码注释与证据补充节奏）

> 结论：**当前真实状态以以上“汇总型文档”为准**。

### B. 历史快照（按需回放，作为“过程”）
- `docs/book/status-2026-04-01-0041.md` ~ `docs/book/status-2026-04-01-0800.md`
- 共 25 份，集中在 2026-04-01，体现持续小步推进与自检节奏

> 结论：`status-*.md` 用于回答“怎么走到现在”，不用于单独回答“现在是什么”。

---

## 3) 后续 Agent 恢复上下文的最短路径（建议 5~10 分钟）

按下面顺序读，避免一上来刷 25 份快照：

### Step 1（2 分钟）
读：`docs/book-workspace/planning/project-status.md`
- 拿到当前阶段、已完成范围、风险与优先级。

### Step 2（3 分钟）
读：
- `docs/book-workspace/planning/completed-coverage-and-writing-queue.md`
- `docs/book-workspace/references/code-annotation-roadmap.md`

- 确认“下一批可直接开工项”和证据/注释补位点。

### Step 3（1~3 分钟，可选）
只读最新 2~3 份快照：
- `docs/book/status-2026-04-01-0800.md`
- `docs/book/status-2026-04-01-0745.md`
- `docs/book/status-2026-04-01-0735.md`

- 用于感知最近执行节奏、口径、提交习惯。

### Step 4（仅在需要追溯时）
再按时间倒序翻更早 `status-*.md`，定位“某条事实何时引入”。

---

## 4) 归档与维护建议（后续执行约定）

1. 新增状态快照时，保持 `status-YYYY-MM-DD-HHMM.md` 命名。
2. 每日（或每阶段）只维护一份“汇总当前状态”文档（`planning/planning/project-status.md`），避免“当前状态”分叉。
3. 当快照数量继续增长时，可把旧快照移入 `docs/book/status-archive/`（按日期分目录），本索引保留入口与分流规则。
4. 新 Agent 接手时，默认先走本文件第 3 节最短路径，再决定是否深挖历史。

---

## 5) 一句话交接口径

- `planning/planning/project-status.md` 回答“**现在到哪了**”；
- `status-*.md` 回答“**怎么走到这儿的**”；
- 先看“现在”，再按需回放“历史”。
