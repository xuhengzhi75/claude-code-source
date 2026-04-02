# 提交规范参考

## 格式

统一使用 `type(scope): purpose`：

```
docs(book): split manuscript from writing workspace
docs(chapters): tighten ch04-ch08 information density
docs(evidence): strengthen query engine anchors
docs(workflow): unify workspace navigation
chore(structure): move writing artifacts into book-workspace
docs(comments): annotate recovery and tool-system hotspots
chore(scripts): add anchor checking helper
```

## 核心原则：一次提交只做一类事

不要把多种性质的改动混在一个 commit 里。

推荐拆分：
- 章节正文改写
- evidence map / 参考资料更新
- 架构分析笔记
- workflow / methodology / README / 目录整理
- 源码注释补充
- scripts / config / tests 变更
- 结构迁移与批量路径修复

尤其不要混：
- 结构整理 + 正文重写
- 批量路径修复 + 内容判断修改
- 注释补充 + 脚本调整 + 文档重写

## 推荐 type

- `docs`：文档、章节、README、方法论、evidence、workflow、注释说明
- `chore`：目录整理、重命名、结构迁移、机械修正、脚本辅助、非语义改动
- `refactor`：重组已有结构但不改变核心结论或外部语义
- `feat`：新增功能（博客功能、脚本工具等）
- `fix`：修复问题
- `ci`：CI/CD 配置

## 推荐 scope

- `book`：书稿相关
- `chapters`：章节正文
- `evidence`：证据材料
- `workflow`：工作方法
- `methodology`：方法论
- `architecture-notes`：架构分析笔记
- `comments`：源码注释
- `structure`：目录结构
- `status`：状态文档
- `skills`：skill 草案
- `scripts`：脚本工具
- `blog`：博客相关
- `config`：配置
- `repo`：仓库级

## 验收标准

一个 commit 如果不能快速回答下面三问，就不够好：
1. 这次改的是哪一类东西？
2. 为什么这类改动值得单独提交？
3. 如果出问题，能不能低成本单独回滚？

## 不推荐的标题

- `update docs`
- `fix stuff`
- `more changes`
- `book updates`
- `misc fixes`
