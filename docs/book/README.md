# Claude Code 源码解析书稿

这是本项目的**书本体目录**，面向读者与成稿内容。

如果你的目标是：
- 直接读书
- 找章节正文
- 了解这本书已经写到哪里

从这里进入即可。

## 目录结构

- `chapters/`：章节正文

## 推荐阅读方式

### 1. 从头阅读
按 `chapters/` 中章节顺序阅读。

当前章节覆盖主题包括：
- Claude Code 不只是聊天工具
- 为什么强
- 从入口到执行
- 入口与请求路由
- 能力装配
- QueryEngine / QueryLoop
- 任务系统
- 护城河与运行时壁垒
- 恢复机制
- 提示词工程设计模式

### 2. 按兴趣跳读
如果你更关心某一类问题，可优先看：

- **入口与执行主线**：`chapters/ch03-从入口到执行.md`、`chapters/ch04-入口与请求路由.md`
- **能力与工具系统**：`chapters/ch05-能力装配.md`、`chapters/ch14-工具.md`
- **核心执行机制**：`chapters/ch06-QueryEngine.md`、`chapters/ch07-QueryLoop.md`
- **任务与恢复**：`chapters/ch08-任务系统.md`、`chapters/ch18-恢复机制.md`
- **系统护城河与架构判断**：`chapters/ch09-护城河.md`、`chapters/ch10-运行时壁垒.md`、`chapters/ch11-为什么干不了真活.md`
- **方法与抽象**：`chapters/ch12-该学什么.md`、`chapters/ch19-提示词工程设计模式.md`
- **权限系统**：`chapters/ch20-权限系统.md`

## 这个目录不放什么

这里**不放**写书过程中的生产资料，例如：
- 架构分析笔记
- 证据地图
- 交接模板
- 写作方法论
- 状态快照
- Skill 草案

这些内容已经迁移到平级目录：
- `../book-workspace/`

## 如果你是写作者 / agent

如果你的目标不是“读书”，而是：
- 继续写章节
- 做源码分析
- 恢复写作上下文
- 查证据与状态
- 提炼可复用 Skill

请进入：
- `../book-workspace/`

那边是写书工作区，不是读者目录。
