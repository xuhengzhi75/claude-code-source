---
name: source-analysis-to-book
description: >
  将复杂代码仓库转化为一本结构化技术解读书的完整工作流 Skill。
  适用场景：需要深度理解一个陌生仓库、把源码分析沉淀为文档/章节/书稿、
  多人或多 Agent 协作写作、需要长周期推进并保持状态连续性、
  写通俗版科普文章、重写章节去 AI 味、画论点树、Feynman+Kernighan 风格写作。
  触发词：分析仓库、写书、源码解读、架构分析、成书、章节规划、证据整理、
  通俗版、easy-chapters、去 AI 味、论点树、重写章节、Feynman 风格。
---

# source-analysis-to-book

这个 Skill 把"理解一个复杂代码仓库"这件事产品化，输出可持续写作的材料体系，而不是一次性的分析报告。

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

多 Agent 通过 Git 仓库 inbox 文件异步通信的完整机制，详见：
- `docs/book-workspace/workflow/multi-agent-git-collab.md`（内部详细版）
- `blog/articles/multi-agent-git-collab.md`（对外分享版）

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
