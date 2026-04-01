# docs/book 结构整理原则（最小改动版）

> 目标：在不大规模搬迁文件的前提下，先建立稳定的信息架构约束，后续按需渐进整理。

## 1) 按需加载（Need-to-Know）

- 顶层只保留高频入口与导航，不承载细节推导。
- 深度材料放在子目录（如 `chapters/`、`architecture-notes/`），通过索引页进入。
- 新增文档优先先挂接到一个明确入口，避免“孤儿文件”。

## 2) 渐进披露（Progressive Disclosure）

推荐阅读路径：

1. `README.md` / 总导航（看全局地图）
2. `project-status.md`（看当前进度与下一步）
3. `book-outline-v1.md` + `chapters/`（看主线内容）
4. `architecture-notes/`（看技术细节与证据）

原则：先给“该看什么”，再给“为什么这样”。

## 3) 任务入口优先（Task-first Entry）

按使用场景组织入口，而不是按写作时间：

- **写作推进**：`book-outline-v1.md`、`writing-principles.md`、`chapter-evidence-map.md`
- **协作分工**：`collab-split.md`、`workflow-templates.md`、`analysis-handoff-template.md`
- **状态同步**：`project-status.md`、`status-*.md`
- **架构溯源**：`architecture-notes/README.md`

后续若新增入口页，优先围绕任务（写作/协作/审阅/发布）编排。

## 4) 规范 / 状态 / 内容分层

顶层文档按职责理解为三层：

- **规范层（How）**：方法、模板、原则、要求
  - 如：`WORKING-METHOD.md`、`requirements.md`、`writing-principles.md`
- **状态层（Now）**：当前进度、阶段结论、过程记录
  - 如：`project-status.md`、`status-*.md`、`conversation-log.md`
- **内容层（What）**：真正进入书稿与证据内容
  - 如：`chapters/`、`book-outline-v1.md`、`architecture-notes/`

约束：状态文件不承载长期规范；规范文件不记录临时进度。

## 5) 后续整理建议（保持最小改动）

- 短期：继续保留现有文件位置，仅补链接与职责说明。
- 中期：为 `status-*.md` 建索引（时间线/里程碑），避免顶层继续膨胀。
- 长期：当读写成本明显升高时，再做批量迁移（一次性迁移 + 完整重定向链接）。

---

当前文档作为“整理约束”，用于指导后续任何目录调整，避免重复重构与命名漂移。
