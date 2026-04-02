# Book Writing Playbook（2026-04-01 ~ 2026-04-02）

## 目的

沉淀这两天在 `docs/book/` 做 Claude Code 源码分析与成书写作时形成的稳定方法，后续可直接抽取为 Claude Code / Codex / OpenClaw 可复用 Skill，用于新仓库的源码分析、结构理解、证据组织和章节生成。

---

## 一、这次实践里已经验证有效的核心原则

### 1. 不按目录树写，按“控制权转移”写
源码分析最容易退化成模块介绍。真正有效的切入点不是文件夹结构，而是：
- 请求从哪里进入
- 控制权交给了谁
- 哪些条件会继续/中断/恢复
- 哪些状态必须被保存
- 哪些组件一删系统就塌

结论：
> 写书时应优先围绕执行链路、状态机、恢复链路、边界 case，而不是围绕“模块列表”。

### 2. 每章必须回答一个“非显然问题”
如果一章只是解释“这是什么”，读感会很平。更好的写法是每章回答一个读者不容易自己想清楚的问题，例如：
- 为什么它不是普通聊天工具？
- 为什么 QueryLoop 不是简单 while 循环？
- 为什么任务恢复比任务执行更难？
- 为什么 tool system 是护城河的一部分而不是外围配件？

结论：
> 章节标题与正文都要有“张力”，围绕判断题和矛盾展开，而不是围绕名词解释展开。

### 3. 证据与判断要分层
高质量源码写作必须区分：
- **Verified**：源码、注释、配置、调用链中可直接验证的事实
- **Inference**：基于结构、接口、异常路径和组合关系推导出的判断

结论：
> 所有关键结论都应能回指到证据；推断可以写，但要标清是推断，不要伪装成事实。

### 4. “机制”和“效果”必须拆开写
一个章节如果把机制、价值、效果、体验混写，内容会发散。更稳的写法是：
1. 机制是什么
2. 为什么要这么设计
3. 带来了什么能力
4. 代价和限制是什么

结论：
> 写作时先解释机制，再谈价值；先说约束，再说优势。

### 5. 边界条件比主流程更能体现理解深度
真正体现理解的不是“正常路径会发生什么”，而是：
- 中断时怎么办
- 任务丢了怎么办
- 工具失败怎么办
- 上下文爆了怎么办
- 会话重启后怎么续上

结论：
> 后续分析新仓库时，优先追异常路径、恢复路径、回退路径和不可逆路径。

---

## 二、这次写作中暴露出的反模式

### 1. 反模式：模块罗列
表现：
- 按目录顺序写
- 每节都像 README
- 信息正确但没有穿透力

修正：
- 改成“主矛盾 + 关键链路 + 设计取舍”结构

### 2. 反模式：常识性总结
表现：
- 说了很多“AI 代理需要状态/工具/记忆”这类正确废话
- 没回答“这个系统为什么非这样不可”

修正：
- 逼自己写出：不可删组件、替代方案为何不行、它真正难在哪里

### 3. 反模式：主题驱动而非张力驱动
表现：
- 章节像说明书分类
- 缺问题意识
- 缺推进感

修正：
- 每章先写问题句，再围绕问题组织证据

### 4. 反模式：没有显式证据地图
表现：
- 结论散在多个文档中
- 交接后容易丢上下文

修正：
- 为章节建立 evidence map / handoff template / status index

---

## 三、已形成的稳定工作流（适合作为 Skill 主流程）

## 阶段 A：仓库理解
目标：建立全局定位，不急着写章节。

步骤：
1. 找入口：CLI / daemon / HTTP / message ingress / agent runtime
2. 找主执行链：request -> routing -> orchestration -> tools -> state -> output
3. 找状态载体：session、task、memory、checkpoint、recovery object
4. 找关键壁垒：tooling、runtime、安全边界、恢复机制、任务系统
5. 找异常闭环：失败、重试、续跑、超时、终止

产出：
- `system-overview`
- `runtime-structure`
- `execution-flow-guide`
- `task-recovery-map`

## 阶段 B：深读与证据整理
目标：把“理解”变成可引用材料。

步骤：
1. 建立主题清单（如 QueryEngine / QueryLoop / Task / Tooling / Recovery）
2. 对每个主题做：
   - verified facts
   - inferred design intent
   - hidden constraints
   - edge cases
   - why-it-matters
3. 生成章节证据卡与交接卡
4. 更新 coverage/status，避免重复劳动

