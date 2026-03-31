# 核心文件导读清单（Core Files Guide）

> 目标：帮助维护者在改动前快速定位“入口、主链路、协议边界、状态机风险点”。

## 1) 启动与运行模式分流

### `src/entrypoints/cli.tsx`
- **模块定位**：CLI 总入口与模式路由器。
- **上游**：Node/Bun 进程参数（`process.argv`）、环境变量、build-time `feature()`。
- **下游**：按路径动态加载 `daemon/main`、`bridge/bridgeMain`、`cli/bg`、通用 CLI 主流程等。
- **阅读关注点**：
  1. fast-path 的顺序（`--version`、bridge、daemon、bg、templates）；
  2. 为什么很多路径“先判断再 import”；
  3. 鉴权/策略检查放在何处（尤其 bridge）。

---

## 2) 命令体系（Slash 命令装配）

### `src/commands.ts`
- **模块定位**：命令注册中心，合并内建命令 + feature-gated 命令 + 动态技能命令。
- **上游**：配置系统、feature gate、插件/技能加载器。
- **下游**：`processUserInput` 与 query 前处理（将 slash 命令转化为提示或本地执行）。
- **阅读关注点**：
  1. `COMMANDS` 的 lazy/memoize 策略；
  2. internal-only 命令与外部构建裁剪边界；
  3. 命令可见性与启用条件（避免“命令存在但不可用”误判）。

---

## 3) 会话编排层

### `src/QueryEngine.ts`
- **模块定位**：会话级编排器（多轮 turn 的状态持有者）。
- **上游**：调用侧（REPL/SDK/headless）传入 `QueryEngineConfig`。
- **下游**：`query()` 单轮状态机、会话存储、usage/cost 聚合、SDK 事件映射。
- **阅读关注点**：
  1. `submitMessage()` 的 turn 边界（清理 turn 状态、保留 session 状态）；
  2. `toolUseContext` 如何装配并传入 query；
  3. transcript/usage 在成功与异常路径下的一致性。

---

## 4) 单轮状态机内核

### `src/query.ts`
- **模块定位**：单轮 agentic turn 的状态机主循环。
- **上游**：`QueryEngine.submitMessage()` 传入消息、上下文、工具上下文、预算参数。
- **下游**：模型 API、工具执行编排、compact 机制、stop hooks、最终终态（Terminal）。
- **阅读关注点**：
  1. `State` 如何跨迭代更新（continue 分支后的原子替换）；
  2. tool_use/tool_result 配对与缺失修复逻辑；
  3. max_output_tokens、prompt too long、reactive compact、fallback 的交互路径；
  4. turn budget / task budget 的判定时机。

---

## 5) 工具协议与运行时上下文

### `src/Tool.ts`
- **模块定位**：工具系统类型契约（Tool/Tools/ToolUseContext/权限相关类型）。
- **上游**：QueryEngine/query 在调用工具前组装上下文。
- **下游**：所有具体 Tool 实现（Bash/File/Agent/MCP/...）和权限检查流程。
- **阅读关注点**：
  1. `ToolUseContext` 中“配置 vs 可变状态”的分层；
  2. 交互能力（UI/notification/elicitations）在 REPL 与 SDK 的差异；
  3. 权限上下文与工具决策缓存字段。

---

## 6) 工具注册表与暴露策略

### `src/tools.ts`
- **模块定位**：工具全集定义 + 最终暴露工具集裁剪。
- **上游**：feature gate、环境变量、权限上下文、运行模式（REPL/simple/worktree 等）。
- **下游**：模型可见工具列表（系统提示/函数调用能力边界）。
- **阅读关注点**：
  1. `getAllBaseTools()`（理论全集）与 `getTools()`（运行态裁剪）区别；
  2. deny rule 的“调用前剔除”策略；
  3. 与 system prompt 缓存一致性的约束注释。

---

## 7) 任务模型与调度注册

### `src/Task.ts`
- **模块定位**：任务类型、状态、ID 规则、基础状态结构。
- **上游**：task 创建/调度逻辑。
- **下游**：具体任务实现与 AppState 持久化。
- **阅读关注点**：
  1. `TaskStatus` 终态判定；
  2. `generateTaskId()` 的可读前缀 + 随机后缀设计；
  3. 输出路径与任务生命周期关联。

### `src/tasks.ts`
- **模块定位**：任务注册中心（按 feature 拼装可调度任务类型）。
- **上游**：feature gate。
- **下游**：`getTaskByType()` 分发与任务管理命令。
- **阅读关注点**：
  1. 注册表与生命周期逻辑分离；
  2. 可选任务（workflow/monitor）的加载边界。

---

## 建议阅读顺序（最短路径）
1. `src/entrypoints/cli.tsx`
2. `src/commands.ts` + `src/tools.ts`
3. `src/Tool.ts`
4. `src/QueryEngine.ts`
5. `src/query.ts`
6. `src/Task.ts` + `src/tasks.ts`

---

## 改动前检查清单（避免高回归）
- 是否同时评估了 **feature gate + runtime config** 两层开关？
- 是否确认了改动路径在 **REPL 与 SDK/headless** 两种模式下行为一致或明确差异？
- 是否检查 tool_use/tool_result 与 transcript 的一致性？
- 是否评估了 compact/recovery 分支对终态（Terminal）与 usage 统计的影响？
