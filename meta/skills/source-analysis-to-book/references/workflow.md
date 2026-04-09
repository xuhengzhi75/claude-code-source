# 工作流参考

## 三阶段主流程

### 阶段 A：仓库理解（不急着写章节）

目标：建立全局定位，不急着写章节。

步骤：
1. 找入口：CLI / daemon / HTTP / message ingress / agent runtime
2. 找主执行链：request → routing → orchestration → tools → state → output
3. 找状态载体：session、task、memory、checkpoint、recovery object
4. 找关键壁垒：tooling、runtime、安全边界、恢复机制、任务系统
5. 找异常闭环：失败、重试、续跑、超时、终止

产出（在 `<your-workspace>/architecture-notes/` 下，路径按 `workspace-structure.md` 约定）：
- `system-overview.md`：系统全局定位
- `runtime-structure.md`：运行时结构
- `execution-flow-guide.md`：执行链路图
- `task-recovery-map.md`：任务恢复路径

**关键约束**：不按目录树写，按"控制权转移"写。

---

### 阶段 B：深读与证据整理

目标：把"理解"变成可引用材料。

步骤：
1. 建立主题清单（如 QueryEngine / QueryLoop / Task / Tooling / Recovery）
2. 对每个主题建立证据卡：
   - `verified`：有源码锚点（文件 + 函数/分支/对象，关键点带行号）
   - `inference`：基于证据的推断，必须显式标注，措辞保守
   - `edge_cases`：边界情况和异常路径
   - `design_tradeoffs`：设计取舍和替代方案
   - `why_it_matters`：为什么这个机制重要
3. 生成章节证据卡与交接卡
4. 更新 coverage/status，避免重复劳动

产出（路径按 `workspace-structure.md` 约定）：
- `architecture-notes/*.md`：主题深读笔记
- `references/chapter-evidence-map.md`：章节证据映射
- `workflow/analysis-handoff-template.md`：交接模板

---

### 阶段 C：成书写作

目标：从材料库变成章节，不在写章时重新摸索源码。

步骤：
1. 先定每章的"第一性问题"（要解决的根本矛盾）
2. 从 evidence map 拉证据
3. **先画论点树，再写正文**（金字塔结构，见 `references/writing-rules.md`）
4. 每章加入：why now / design tradeoff / edge case / non-obvious conclusion
5. 写完后检查是否退化成说明书，是否有 AI 味词汇

产出（路径按 `workspace-structure.md` 约定）：
- `book/chapters/*.md`：章节正文
- 更新 `planning/completed-coverage-and-writing-queue.md`

---

### 阶段 D：通俗版写作（可选）

目标：把技术版章节改写为面向非技术读者的通俗版，不需要看代码，只需要对 AI 工具有好奇心。

触发条件：技术版章节已达标，且有意向更广泛的读者传播。

步骤：
1. 选取技术版中最有价值的核心结论（通常 3~5 个）
2. 为每个结论找一个生活化类比（后厨、工厂、快递等），类比讲完立刻进技术，不重复
3. 去掉源码锚点，保留设计意图和反直觉发现
4. 每篇 5~10 分钟读完，独立成文
5. 分四个部分组织：你以为你在用聊天工具（其实不是）→ 它是怎么工作的 → 为什么别人抄不走 → 这对你意味着什么

产出（路径按 `workspace-structure.md` 约定）：
- `book/easy-chapters/*.md`：通俗版文章
- `book/easy-chapters/README.md`：通俗版目录（含与技术版的对应关系）

**注意**：通俗版和技术版结论一致，讲法不同。不要为了通俗而牺牲准确性。

---

## 标准章节骨架

每章按这个结构写：

1. **核心主张**（一句话，可被反驳）
2. **第一性问题**（为什么需要这个机制）
3. **机制展开**（关键决策 + 为什么不是替代方案）
4. **证据锚点**（verified，含文件路径和行号）
5. **边界与技术债**（何时失效/何时退化）
6. **可迁移原则**（适用条件 + 反例）
7. **本章不覆盖项**（章节边界）

---

## 恢复上下文的最小读取路径

任何 Agent 恢复上下文时，按这个顺序读（路径相对于你的工作区根目录）：
1. `planning/project-status.md`（当前进度和下一步）
2. `status/status-index.md` + 最近一条 `status-*.md`（阶段快照）
3. `references/chapter-evidence-map.md`（章节覆盖情况）
4. 必要时再看具体的 `architecture-notes/` 或章节文件

**原则**：先读最小入口，不做全目录通读。先恢复状态，再继续修改。
