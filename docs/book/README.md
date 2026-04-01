# docs/book 导航索引（按需加载 / 渐进式披露）

> 目标：让你**先用最少文档完成当前任务**，只有在需要时再继续下钻。

## 这个目录是做什么的

`docs/book/` 是本项目“书稿与证据化写作”的工作区，承载：

- 章节草稿与结构化内容（`chapters/`）
- 源码证据与注释计划（如 `chapter-evidence-map.md`、`code-annotation-roadmap.md`）
- 写作方法与模板（如 `writing-principles.md`、`WORKING-METHOD.md`）
- 项目状态与排期（如 `project-status.md`、`roadmap.md`、`completed-coverage-and-writing-queue.md`）

---

## 使用原则（先少后多）

1. **先读最小入口**：只打开与你当前任务直接相关的 1～2 个文件。
2. **遇到阻塞再下钻**：仅当信息不足时，再查看下一层文档。
3. **避免一次性全量阅读**：不做“全目录通读”，减少上下文噪音。
4. **优先可执行信息**：先看可直接指导动作的文档（模板、索引、状态）。

---

## 按任务类型的最小入口

### 1) 写作（章节起草 / 改写 / 统一风格）

最小入口：

1. `writing-principles.md`（风格与写作准则）
2. `chapters/` 下目标章节文件（直接开写）

需要时再看：

- `book-outline-v1.md`（全书结构）
- `workflow-templates.md` / `prompt-templates.md`（协作模板）

---

### 2) 源码分析（从代码提炼叙述与证据）

最小入口：

1. `code-annotation-roadmap.md`（分析范围与推进顺序）
2. `chapter-evidence-map.md`（章节 ↔ 代码证据映射）

需要时再看：

- `architecture-notes/`（模块级分析）
- `figures-index.md`（图示素材与定位）

---

### 3) 恢复上下文（接手中断任务 / 快速回忆现场）

最小入口：

1. `project-status.md`（当前状态总览）
2. `completed-coverage-and-writing-queue.md`（已完成与待写队列）

需要时再看：

- 最近一条 `status-*.md`（时间线快照）
- `conversation-log.md`（决策与协作记录）

---

### 4) 项目管理（排期、分工、里程碑、交付跟踪）

最小入口：

1. `project-status.md`（进度与风险）
2. `roadmap.md`（阶段目标与里程碑）

需要时再看：

- `requirements.md`（范围与验收约束）
- `collab-split.md` / `analysis-handoff-template.md`（协作与交接）

---

## 推荐阅读路径（通用）

`任务类型最小入口` → `对应执行文件` → `必要时扩展到模板/状态/架构笔记`

一句话：**先完成当前动作，再补充背景；不为“可能有用”而预读。**
