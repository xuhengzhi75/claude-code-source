# Meta Supplement Suggestions

这份文档用于补充当前“从源码到书 / 从源码到 blog / 多 agent 协作”方法论体系中仍然欠明确、但已经在本仓库实战中证明非常重要的部分。

## 一、最优先补的内容

### 1. workspace-structure / repo-layout
需要单独写一份，明确说明：
- `book/` 是读者向 / 成稿向目录
- `book-workspace/` 是生产资料 / agent 工作区
- `blog/` 是公开展示面，不应混入生产资料
- `skills/` 是经验抽象与自动化复用层

核心原则：
> 成品表面与生产表面必须分离。

### 2. reader surface vs production surface
需要明确区分：
- 读者表面：`book/`、`chapters/`、`blog/`
- 生产表面：`planning/`、`workflow/`、`references/`、`status/`、`inbox/`、`excavation-tasks/`、`skills/`

核心原则：
> 面向读者的目录不要混入状态、模板、交接和协作资料。

### 3. collaboration system layering
建议把协作体系分层写清楚，而不是只写成一套散流程。

推荐分层：
- 沟通层：`inbox/`、`conversation-log`
- 任务层：`excavation-tasks/`、writing queue
- 状态层：`project-status`、`status/`
- 交付层：`commit conventions`、quality gates、handoff template

核心判断：
> 多 agent 协作不是补充流程，而是内容生产系统的一部分。

### 4. project learning -> skill -> repo convention loop
需要显式写出这条闭环：
1. 先在项目里真实执行
2. 再从执行中提炼方法论
3. 再把方法论抽成 skill
4. 再把高频稳定经验固化回仓库制度（README / conventions / workflow / hooks）

这能解释为什么某些内容应该进 skill，而另一些内容应该进仓库级规范。

---

## 二、对当前 skill 体系的具体补强建议

### 对 `source-analysis-to-book`
建议继续补：
- workspace structure reference
- reader vs production surfaces reference
- continuation contract
- collaboration dependency note

### 对未来的 `source-to-blog`
建议明确：
- 来源边界：blog 内容来自哪些章节、哪些 analysis notes
- 发布边界：哪些内容允许公开，哪些只留在 workspace
- 生命周期：草稿 / 发布 / 修订 / 回流正文

### 对未来可能新增的 repo-level skill
建议考虑补一个：
- `multi-agent-source-writing-repo`

它专门覆盖：
- inbox
- excavation tasks
- status
- handoff
- commit conventions
- collaboration boundaries

---

## 三、建议新增的文档（按优先级）

### P1
- `workspace-structure-for-source-book-project.md`
- `reader-vs-production-surface.md`

### P2
- `how-project-learnings-become-repo-conventions.md`
- `collaboration-system-layering.md`

### P3
- `source-to-blog.md`（如果后续正式抽 skill）
- `multi-agent-source-writing-repo.md`

---

## 四、为什么这些补充重要

如果不把这些内容单独写出来，后续很容易出现：
- `book/` 和 `book-workspace/` 再次混放
- `blog/` 被当成临时工作目录污染
- 协作规范只剩流程，没有边界
- skill 与仓库制度脱节
- 经验沉淀散在多篇文章里，无法形成稳定操作系统

这些问题不是理论问题，而是这个仓库已经真实踩过、并通过结构重组才逐渐解决的问题。
