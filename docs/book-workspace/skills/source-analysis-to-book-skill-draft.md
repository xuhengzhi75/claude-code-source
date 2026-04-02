# source-analysis-to-book Skill Draft

## Skill Intent

将复杂代码仓库的理解过程产品化：从源码扫描、结构分析、证据整理，到章节规划、写作交接和持续产出，形成一个可复用的分析创作 Skill。

---

## 适用场景

- 需要快速理解一个陌生代码仓库
- 需要把源码分析沉淀成文档/章节/教程/书稿
- 需要多人或多 agent 协作写作
- 需要长周期推进并保持状态连续性

---

## Core Workflow

### Step 1: Repository Scan
输出：
- entrypoints
- primary execution paths
- state carriers
- major subsystems
- likely moat/barrier areas

### Step 2: Tension Mapping
识别：
- 系统在解决什么核心矛盾
- 哪些设计是在对抗复杂性
- 哪些限制塑造了当前架构

### Step 3: Evidence Collection
按主题建立：
- verified facts
- inference
- edge cases
- design tradeoffs
- why-it-matters

### Step 4: Writing Structure
生成：
- chapter questions
- outline
- evidence map
- handoff notes
- progress/status docs

### Step 5: Draft Generation
按统一结构出稿：
- 问题
- 机制
- 证据
- 约束/代价
- 非显然结论

### Step 6: Continuation Support
保存：
- status snapshots
- coverage map
- writing queue
- next actions

---

## Anti-Patterns

Skill 必须避免：
- 按目录树平铺介绍模块
- 常识性空话
- 不区分事实与推断
- 没有证据地图就直接大篇幅写作
- 没有 status/handoff 导致中断后无法续写

---

## Default Outputs

- `planning/planning/project-status.md`
- `status/status/status-index.md`
- `references/references/chapter-evidence-map.md`
- `workflow/workflow/analysis-handoff-template.md`
- `architecture-notes/*.md`
- `chapters/*.md`
- `methodology/methodology/writing-guide.md`
- `methodology/methodology/writing-principles.md`

---

## Evaluation Rubric

一个合格输出至少满足：
- 有系统主线，而不是散点描述
- 能回答“为什么这么设计”
- 能指出不可删组件与边界 case
- 能支撑多轮连续写作
- 能迁移到别的仓库复用

---

## Prompt Skeleton

> Analyze this repository not as a file tree walkthrough, but as a control-flow, state, recovery, and tool-boundary system. Separate verified facts from inference. Produce reusable evidence notes, chapter questions, and writing artifacts that can support a long-form technical book or deep-dive documentation project.
