# recovered_source 学习与架构导读

> 目标读者：首次接触该仓库、需要快速建立“能读懂 + 能改动 + 不踩坑”认知的人。

## 这是什么

这是一个 **Claude Code 核心运行时源码快照**（目录名为 `recovered_source`）。
从代码结构看，它包含：

- CLI 启动与分流（`src/entrypoints/cli.tsx`）
- 查询主循环（`src/query.ts`）
- 会话/状态驱动的 QueryEngine（`src/QueryEngine.ts`）
- 命令系统（`src/commands.ts`）
- 工具系统（`src/Tool.ts` + `src/tools.ts`）
- 任务系统（`src/Task.ts` + `src/tasks.ts`）
- 成本与会话历史等横切能力（`src/cost-tracker.ts`、`src/history.ts`）

## 先看哪几份文件（30~60 分钟上手路径）

1. **入口分流**：`src/entrypoints/cli.tsx`
   - 先理解“为什么这么多 fast-path + dynamic import”。
   - 重点看：普通 CLI 路径最终如何落到 `main`。

2. **工具/命令注册**：`src/tools.ts`、`src/commands.ts`
   - 理解“可用能力池”如何组装。
   - 重点看：feature flag、权限过滤、MCP 合并、去重与排序。

3. **查询引擎**：`src/QueryEngine.ts`
   - 理解一次 `submitMessage()` 的生命周期。
   - 重点看：消息持久化、回放、预算控制、结果汇总。

4. **模型-工具闭环**：`src/query.ts`
   - 这是最核心状态机。
   - 重点看：自动 compact、reactive compact、tool 执行、中断/重试分支。

5. **类型契约**：`src/Tool.ts`、`src/entrypoints/agentSdkTypes.ts`
   - 先掌握 Tool 接口和 SDK 消息模型，再改逻辑会稳很多。

## 核心架构（一句话）

该仓库采用 **“事件流 + 状态机 + 插件化工具/命令池”** 架构：

- QueryEngine 负责会话级编排；
- query loop 负责单轮内的模型调用、工具调度与恢复策略；
- Tool/Command/Task 通过统一契约接入；
- feature gate 与权限系统把“同一代码库多产品形态”收敛在运行时选择上。

详见：[`docs/architecture.md`](docs/architecture.md)

## 关键设计与技术壁垒（速览）

1. **高复杂度恢复路径**：prompt-too-long、max_output_tokens、fallback model、stop hooks、中断恢复等路径互相叠加。
2. **缓存与上下文压缩协同**：microcompact / autocompact / reactive compact / history snip / context collapse 不是单机制，而是组合机制。
3. **统一扩展面但强约束**：Tool 接口非常大，既支持 UI、权限、并发、安全分类、MCP 透传，又要保持 API 兼容。
4. **多运行形态共存**：REPL、SDK、daemon、bridge、background session 在同一主干代码内共存，通过 feature 与入口分流控制。

## 代码阅读建议

- 把 `query.ts` 当状态机读：先列“继续条件/终止条件”，再读每个 continue 分支。
- 把 `Tool.ts` 当协议文档读：先看 type，再看具体 Tool 实现。
- 修改前先确认当前 feature gate 是否打开，否则容易“改了但不生效”。

## 当前仓库状态说明

该目录未包含常见根级元信息文件（例如 `package.json`），更像“源码恢复包”。
因此本文档聚焦 **架构与阅读上手**，不提供可直接运行的标准构建命令。

---

如需进一步深入，建议下一步补一份：

- “query.ts 分支流程图（含关键 continue/return 路径）”
- “Tool 生命周期时序图（permission → execute → transcript）”
