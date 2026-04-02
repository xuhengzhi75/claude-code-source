# Commit Conventions

这个仓库当前存在多位协作者并行推进，因此提交规范必须统一，否则后续很难追踪“谁改了什么、为什么改、哪一类改动可以单独回滚”。

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

## 最低验收标准

一个 commit 如果不能快速回答下面三问，就不够好：
1. 这次改的是哪一类东西？
2. 为什么这类改动值得单独提交？
3. 如果出问题，能不能低成本单独回滚？
