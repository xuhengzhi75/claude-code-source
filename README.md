# 深入 Claude Code

> 从源码视角理解 Claude Code 的设计哲学与工程实现。
>
> 在线阅读：<https://xuhengzhi75.github.io/claude-code-source/>

[![在线博客预览](docs/blog-screenshot.png)](https://xuhengzhi75.github.io/claude-code-source/)

---

## 这是什么

这是一个围绕 **Claude Code recovered source** 展开的源码研究与写作仓库。

核心目标不是"拿来直接运行"，而是：

- 拆解 Claude Code 这类 Coding Agent **为什么强**
- 理解它的运行时架构、提示词装配、工具系统、权限治理、任务系统与恢复机制
- 把源码阅读结果沉淀成**书稿、架构笔记、证据映射**与可复用写作材料

### 一大特色：源码内嵌中文注解与解读

`src/` 目录下的 recovered source 并非原样存档，而是在阅读过程中**持续写入中文注解**。每一处关键逻辑旁边都有行内注释，说明"这段代码在做什么、为什么这么设计、对应书稿哪个论点"。这让源码本身成为一份可直接阅读的中文技术文档，而不只是供书稿引用的证据库。

具体体现在：

- **行内注释**：函数、分支、类型定义旁标注中文说明，直接解释设计意图
- **模块头注释**：每个核心文件顶部有一段中文导读，说明该模块在整体架构中的位置与职责
- **证据锚点**：注释中标注对应的书稿章节编号（如 `// → ch07`），方便在源码与书稿之间双向跳转
- **疑问标记**：尚未确认的推断用 `// ?:` 前缀标出，区分"已验证结论"与"待深挖假设"

目前已完成注解的模块覆盖 `src/tools/`（AgentTool/BashTool/FileEditTool/FileReadTool/FileWriteTool/GlobTool/GrepTool/WebFetchTool/WebSearchTool/shared）、`src/services/`、`src/utils/`、`src/bridge/`、`src/cli/`、`src/commands/`、`src/tasks/` 等核心目录，共 260+ 个文件。注解进度详见 [`code-annotation-roadmap.md`](code-annotation-roadmap.md)。

如果你习惯"边看代码边理解"，可以直接从 `src/` 开始读，注解会引导你走完整条主干链路。

> **声明**：本仓库为非官方整理版，基于公开 npm 发布包与 source map 分析还原，仅供研究使用，不代表 Anthropic 官方立场。

---

## 在线书稿

### 技术版（20 章）

面向会看源码的读者，覆盖从入口分流到权限系统的完整主干。

| 章节 | 主题 |
|------|------|
| ch01 | 不只是聊天工具 |
| ch02 | 为什么强 |
| ch03 | 从入口到执行 |
| ch04 | 入口与请求路由 |
| ch05 | 能力装配 |
| ch06 | QueryEngine |
| ch07 | QueryLoop |
| ch08 | 任务系统 |
| ch09 | 护城河 |
| ch10 | 运行时壁垒 |
| ch11 | 为什么干不了真活 |
| ch12 | 该学什么 |
| ch13 | 最小可用骨架 |
| ch14 | 工具 |
| ch15 | 提示词 |
| ch16 | 状态与上下文 |
| ch17 | 任务推进 |
| ch18 | 恢复机制 |
| ch19 | 提示词工程设计模式 |
| ch20 | 权限系统 |

章节正文位于 [`docs/book/chapters/`](docs/book/chapters/)，在线阅读体验更佳：<https://xuhengzhi75.github.io/claude-code-source/>

### 通俗版（10 篇）

面向不看代码但对 AI 工具有好奇心的读者，讲的是"为什么要这么设计，这对你意味着什么"。结论与技术版一致，讲法不同。

源文件位于 [`docs/book/easy-chapters/`](docs/book/easy-chapters/)，并已接入在线 blog 阅读入口；站点侧内容位于 [`blog/easy-chapters/`](blog/easy-chapters/)。目前分四个部分：你以为你在用聊天工具（其实不是）、它是怎么工作的、为什么别人抄不走、这对你意味着什么。

---

## 仓库结构

```
claude-code-source/
├── src/                          # Recovered source（核心研究对象，含系统性中文注解）
│   ├── entrypoints/cli.tsx       # 入口分流
│   ├── main.tsx                  # 完整初始化与能力装配
│   ├── QueryEngine.ts            # 会话编排
│   ├── query.ts                  # 运行时状态机
│   ├── Task.ts / tasks/          # 任务系统
│   └── tools/ commands/ ...
├── docs/
│   ├── book/chapters/            # 技术版书稿正文（20章）
│   ├── book/easy-chapters/       # 通俗版源文件（10篇）
│   └── book-workspace/           # 写作工作区
│       ├── architecture-notes/   # 源码深读笔记
│       ├── planning/             # 进度与规划
│       ├── references/           # 证据映射与交接模板
│       ├── methodology/          # 写作原则与验收标准
│       ├── inbox/                # 多 Agent 异步通信层
│       └── excavation-tasks/     # 挖掘任务卡（章节素材补充）
├── blog/                         # 在线博客（GitHub Pages）
│   └── easy-chapters/            # 通俗版站点内容
├── scripts/                      # 校验脚本与辅助工具
├── .github/workflows/            # 自动化流程
├── meta/                         # 方法论沉淀
│   ├── articles/                 # 经验分享文章
│   └── skills/                   # 可复用 Agent Skill
├── code-annotation-roadmap.md    # 中文注解进度路线图
└── COMMIT-CONVENTIONS.md         # 提交规范
```

---

## 系统主干架构

```
用户请求 / CLI 参数
        │
        ▼
src/entrypoints/cli.tsx       ← 入口分流，fast-path 优先
        │
        ▼
src/main.tsx                  ← 完整初始化，命令/工具装配
        │
        ▼
src/commands.ts + tools.ts    ← 形成当前会话能力池，做权限过滤
        │
        ▼
src/QueryEngine.ts            ← 会话编排，transcript / usage 收口
        │
        ▼
src/query.ts                  ← 单轮状态机：tool_use → tool_result → next turn
        │
        ├──────────────────────────────────┐
        ▼                                  ▼
src/tasks/*                    sessionStorage / compact / memory
  长任务对象化                    连续性与恢复链
```

一句话：**入口分流 → 能力装配 → 会话编排 → 运行时循环 → 任务与恢复**，而不是一个单文件聊天程序。

---

## 快速开始

### 想读书稿

直接访问在线博客：<https://xuhengzhi75.github.io/claude-code-source/>

技术版正文位于 [`docs/book/chapters/`](docs/book/chapters/)，通俗版源文件位于 [`docs/book/easy-chapters/`](docs/book/easy-chapters/)；两者都已接入在线 blog 阅读入口。

### 想看源码

`src/` 下的每个核心文件都内嵌了中文注解（行内说明 + 模块头导读 + 章节锚点），可以直接当中文技术文档读。推荐阅读顺序：

1. `src/entrypoints/cli.tsx` — 入口分流与 fast-path
2. `src/commands.ts` + `src/tools.ts` + `src/Tool.ts` — 能力池装配与治理
3. `src/QueryEngine.ts` — 会话编排与持久化
4. `src/query.ts` — 运行时状态机：tool_use、budget、compact、recovery
5. `src/Task.ts` + `src/tasks/` — 长任务为什么要独立建模
6. `src/tools/AgentTool/` — 子 Agent 派发与内置 Agent 体系
7. `src/tools/BashTool/` — 命令执行的安全/权限/沙箱全链路

### 想看架构笔记

[`docs/book-workspace/architecture-notes/`](docs/book-workspace/architecture-notes/) 包含：

- `system-overview.md` — 系统全局定位
- `execution-flow-guide.md` — 执行链路图
- `query-engine-and-loop.md` — QueryEngine 与 QueryLoop 深读
- `task-system.md` — 任务系统
- `recovery-and-continuity.md` — 恢复与连续性
- `tool-system-detail.md` — 工具系统细节
- `permission-system.md` — 权限系统
- `runtime-structure.md` — 运行时结构

### 想了解写作方法论

[`meta/articles/`](meta/articles/) 沉淀了这套"源码 → 书稿"工作流的完整经验，涵盖如何从源码写成书、博客搭建踩坑、多 Agent 协作规范、挖掘任务卡体系、技术写作方法论等主题。

### 想本地预览或构建 blog

可直接查看：

- `blog/dev.sh` — 本地预览
- `blog/build.sh` — 站点构建
- `blog/deploy.sh` — 部署辅助脚本

---

## 推荐阅读方法

1. **先找总判断**：这套系统真正强在哪？
2. **再看控制权链路**：谁调用谁、谁把控制权交给谁？
3. **再看能力边界**：这次会话到底开放了什么能力？
4. **再看主循环**：何时继续、何时结束、何时恢复？
5. **最后看边界 case**：哪里最容易断、为什么要这么补？

按目录树顺序看，通常只得到"模块很多"；按控制权、状态机和边界条件看，才能得到"为什么它这么强"。

---

## 协作规范

提交格式统一使用 `type(scope): purpose`，详见 [`COMMIT-CONVENTIONS.md`](COMMIT-CONVENTIONS.md)。

写作规范与验收标准详见 [`docs/book-workspace/methodology/`](docs/book-workspace/methodology/)。
