# Book Workspace

这是**写书工作区 / agent 工作区**，不面向普通读者，主要服务分析、写作、交接、续写和 skill 提炼。

## 目录说明
- `architecture-notes/`：源码与架构深读笔记
- `planning/`：提纲、排期、项目状态、写作队列
- `workflow/`：工作方法、模板、prompt、协作说明
- `references/`：证据映射、路线图、案例、对话记录
- `methodology/`：写作原则、结构原则、方法论沉淀
- `status/`：阶段快照与状态索引
- `skills/`：可复用 workflow / skill 草案

## 推荐最小入口（按任务）

### 1) 继续写章节
1. `planning/project-status.md`
2. `planning/completed-coverage-and-writing-queue.md`
3. `methodology/writing-principles.md`
4. 如需证据再看 `references/chapter-evidence-map.md`

### 2) 做源码分析
1. `references/code-annotation-roadmap.md`
2. `references/chapter-evidence-map.md`
3. `architecture-notes/`
4. 如需交接模板再看 `workflow/analysis-handoff-template.md`

### 3) 恢复上下文
1. `planning/project-status.md`
2. `status/status-index.md`
3. `references/conversation-log.md`
4. 必要时再看最近一条 `status/status-*.md`

### 4) 校验目录 / 路径 / 引用
1. `README.md`（本页）
2. `planning/project-status.md`
3. 目标目录 README
4. 再扫描具体文档引用

### 5) 统一协作提交规范
1. `workflow/commit-conventions.md`
2. `workflow/collaboration-guide.md`
3. 必要时回看 `planning/project-status.md`

### 6) 提炼 Skill
1. `skills/source-analysis-to-book/SKILL.md`
2. `skills/source-analysis-to-book/references/navigation.md`
3. `methodology/book-writing-playbook-2026-04-01_to_2026-04-02.md`
4. `skills/source-analysis-to-book-skill-draft.md`

## 工作原则
- 先读最小入口，不做全目录通读。
- 先恢复状态，再继续修改。
- 先证据后结论，先方法后批量生成。
- 书本体内容去 `../book/`；生产资料留在本目录。
