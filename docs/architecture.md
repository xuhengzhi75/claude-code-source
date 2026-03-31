# 架构分析：recovered_source

## 1. 系统分层

### A. 入口与模式分流层
- 文件：`src/entrypoints/cli.tsx`
- 作用：在最小启动成本下，根据参数进入不同运行模式（普通 CLI、daemon、bridge、bg session、模板任务等）。
- 特点：大量 fast-path + dynamic import，避免不必要模块初始化。

### B. 命令/工具装配层
- 命令：`src/commands.ts`
- 工具：`src/tools.ts` + `src/Tool.ts`
- 作用：构建当前会话可见能力集合（builtin + skill + plugin + workflow + MCP）。
- 特点：
  - `feature('...')` 参与裁剪；
  - 权限上下文可在“暴露给模型前”先过滤；
  - 多来源命令合并时做可用性与重复名处理。

### C. 查询编排层
- 文件：`src/QueryEngine.ts`
- 作用：承接 `submitMessage()`，管理消息列表、持久化、成本统计、SDK 事件产出。
- 特点：把“会话级生命周期”与“单轮 query 循环”解耦。

### D. 查询执行状态机层
- 文件：`src/query.ts`
- 作用：执行单轮对话状态机：模型请求、工具执行、压缩恢复、错误与预算分支。
- 特点：高分支密度，偏“编排内核”。

### E. 任务执行层
- 文件：`src/Task.ts`、`src/tasks.ts` + `src/tasks/*`
- 作用：抽象后台任务模型（spawn/kill/状态/输出文件）。
- 特点：任务类型可扩展、状态终态定义清晰。

### F. 横切层
- 成本：`src/cost-tracker.ts`
- 历史：`src/history.ts`
- 作用：会话可观测性与可恢复性基础设施。

---

## 2. 关键数据流（主链路）

1. 用户输入进入 QueryEngine（`submitMessage`）
2. 输入经 `processUserInput` 处理，可能触发 slash command 逻辑
3. 进入 `query()` 循环：
   - 组装上下文（含 user/system context）
   - 执行 compact / snip / collapse 等预处理
   - 调模型流式输出
   - 捕获 tool_use 并执行工具
   - 产出 tool_result 与附件
   - 根据 stop hooks / budget / maxTurns 决定继续或结束
4. QueryEngine 汇总消息、usage、成本、结果并产出 SDK result
5. transcript 与会话状态持久化

---

## 3. 关键设计决策

### 3.1 用“观察到 tool_use”而不是 stop_reason 决定 follow-up
`query.ts` 中明确不信任 `stop_reason === 'tool_use'` 的稳定性，而以真实流中出现的 tool_use block 作为后续回合条件。这是跨实现差异下的稳态策略。

### 3.2 多级 compact 组合，而不是单一压缩
在查询链路中同时存在：
- microcompact
- autocompact
- reactive compact
- history snip
- context collapse

这类组合式设计的核心价值是：把不同失败模式（上下文过长、媒体过大、缓存失配）拆给不同机制处理。

### 3.3 工具系统采用“厚接口”统一能力
`Tool` 类型不仅定义 call/input/output，还统一承载：
- 权限检查
- 并发安全声明
- destructive/readOnly 语义
- UI 渲染与摘要
- MCP 元数据映射
- 自动分类输入

这使新增 Tool 可接入完整运行时生态，但也提高了学习门槛。

### 3.4 入口极致懒加载，降低冷启动成本
`cli.tsx` 在参数层就分流并只加载对应依赖，体现了“CLI 首包性能优先”的强约束。

---

## 4. 技术壁垒（工程难点）

1. **分支耦合复杂**：query loop 中恢复逻辑互相影响，改动一处可能影响多个 continue/return 路径。
2. **消息一致性要求高**：tool_use / tool_result / transcript parent 链路必须一致，才能支持 resume 与回放。
3. **多形态兼容成本高**：REPL、SDK、remote-control、background session 共用核心代码，回归面广。
4. **Feature gate + runtime state 双重开关**：静态裁剪与动态配置并存，调试时必须同时确认。

---

## 5. 建议的最小改动策略

- 先改“纯函数或边缘分支”，避免先动主循环核心控制流。
- 任何触及 `query.ts` 的改动，都应先画出“进入条件/退出条件/continue 目标状态”。
- 任何触及消息结构的改动，都要检查：
  - transcript 写入路径
  - resume/replay 路径
  - SDK 事件映射路径

---

## 6. 未做推断的边界

本文只基于仓库内可见源码做结论，未引入外部文档或线上行为假设。
对于 feature flag 的实际开启比例、生产流量分布、具体 SLA 等，本文不做推断。
