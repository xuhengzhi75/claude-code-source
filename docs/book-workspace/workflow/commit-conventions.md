# Commit Conventions (Book Workspace Note)

> 仓库级统一提交规范请以根目录 `COMMIT-CONVENTIONS.md` 为准。

这份文档保留在 `book-workspace/workflow/`，仅作为写书工作区内的导航与提醒入口，避免协作者只在局部工作时忽略仓库级提交约束。

## 目标

统一提交粒度、命名方式和内容边界，让不同协作者的提交历史可读、可追踪、可回滚。

## 提交原则

### 1. 一次提交只做一类事
避免把多种性质的改动混在同一个 commit 里。

推荐拆分：
- 章节正文改写
- evidence map / 参考资料更新
- 架构分析笔记
- workflow / methodology / README / 目录整理
- 源码注释补充

### 2. 提交信息必须能看出“改动类型 + 作用域 + 目的”
统一使用：

```text
type(scope): purpose
```

例如：
- `docs(book): split manuscript from writing workspace`
- `docs(chapters): tighten ch04-ch08 information density`
- `docs(evidence): strengthen query engine anchors`
- `docs(workflow): unify workspace navigation`
- `chore(structure): move writing artifacts into book-workspace`
- `docs(comments): annotate recovery and tool-system hotspots`

### 3. 不要把“结构整理”和“正文重写”混在一个提交里
因为这两类改动的回滚需求完全不同：
- 结构整理偏工程性
- 正文重写偏内容性

### 4. 不要把“批量路径修复”和“内容判断修改”混在一个提交里
路径修复应该是机械性的、可验证的。
内容判断修改应该能单独 review。

### 5. 多人协作时优先小步快推
一个 commit 最好能回答：
- 这次主要改了哪一块
- 这次改动为什么值得单独存在
- 如果要回滚，是否可以只回滚这一类改动

## 推荐 type

- `docs`：文档、章节、README、方法论、evidence、workflow、索引
- `chore`：目录整理、重命名、结构迁移、非内容性机械修正
- `refactor`：重组已有文档结构但不改变核心结论

当前书项目里，大多数提交优先用 `docs`，结构性迁移可用 `chore`。

## 推荐 scope

- `book`
- `chapters`
- `evidence`
- `workflow`
- `methodology`
- `architecture-notes`
- `comments`
- `structure`
- `status`
- `skills`

## 示例拆分

### 情况 A：同时做了章节重写、evidence map 修正、README 导航增强
不要合成一个 commit，建议拆成：
1. `docs(chapters): tighten chapter structure and information density`
2. `docs(evidence): update chapter evidence map anchors`
3. `docs(workflow): refine reader and workspace navigation`

### 情况 B：同时做了目录迁移和路径修复
建议拆成：
1. `chore(structure): move writing artifacts into book-workspace`
2. `docs(workflow): fix references after workspace split`

## 协作者统一要求

无论是哪位协作者，提交都应满足：
- 标题可读，不写模糊信息如 `update docs` / `fix stuff`
- 一次提交只表达一个清晰意图
- 大改动先拆结构，再拆内容，再拆证据
- 能单独回滚的内容不要混在一起

## 实际样例

下面这些都是当前仓库里较好的、可读性较强的真实样例：
- `docs(book): split manuscript from writing workspace`
- `docs(book): refine reader index and skill scaffold`
- `docs(book): deepen workspace navigation and skill references`
- `docs(book): add chapter index and skill quality gates`
- `docs(workflow): define shared commit conventions`

这些样例的共同点：
- 主题单一
- 作用域明确
- 目的清楚
- 回滚边界相对干净

相对不推荐的提交标题类型：
- `update docs`
- `fix stuff`
- `more changes`
- `book updates`

问题在于：标题无法快速说明改动边界，也不利于多人协作 review。

## 推荐提交流程

### 小改动
1. 明确这次改动属于哪一类（结构 / 正文 / 证据 / workflow / 方法论 / 注释）
2. 只改一类内容
3. 本地自查引用、结构与命名
4. 用 `type(scope): purpose` 提交
5. 立即 push，减少分叉

### 大改动
1. 先更新状态文档，说明目标与范围
2. 先提交结构性改动
3. 再提交内容性改动
4. 再提交证据/索引/路径修正
5. 每一类单独 commit
6. 每完成一段就 push，保持远端是最新协作基线

## Push 前最低检查

提交前至少确认：
- 改动边界是否单一
- 路径/引用是否被这次改动破坏
- 提交标题是否能让别人一眼看懂
- 是否还有本应拆开的内容混在一起

## 最低验收标准

一个 commit 如果不能快速回答下面三问，就不够好：
1. 这次改的是哪一类东西？
2. 为什么这类改动值得单独提交？
3. 如果出问题，能不能低成本单独回滚？
