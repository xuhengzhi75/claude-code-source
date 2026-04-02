# 多 Agent 协作开发交付机制（基于 Git 仓库）

记录者：startheart
日期：2026-04-02
状态：实践中（本项目正在使用）

---

## 背景

本项目有三个协作角色，分别由不同的 AI Agent 实例（或人）扮演：

- **xuhengzhi75**（中书省，GPT-5.4）：目录验收、拍板
- **startheart**（门下省，Claude Opus 4.6）：源码分析、博客
- **小许**（尚书省，Claude Sonnet 4.6）：章节写作、润色

三个角色运行在不同的 CatDesk 会话里，没有共享内存，无法直接通信。项目要稳定推进，不只需要“能沟通”，还需要一套完整的异步**协作开发交付机制**：消息怎么传、任务怎么拆、状态怎么续、交付怎么验收、提交怎么统一。

---

## 核心机制：Git 仓库即协作开发交付总线

### 原理

Git 仓库天然具备：
- **持久化**：消息不会因会话结束而丢失
- **版本历史**：所有通信有完整记录，可追溯
- **原子性**：commit 是原子操作，不会出现半写状态
- **推拉模型**：push/pull 即发送/接收

把这些特性用于 Agent 间通信，不需要任何额外基础设施。

### 目录结构

```
docs/book-workspace/
├── inbox/                    ← 异步消息通信
│   ├── README.md             ← 使用规则
│   ├── for-小许.md           ← startheart/xuhengzhi75 → 小许
│   ├── for-startheart.md     ← 小许/xuhengzhi75 → startheart
│   └── for-xuhengzhi75.md   ← startheart/小许 → xuhengzhi75
├── excavation-tasks/         ← 结构化任务交接
│   ├── README.md
│   ├── ch11-excavation.md   ← 小许起草，startheart 填写
│   ├── ch12-excavation.md
│   └── ch13-excavation.md
├── architecture-notes/       ← startheart 产出，小许消费
└── workflow/                 ← 协作规范文档
    └── 三方协作职责边界.md
```

### 消息格式（inbox）

```markdown
---
发件人：startheart
时间：2026-04-02
主题：权限系统交接卡已就绪

[消息正文]

状态：待处理 / 已处理
---
```

消息处理完后把状态改为"已处理"，不删除记录——历史即文档。

### 任务卡格式（excavation-tasks）

```markdown
## 🔴 必答问题
Q1: [问题]
A: [startheart 填写，标注 verified/inference + 源码锚点]

## 🟡 加分项
...

## 🟢 意外发现区
...
```

---

## 工作流

```
startheart 分析源码
  → 产出 architecture-notes/
  → 往 inbox/for-小许.md 追加消息
  → git commit + push

小许 pull
  → 读取 inbox/for-小许.md
  → 读取 architecture-notes/
  → 写章节正文
  → 往 inbox/for-xuhengzhi75.md 追加消息
  → git commit + push

xuhengzhi75 pull
  → 验收章节
  → 往 inbox/for-startheart.md 或 for-小许.md 追加反馈
  → git commit + push
```

每个环节：**完成即 push，开工前先 pull**。

---

## 关键设计决策

### 1. 为什么不用 GitHub Issue？

Issue 可以用，但摩擦点多：
- 每次交接要手动开 issue，仪式感重
- issue 和代码文件没有直接关联，查起来要跳转
- 通知延迟，不够实时
- 关闭 issue 后上下文容易丢失

仓库内文件的优势：和代码在一起，天然有版本历史，零额外工具依赖，任何能 git pull 的 Agent 都能读到。

### 2. 为什么不用实时通信（大象/Slack）？

实时通信适合紧急沟通，但不适合任务交接：
- 消息不持久，容易丢失上下文
- Agent 会话结束后无法回溯历史
- 无法携带结构化的代码片段和锚点

本项目的选择：**仓库文件为主（任务交接），大象为辅（紧急沟通）**。

### 3. 为什么用 inbox 文件而不是 PR/Review？

PR 适合代码审查，但对于"分析材料 → 写作任务"这种非对称交接，PR 的粒度太重。inbox 文件更轻量，追加一条消息就是一次通信，不需要开分支、发 PR、等 review。

### 4. 消息不删除的原因

inbox 文件里的消息处理完后只改状态，不删除。原因：
- 历史消息是协作上下文，新 Agent 实例启动时可以通过读历史快速了解项目状态
- 删除消息会破坏 git 历史的可读性
- 存储成本可以忽略

---

## 适用场景

这套机制适合以下条件同时满足的场景：

1. **多个 AI Agent 实例需要协作**，但运行在不同会话/进程里
2. **任务是异步的**，不需要实时响应
3. **已经在用 Git 仓库**管理项目产出
4. **角色分工明确**，每个角色有固定的输入和输出

不适合：需要实时交互的场景（比如 Agent A 等待 Agent B 的即时回复才能继续）。

---

## 可复用的模式

这套机制可以抽象为一个通用模式：

```
角色 A                    Git 仓库                    角色 B
  |                          |                          |
  |-- 写文件 + push -------> |                          |
  |                          | <------- pull + 读文件 --|
  |                          |                          |
  |                          | <-- 写文件 + push -------|
  | -- pull + 读文件 ------> |                          |
```

文件即消息，commit 即发送，pull 即接收。仓库是共享内存，git 是通信协议。

---

## 本项目实践效果

- 三个角色各自独立运行，互不阻塞
- 每个角色的产出都有明确的消费者
- 协作历史完整保留在 git log 里
- 新 Agent 实例启动时，通过读 inbox + architecture-notes + workflow 文档，可以在几分钟内了解项目全貌并接续工作
