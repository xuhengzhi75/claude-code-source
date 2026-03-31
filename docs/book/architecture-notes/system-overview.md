# 系统总览（面向非技术读者）

## 一句话结论
这个系统像一个“分层值班台”：先由 `cli.tsx` 做入口分流，再由命令层与工具层装配可用能力，最后把一次次用户请求交给 QueryEngine + query 循环执行。

---

## 1) 从哪里开始：入口分流器
用户输入命令后，程序最先进入 `src/entrypoints/cli.tsx`。这里优先走大量“快速通道”（fast-path），比如 `--version`、`daemon`、`remote-control`、`--bg` 等，只有都不命中才加载完整 CLI 主程序。

**对非技术读者的意义：**
- 常见轻操作会更快响应；
- 后台服务、远程控制等重模式不会拖慢普通会话。

**源码依据：** `src/entrypoints/cli.tsx` 中 `main()` 里按参数分支动态 `import(...)`，最后才 `import('../main.js')`。

---

## 2) 命令层：把“可做的事”拼起来
`src/commands.ts` 负责合并多来源命令：
- 内建命令（大量 `import ./commands/...`）
- 技能目录命令（skills）
- 插件命令（plugins）
- 工作流命令（workflows）
- 动态发现技能（运行中补充）

它还会做两类过滤：
1. **可用性过滤**（账号/服务类型是否满足）
2. **启用状态过滤**（命令本身是否启用）

**对非技术读者的意义：**
- 你看到的命令，不是“写死的全量列表”，而是根据身份、配置、插件状态实时生成；
- 登录状态变化后，命令会即时变化，而不是重启后才变化。

**源码依据：**
- `getCommands(cwd)`：组合并过滤命令
- `meetsAvailabilityRequirement(cmd)`：按 claude-ai/console 条件过滤
- `loadAllCommands` 与 `COMMANDS` 使用 `memoize`，并在缓存清理函数中可控失效

---

## 3) 工具层：把“执行能力”拼起来
`src/tools.ts` 是工具池装配中心。它先给出理论可用全集（`getAllBaseTools()`），再按权限规则、运行模式（如 simple/repl/coordinator）过滤，最终得到可调用工具。

同时，它支持把内建工具和 MCP 工具合并（`assembleToolPool`），并处理重名冲突与顺序稳定。

**对非技术读者的意义：**
- 同一个产品形态可在不同风险级别运行（严格/简单/协调者模式）；
- 即使接入外部 MCP 工具，也能维持核心工具行为一致。

**源码依据：**
- `getAllBaseTools()`、`getTools(permissionContext)`、`filterToolsByDenyRules(...)`
- `assembleToolPool(...)`：内建 + MCP 合并与去重

---

## 4) 统一工具契约：避免“每个工具一套规矩”
`src/Tool.ts` 定义了工具接口（输入、权限检查、可读写判断、渲染等）和默认构建器 `buildTool()`。

核心思想：工具就算只实现最小必需能力，也会被安全默认值补齐（例如默认不可并发、默认非只读）。

**对非技术读者的意义：**
- 新工具扩展更快；
- 不容易因为“忘了实现某项安全判断”而出风险。

**源码依据：** `Tool` 类型定义、`TOOL_DEFAULTS`、`buildTool()`。

---

## 5) 运行核心：QueryEngine 与 query 的分工
- `src/QueryEngine.ts`：负责会话级编排（消息持久化、权限拒绝统计、预算与结果汇总、SDK 消息输出）
- `src/query.ts`：负责回合内状态机循环（模型调用、工具执行、恢复策略、压缩/折叠、继续或结束）

**对非技术读者的意义：**
- 同一套核心循环可被 CLI、SDK、远程端复用；
- 出错恢复、成本控制、上下文治理在同一主链路里完成，不靠外围脚本“补丁式兜底”。

**源码依据：**
- `QueryEngine.submitMessage()` 中 `for await (const message of query(...))`
- `queryLoop(...)` 的 `while(true)` 状态推进与 `State` 聚合

---

## 6) 这套架构最重要的三个价值
1. **快**：入口层大量 fast-path + 动态加载，冷启动压力小。  
2. **稳**：工具与命令都采用“先全集、后过滤”，再加权限 deny 规则，行为可审计。  
3. **可演进**：QueryEngine（编排）与 query（循环）解耦，便于扩展新入口和新恢复策略。

---

## 附：本页覆盖的主干源码文件
- `src/entrypoints/cli.tsx`
- `src/commands.ts`
- `src/tools.ts`
- `src/Tool.ts`
- `src/QueryEngine.ts`
- `src/query.ts`
