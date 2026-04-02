# Repository Commit Conventions

这是 **`claude-code-source` 整个仓库级** 的统一提交规范，不仅适用于 `docs/`，也适用于：
- 源码恢复与整理
- 源码注释补充
- 脚本与工具
- 配置调整
- 目录结构迁移
- 测试与校验文件
- 文档、书稿、证据材料与 workflow

目标是统一多人协作下的提交粒度、命名方式和回滚边界，让整个仓库的提交历史可读、可追踪、可 review、可回滚。

## 提交原则

### 1. 一次提交只做一类事
不要把多种性质的改动混在一个 commit 里。

推荐拆分：
- 章节正文改写
- evidence map / 参考资料更新
- 架构分析笔记
- workflow / methodology / README / 目录整理
- 源码注释补充
- scripts / config / tests 变更
- 结构迁移与批量路径修复

### 2. 提交信息必须写成：`type(scope): purpose`
例如：
- `docs(book): split manuscript from writing workspace`
- `docs(chapters): tighten ch04-ch08 information density`
- `docs(evidence): strengthen query engine anchors`
- `docs(workflow): unify workspace navigation`
- `chore(structure): move writing artifacts into book-workspace`
- `docs(comments): annotate recovery and tool-system hotspots`
- `chore(scripts): add anchor checking helper`
- `refactor(config): normalize repo-level conventions`

### 3. 不同改动类型不要混提
尤其不要混：
- 结构整理 + 正文重写
- 批量路径修复 + 内容判断修改
- 注释补充 + 脚本调整 + 文档重写

### 4. 多人协作时优先小步快推
一个 commit 最好能清楚回答：
- 改的是哪一类东西
- 为什么值得单独提交
- 是否可以独立回滚

## 推荐 type
- `docs`：文档、章节、README、方法论、evidence、workflow、注释说明
- `chore`：目录整理、重命名、结构迁移、机械修正、脚本辅助、非语义改动
- `refactor`：重组已有结构但不改变核心结论或外部语义
- `test`：测试与校验用例

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
- `scripts`
- `config`
- `tests`
- `repo`

## 实际样例
以下都是当前仓库中较好的真实样例：
- `docs(book): split manuscript from writing workspace`
- `docs(book): refine reader index and skill scaffold`
- `docs(book): deepen workspace navigation and skill references`
- `docs(book): add chapter index and skill quality gates`
- `docs(workflow): define shared commit conventions`

不推荐的标题：
- `update docs`
- `fix stuff`
- `more changes`
- `book updates`
- `misc fixes`

## 推荐提交流程

### 小改动
1. 明确属于哪一类改动
2. 只改一类内容
3. 本地自查引用、结构与命名
4. 用 `type(scope): purpose` 提交
5. 立即 push，减少分叉

### 大改动
1. 先更新状态/说明文档，定义目标与范围
2. 先提交结构性改动
3. 再提交内容性改动
4. 再提交证据/索引/路径修正
5. 每一类单独 commit
6. 每完成一段就 push，保持远端是最新协作基线

## 敏感文件与私有脚本禁入规则
以下内容不得进入公开仓库：
- 含公司/内网 API 信息的脚本
- 本地凭证、appid、device-auth、openclaw 配置、私钥、token
- 仅供个人机器使用的内部自动化脚本

要求：
- 仅靠 `.gitignore` 不够；敏感脚本应同时通过 hook 与协作规范双重拦截
- 如确需保留本地脚本，放在仓库外私有目录，或使用明确忽略规则并避免复制内容进入其他文件

## Push 前最低检查
提交前至少确认：
- 改动边界是否单一
- 路径/引用是否被破坏
- 提交标题是否一眼可懂
- 是否还有本应拆开的内容混在一起
- 是否混入敏感脚本、凭证、内部链接或私有配置

## 最低验收标准
一个 commit 如果不能快速回答下面三问，就不够好：
1. 这次改的是哪一类东西？
2. 为什么这类改动值得单独提交？
3. 如果出问题，能不能低成本单独回滚？
