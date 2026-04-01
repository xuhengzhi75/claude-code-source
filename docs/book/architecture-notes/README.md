# Architecture Notes Index

## 这是什么
`architecture-notes/` 是源码分析侧的技术底稿目录，用来承接：
- 源码拆解
- 证据提炼
- 判断收束
- 后续章节写作交接

它不是纯导读目录，也不是章节正文目录，而是“从源码到写作”的中间层资产。

## 当前四种常见类型

### 1. 导读型
作用：帮助快速理解主线结构。
代表：
- `system-overview.md`
- `execution-flow-guide.md`

### 2. 证据型
作用：收集高密度、可直接引用的源码信号。
代表：
- `key-comment-signals.md`
- `task-recovery-map.md`

### 3. 判断型
作用：把源码事实提升成系统级判断与可迁移经验。
代表：
- `moat-and-barriers.md`
- `what-to-learn-from-claude-code.md`

### 4. 交接型
作用：为后续章节直接提供写作底稿与边界提示。
代表：
- `bridge-reading-method.md`
- `runtime-structure.md`
- `tool-system-detail.md`
- `recovery-and-continuity.md`

## 使用建议
- 如果你是源码阅读者：先看导读型，再看证据型
- 如果你是写作者：优先看交接型，再看证据型
- 如果你做系统判断：优先看判断型，再回看证据型确认边界

## 当前问题
目前目录内仍存在“导读感偏强、证据标签不够统一”的问题，后续应逐步收口到：
- 更少重复综述
- 更强 verified / inference 边界
- 更明确的“本篇覆盖 / 不覆盖”说明

## 后续收口方向
1. 减少重复主干综述
2. 增强每篇的证据格式
3. 统一边界句
4. 让更多 notes 转成可直接给写作侧使用的交接卡风格
