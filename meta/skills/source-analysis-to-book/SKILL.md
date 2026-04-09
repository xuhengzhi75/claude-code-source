---
name: source-analysis-to-book
description: "将复杂代码仓库转化为一本结构化技术解读书的完整工作流 Skill。适用场景：深度理解陌生仓库、把源码分析沉淀为文档/章节/书稿、多人或多 Agent 协作写作、长周期推进并保持状态连续性、写通俗版科普文章、重写章节去 AI 味、画论点树、Feynman+Kernighan 风格写作。触发词：分析仓库、写书、源码解读、架构分析、成书、章节规划、证据整理、通俗版、easy-chapters、去 AI 味、论点树、重写章节、Feynman 风格。"
appkey: com.sankuai.raptor.iconfont.websdk
tags: 写作,源码分析,技术书,多Agent,架构分析
visibility: public
---

# source-analysis-to-book

这个 Skill 把"理解一个复杂代码仓库"这件事产品化，输出可持续写作的材料体系，而不是一次性的分析报告。

## 快速启动（第一次使用）

如果你是第一次使用这个 Skill，按以下步骤开始：

1. **确认目标仓库**：你要分析的仓库在哪里？是本地路径还是需要先 clone？
2. **建立工作区目录**：在项目根目录下创建 `docs/book-workspace/` 和 `docs/book/chapters/`（详见 `references/workspace-structure.md`）
3. **创建第一份状态文件**：`docs/book-workspace/planning/project-status.md`，写下当前目标和下一步
4. **开始阶段 A**：按 `references/workflow.md` 的阶段 A 流程，先找入口和主执行链，不要急着写章节

如果你是**恢复中断的工作**，直接读工作区下的 `planning/project-status.md`，然后按 `references/task-recipes.md` 的配方 2 继续。

---

## 核心原则

在开始任何工作之前，先记住这七条规则：

1. 先找控制权，再找模块。
2. 先写问题，再写答案。
3. 先证据，再判断。
4. 先机制，再价值。
5. 先边界，再主流程。
6. 先做材料库，再写章节。
7. 任何时候都不要把源码分析写成说明书。

## 工作流

详见 `references/workflow.md`。

## 目录结构规范

详见 `references/workspace-structure.md`。

## 写作规则

详见 `references/writing-rules.md`。

## 质量验收标准

详见 `references/quality-gates.md`。

## 多 Agent 协作规范

详见 `references/collaboration.md`。

## 多 Agent 通信机制

多 Agent 通过 Git 仓库 inbox 文件异步通信。核心机制：

- 每个角色在工作区的 `inbox/` 目录下有独立收件箱文件（`for-[角色名].md`）
- 消息格式：发件人 / 时间 / 主题 / 正文 / 状态（待处理 → 已处理 ✅）
- 任务完成后必须更新 inbox 状态字段，防止下一个 Agent 实例重复处理

详细机制见 `references/collaboration.md`。

## 提交规范

详见 `references/commit-conventions.md`。

## 反模式（必须避免）

- 按目录树平铺介绍模块
- 常识性空话（"AI 代理需要状态/工具/记忆"）
- 不区分 verified 事实与 inference 推断
- 没有证据地图就直接大篇幅写作
- 没有 status/handoff 导致中断后无法续写
- 把推断写成事实
- 写章节前不画论点树，直接平铺小节
- 小节标题是话题标签而不是论点（"持久化" vs "顺序颠倒时恢复能力消失"）
- 使用 AI 味词汇（"深入探讨"、"值得注意"、"不仅如此"、"核心洞察"）
- 使用破折号（`——`）或"不是……而是……"句式
- 比喻讲完后反复用类比解释同一件事
- 通俗版里为了易懂而牺牲准确性

## 参考资料读取顺序

1. `references/workflow.md`（主流程）
2. `references/workspace-structure.md`（目录规范）
3. `references/writing-rules.md`（写作规则）
4. `references/quality-gates.md`（验收标准）
5. `references/collaboration.md`（协作规范）
6. `references/commit-conventions.md`（提交规范）
7. `references/task-recipes.md`（具体任务配方）