产出：
- architecture notes
- evidence map
- analysis handoff
- progress/status docs

## 阶段 C：成书写作
目标：从材料库变成章节，不在写章时重新摸索源码。

步骤：
1. 先定每章问题句
2. 从 evidence map 拉证据
3. 先写论点骨架，再补事实
4. 每章加入：
   - why now
   - design tradeoff
   - edge case
   - non-obvious conclusion
5. 写完后检查是否退化成说明书

产出：
- chapter drafts
- chapter revisions
- completed coverage queue

---

## 四、推荐目录模型（后续 Skill 可复用）

建议对任何“源码分析成书/成资料”项目，统一使用：

- `book/README.md`：入口说明
- `book-workspace/planning/roadmap.md`：阶段规划
- `book-workspace/planning/project-status.md`：总状态
- `book-workspace/status/status-index.md`：状态索引
- `book/status-*.md`：阶段快照
- `book-workspace/references/chapter-evidence-map.md`：章节证据映射
- `book-workspace/workflow/analysis-handoff-template.md`：交接模板
- `book-workspace/architecture-notes/`：主题深读
- `book/chapters/`：章节正文
- `book-workspace/methodology/writing-guide.md`：写作规则
- `book-workspace/methodology/writing-principles.md`：写作原则
- `book-workspace/references/conversation-log.md`：关键用户要求与决策

补充建议：
- `book/research/`：原始调研、外链、截图、临时笔记
- `book/archive/`：废弃版本、旧提纲
- `book/assets/`：图、表、示意图
- `book-workspace/skills/`：后续沉淀出的自动化 skill 草案

---

## 五、适合抽成 Claude Code Skill 的能力边界

这个 Skill 不应只叫“写书”。更准确地说，它是：

> **面向复杂代码仓库的“分析 → 证据化 → 写作化 → 结构化交付”工作流 Skill**

它应支持：
- 新仓库快速建立全局理解
- 提炼系统核心矛盾与护城河
- 输出可验证的证据材料
- 自动生成章节/分析文档骨架
- 跟踪进度、状态、交接和覆盖率

不应承诺：
- 一次性全自动写完整本高质量书
- 在没有源码证据的情况下输出深度结论
- 跳过人工判断直接生成最终权威内容

---

## 六、Skill 设计建议

### Skill 名称候选
- `repo-book-writer`
- `source-analysis-to-book`
- `codebase-analysis-playbook`
- `architecture-to-manuscript`

更推荐：
- **`source-analysis-to-book`**

### Skill 输入
- 仓库路径
- 目标主题（可选）
- 输出目标：分析报告 / 章节草稿 / 全书骨架
- 受众定位：技术读者 / 管理者 / 初学者 / 产品视角

### Skill 输出
- 目录结构建议
- 扫描报告
- 核心主题列表
- 证据地图
- 章节问题清单
- 写作计划
- 初稿或章节骨架

### Skill 内部步骤
1. Scan repo
2. Identify entrypoints
3. Build execution-flow map
4. Extract system tensions and moat
5. Produce evidence notes
6. Generate chapter questions
7. Draft structured outputs
8. Track progress/status for continuation

---

## 七、后续真正做成 Skill 时的验收标准

至少满足：
1. 能在新仓库里生成稳定目录骨架
2. 能产出“不是模块罗列”的分析结果
3. 能把 verified / inference 分开
4. 能形成持续写作所需的 status / handoff / evidence docs
5. 能支持多轮续写，而不是一次性吐完

---

## 八、给未来自己的简明规则

1. 先找控制权，再找模块。
2. 先写问题，再写答案。
3. 先证据，再判断。
4. 先机制，再价值。
5. 先边界，再主流程。
6. 先做材料库，再写章节。
7. 任何时候都不要把源码分析写成说明书。

---

## 九、可直接复用的提示词方向

### 用于仓库初扫
> 不是按目录罗列，而是找这个系统的入口、执行链、状态载体、恢复机制、工具边界与不可删组件，并区分 verified facts 与 inference。

### 用于章节规划
> 给这套系统设计一组“非显然问题驱动”的章节，而不是功能说明书式目录。每章必须回答一个真正有张力的问题。

### 用于深读某个模块
> 分析这个模块在整个控制权转移链中的位置、上下游依赖、继续/终止/恢复条件、边界 case，以及它为什么不能被轻易删掉。

### 用于成稿检查
> 检查这章是否退化成模块介绍；如果是，重写为“矛盾—机制—约束—效果—非显然结论”的结构。
