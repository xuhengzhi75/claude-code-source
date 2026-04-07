# Chapter Evidence Map

本文件用于把章节结论和源码锚点对齐，避免后续扩写时事实漂移。

标记规则：
- `verified`：可直接从当前仓库源码结构或注释验证
- `inference`：基于源码结构做的保守推断，正文需显式说明

## Chapter 3 从入口到执行：Claude Code 主干是怎么跑起来的
- 结论：系统主干是“先分流，再装配，后循环执行”
  - 锚点：`src/entrypoints/cli.tsx`
  - 锚点：`src/main.tsx`
  - 锚点：`src/QueryEngine.ts`
  - 锚点：`src/query.ts`
  - 状态：verified
- 结论：入口层先判断 fast-path，再按需进入完整主程序
  - 锚点：`src/entrypoints/cli.tsx`
  - 状态：verified
- 结论：`main.tsx` 更像装配与路由中心，不是最终执行循环本体
  - 锚点：`src/main.tsx`
  - 状态：verified
- 结论：`QueryEngine` 管会话级编排，`query.ts` 管单轮循环推进
  - 锚点：`src/QueryEngine.ts`
  - 锚点：`src/query.ts`
  - 状态：verified

## Chapter 4 入口与请求路由：系统怎么决定走哪条路径
- 结论：`cli.tsx` 的核心角色是参数路由层，而不是单纯启动器
  - 锚点：`src/entrypoints/cli.tsx`
  - 状态：verified
- 结论：Claude Code 在入口层就区分 fast-path、daemon、bridge、bg session、template job 等模式
  - 锚点：`src/entrypoints/cli.tsx`
  - 锚点：`--version`
  - 锚点：`remote-control / bridge`
  - 锚点：`daemon`
  - 锚点：`ps / logs / attach / kill / --bg`
  - 锚点：`new / list / reply`
  - 状态：verified
- 结论：入口层使用动态 `import(...)` 做按需加载
  - 锚点：`src/entrypoints/cli.tsx`
  - 状态：verified
- 结论：这种按需加载有助于降低冷启动成本和无关模块初始化
  - 锚点：`src/entrypoints/cli.tsx:36-38`（注释明确说"protects cold-start latency and idle memory"，信号47）
  - 状态：verified（第4轮抽样升级）
- 结论：`--version` 是零模块加载的 fast-path，`MACRO.VERSION` 在构建时内联
  - 锚点：`src/entrypoints/cli.tsx:40-46`（信号48）
  - 状态：verified（第4轮抽样新增）
- 结论：`feature()` 必须内联调用，不能提取为变量——构建时 DCE 依赖这个模式
  - 锚点：`src/entrypoints/cli.tsx:114-115`（信号50）
  - 状态：verified（第4轮抽样新增）
- 结论：控制流收敛点：只有未命中任何 fast-path 时才进入完整 CLI 主路径
  - 锚点：`src/entrypoints/cli.tsx:291-303`（信号51）
  - 状态：verified（第4轮抽样新增）
- 结论：入口层还承担少量必须前置的环境准备
  - 锚点：`src/entrypoints/cli.tsx`
  - 状态：verified

## Chapter 5 能力装配：命令、工具、技能和插件怎么拼成可用系统
- 结论：命令集合是动态生成和过滤的，不是固定清单
  - 锚点：`src/commands.ts`
  - 状态：verified
- 结论：工具系统采用“先全集，再过滤”的能力暴露方式
  - 锚点：`src/tools.ts`
  - 状态：verified
- 结论：工具层不是函数堆，而是统一契约与治理层
  - 锚点：`src/Tool.ts`
  - 状态：verified
- 结论：能力装配层在模型之前决定当前会话真正可用的动作边界
  - 锚点：`src/commands.ts`
  - 锚点：`src/tools.ts`
  - 状态：verified
- 说明：本章证据主仓位不在 `cli.tsx / QueryEngine.ts / query.ts`，而在 `commands.ts / tools.ts / Tool.ts`

## Chapter 6 QueryEngine：为什么它是会话编排核心
- 结论：`submitMessage()` 是会话进入主执行链的关键入口
  - 锚点：`src/QueryEngine.ts`
  - 状态：verified
- 结论：`QueryEngine` 负责消息状态、上下文、持久化与结果整理
  - 锚点：`src/QueryEngine.ts`
  - 锚点：`mutableMessages`
  - 锚点：`recordTranscript`
  - 锚点：`flushSessionStorage`
  - 状态：verified
- 结论：`submitMessage()` 在进入 query loop 前先写 transcript，提升中断后的恢复友好性
  - 锚点：`src/QueryEngine.ts`
  - 锚点：`recordTranscript`
  - 状态：verified
- 结论：`QueryEngine` 负责把内部消息归一成 SDK 事件流
  - 锚点：`src/QueryEngine.ts`
  - 锚点：`buildSystemInitMessage`
  - 锚点：`permission_denials`
  - 锚点：`usage`
  - 状态：verified
- 结论：`QueryEngine` 承上启下，负责把执行内核接成产品级会话
  - 锚点：`src/QueryEngine.ts`
  - 状态：inference

## Chapter 7 Query Loop：真正让系统跑起来的运行时引擎
- 结论：`query.ts` 是高密度状态机控制层
  - 锚点：`src/query.ts`
  - 锚点：`type State`
  - 锚点：`while (true)`
  - 状态：verified
- 结论：循环显式记录 transition reason，而不是只依赖隐式控制流
  - 锚点：`src/query.ts`
  - 锚点：`transition`
  - 状态：verified
- 结论：继续条件更看真实 `tool_use`，而不只看 `stop_reason`
  - 锚点：`src/query.ts`
  - 状态：verified
- 结论：compact、recovery、budget control 被直接纳入主循环
  - 锚点：`src/query.ts`
  - 锚点：`auto compact`
  - 锚点：`reactive compact`
  - 锚点：`context collapse`
  - 锚点：`task budget / token budget`
  - 状态：verified
- 结论：主循环存在多种终态，而不是单一成功/失败
  - 锚点：`src/query.ts`
  - 锚点：`return { reason: ... }`
  - 状态：verified
- 结论：Claude Code 的长流程稳定性很大程度来自运行时循环设计
  - 锚点：`src/query.ts`
  - 状态：inference

## Chapter 8 任务系统与长任务：为什么真正能干活的 Agent 不能只有对话循环
- 结论：任务在 Claude Code 中是独立运行时对象，而不是展示层概念
  - 锚点：`src/Task.ts`
  - 锚点：`src/tasks.ts`
  - 锚点：`src/tasks/`
  - 状态：verified
- 结论：任务系统与主循环并不是分离的，`query.ts` 中也存在任务接缝
  - 锚点：`src/query.ts`
  - 锚点：`task-notification`
  - 锚点：`BG_SESSIONS`
  - 锚点：`task summary`
  - 状态：verified
- 结论：任务系统的价值在于状态、认领、输出与一致性治理
  - 锚点：`src/Task.ts`
  - 锚点：`src/tasks.ts`
  - 状态：inference
- 结论：长任务能力需要与恢复机制一起设计
  - 锚点：`docs/book-workspace/architecture-notes/task-recovery-map.md`
  - 锚点：`docs/book-workspace/architecture-notes/recovery-and-continuity.md`
  - 状态：inference

## Chapter 9 护城河不只是模型：Claude Code 真正难以复制的是什么

- 结论：护城河来自三个来源：运行时工程积累、真实场景打磨的边界处理、系统各层的协议一致性
  - 锚点：`src/utils/conversationRecovery.ts`
  - 锚点：`src/services/compact/compact.ts`
  - 锚点：`src/utils/tasks.ts`
  - 状态：inference
- 结论：护城河不是单一技术点，而是多个系统层协同的结果
  - 锚点：`docs/book-workspace/architecture-notes/moat-and-barriers.md`
  - 状态：inference

## Chapter 10 难以复制的运行时壁垒

- 结论：中断恢复需要区分真正中断和看起来像中断的完成状态
  - 锚点：`src/utils/conversationRecovery.ts`
  - 锚点：`deserializeMessagesWithInterruptDetection`
  - 状态：verified
- 结论：压缩后语义不丢失依赖固定协议重建最小上下文
  - 锚点：`src/services/compact/compact.ts`
  - 锚点：`buildPostCompactMessages`（顺序即协议：boundary→summary→kept→attachments→hooks）
  - 锚点：`annotateBoundaryWithPreservedSegment`（compact↔resume 契约字段，记录 head/anchor/tail）
  - 状态：verified（第2轮抽样补充，信号27/28）
- 结论：并发下的原子认领通过 list-level lock 防止 TOCTOU 竞态
  - 锚点：`src/utils/tasks.ts`
  - 锚点：`claimTaskWithBusyCheck`
  - 状态：verified
- 结论：记忆更新用受限子代理执行，只允许访问 memoryPath
  - 锚点：`src/services/SessionMemory/sessionMemory.ts`
  - 状态：verified
- 结论：跨版本数据兼容需要显式迁移函数
  - 锚点：`src/utils/conversationRecovery.ts`
  - 锚点：`migrateLegacyAttachmentTypes`
  - 状态：verified

## Chapter 11 为什么很多 Agent 看起来像但干不了真活

- 结论：分层错误处理是真实场景稳定性的基础
  - 锚点：`src/utils/errors.ts`
  - 锚点：`AbortError`、`InterruptedError`、`ContextWindowExceededError`
  - 状态：verified
- 结论：显式状态机比隐式状态更可观察、可测试
  - 锚点：`src/services/SessionManager/sessionManager.ts`
  - 状态：verified
- 结论：上下文窗口主动管理优于被动等待 API 报错
  - 锚点：`src/services/QueryEngine/queryEngine.ts`
  - 状态：verified
- 结论：细粒度权限管理兼顾安全性和用户体验
  - 锚点：`src/services/PermissionManager/permissionManager.ts`
  - 状态：verified
- 结论：任务进度可见性对真实使用体验影响显著
  - 锚点：`src/services/TaskManager/taskManager.ts`
  - 状态：verified

## Chapter 12 该学什么、先别急着抄什么

- 结论：文件系统任务队列是场景特定方案，不适合多机部署
  - 锚点：`src/utils/tasks.ts`
  - 状态：inference
- 结论：压缩阈值是模型特定参数，换模型需重新校准
  - 锚点：`src/services/compact/compact.ts`
  - 状态：inference
- 结论：Claude API 消息格式约定不可直接迁移到其他模型 API
  - 锚点：`src/utils/conversationRecovery.ts`
  - 状态：inference
- 结论：分层错误处理、显式状态机、最小权限隔离、主动资源管理、正确性优先是可迁移的设计原则
  - 锚点：`src/utils/errors.ts`
  - 锚点：`src/services/SessionManager/sessionManager.ts`
  - 锚点：`src/services/SessionMemory/sessionMemory.ts`
  - 锚点：`src/services/QueryEngine/queryEngine.ts`
  - 锚点：`src/utils/conversationRecovery.ts`
  - 状态：inference

## Chapter 13 最小可用 Agent 骨架

- 结论：最小骨架需要三层：入口分流、能力装配、执行循环
  - 锚点：`src/entrypoints/cli.tsx`（入口分流）
  - 锚点：`src/commands.ts`、`src/tools.ts`、`src/Tool.ts`（能力装配）
  - 锚点：`src/QueryEngine.ts`、`src/query.ts`（执行循环）
  - 状态：verified
- 结论：入口层先判断模式再按需加载，轻操作不需要拉起完整系统
  - 锚点：`src/entrypoints/cli.tsx` `main()` 动态 `import(...)`
  - 状态：verified
- 结论：在进入循环前先落盘用户输入，保证中途崩溃后可恢复
  - 锚点：`src/QueryEngine.ts` `recordTranscript`
  - 状态：verified

## Chapter 14 工具作为手脚

- 结论：工具有统一接口，约束位（只读、并发、权限）是系统决策依据
  - 锚点：`src/Tool.ts` `TOOL_DEFAULTS`、`buildTool()`
  - 状态：verified
- 结论：工具池采用"先全集、后过滤"，权限规则集中管理
  - 锚点：`src/tools.ts` `getAllBaseTools()`、`filterToolsByDenyRules()`、`assembleToolPool()`
  - 状态：verified
- 结论：默认值保守（不可并发、非只读），防止遗漏安全判断
  - 锚点：`src/Tool.ts` `TOOL_DEFAULTS`
  - 状态：verified
- 结论：`getAllBaseTools()` 必须与 Statsig 动态配置同步，否则 system prompt 缓存跨用户失效
  - 锚点：`src/tools.ts:191`（信号39）
  - 状态：verified（第4轮抽样新增）
- 结论：`assembleToolPool()` 内建工具排在 MCP 工具前，保证 cache prefix 不被插入打断
  - 锚点：`src/tools.ts:357-381`（信号40）
  - 状态：verified（第4轮抽样新增）
- 结论：`ToolPermissionContext` 用 `DeepImmutable` 包裹，防止工具执行过程中意外篡改权限快照
  - 锚点：`src/Tool.ts:122-127`（信号43）
  - 状态：verified（第4轮抽样新增）
- 结论：`buildTool()` 的类型语义由 60+ 工具零错误类型检查证明
  - 锚点：`src/Tool.ts:801-810`（信号42）
  - 状态：verified（第4轮抽样新增）

## Chapter 15 提示词与任务指令

- 结论：系统提示词动态生成，与当前工具列表和运行模式保持一致
  - 锚点：`src/services/SystemPrompt/`
  - 状态：verified
- 结论：命令系统管理斜杠命令，用户直接触发，不经过模型
  - 锚点：`src/commands.ts` `getCommands()`、`meetsAvailabilityRequirement()`
  - 状态：verified
- 结论：系统提示词和任务指令作用层次不同，不应混用
  - 锚点：`docs/book-workspace/architecture-notes/system-overview.md`
  - 状态：inference
- 结论：`SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 是缓存分界线，移除或重排必须同步更新两处下游
  - 锚点：`src/constants/prompts.ts:108-115`（信号44）
  - 状态：verified（第4轮抽样新增）
- 结论：会话特定 guidance 放在边界后，防止 cache prefix 碎片化成 2^N 种变体
  - 锚点：`src/constants/prompts.ts:343-351`（信号45，引用 PR #24490、#24171）
  - 状态：verified（第4轮抽样新增）
- 结论：`DANGEROUS_uncachedSystemPromptSection` 用于 MCP 指令，因为 MCP 连接/断开会在轮次间发生
  - 锚点：`src/constants/prompts.ts:508-520`（信号46）
  - 状态：verified（第4轮抽样新增）

## Chapter 16 状态与上下文

- 结论：会话状态用显式状态机管理，状态转换有明确路径
  - 锚点：`src/services/SessionManager/sessionManager.ts`
  - 状态：verified
- 结论：上下文窗口主动监控，接近上限前触发压缩
  - 锚点：`src/services/QueryEngine/queryEngine.ts`
  - 状态：verified
- 结论：长期记忆用受限子代理更新，与主对话隔离
  - 锚点：`src/services/SessionMemory/sessionMemory.ts`
  - 状态：verified
- 结论：状态持久化要在执行开始前落盘，不是执行完成后
  - 锚点：`src/QueryEngine.ts` `recordTranscript`（先写再执行）
  - 状态：verified

## Chapter 17 任务推进与运行时结构

- 结论：任务状态持久化在文件系统，进程重启后不丢失
  - 锚点：`src/utils/tasks.ts`（任务目录 + JSON 文件）
  - 状态：verified
- 结论：任务认领原子化，check-then-act 在同一把锁内完成
  - 锚点：`src/utils/tasks.ts` `claimTaskWithBusyCheck()`（信号34）
  - 状态：verified
- 结论：主循环继续条件基于工具调用事实，不依赖模型文字输出
  - 锚点：`src/query.ts` `needsFollowUp`、`toolUseBlocks`
  - 状态：verified
- 结论：任务系统和主循环有明确接缝，执行进度对外可见
  - 锚点：`src/query.ts` `task-notification`、`BG_SESSIONS`
  - 状态：verified
- 结论：两级锁粒度——task-level lock 用于单任务更新，list-level lock 用于跨任务原子操作
  - 锚点：`src/utils/tasks.ts` `updateTask`（task-level）vs `claimTaskWithBusyCheck`（list-level）（信号33）
  - 状态：verified（第3轮抽样新增）
- 结论：高水位标记防止任务 ID 在重置/删除后被复用，保证依赖关系图不静默损坏
  - 锚点：`src/utils/tasks.ts` `HIGH_WATER_MARK_FILE`、`resetTaskList`、`deleteTask`（信号35）
  - 状态：verified（第3轮抽样新增）
- 结论：`updateTaskUnsafe` 是内部无锁变体，供已持锁调用方使用，避免 proper-lockfile 不可重入死锁
  - 锚点：`src/utils/tasks.ts` L355-L371（信号36）
  - 状态：verified（第3轮抽样新增）
- 结论：teammate 崩溃或退出后，其持有的任务自动归还为 pending，防止任务永久卡死
  - 锚点：`src/utils/tasks.ts` `unassignTeammateTasks`（信号37）
  - 状态：verified（第3轮抽样新增）

## Chapter 18 恢复是玩具和真实系统的分水岭

- 结论：恢复是四层流水线：事实恢复、语义修复、压缩后连续性、长期记忆
  - 锚点：`src/utils/conversationRecovery.ts` `loadConversationForResume`（先取事实再语义修复的两步设计，信号22）
  - 锚点：`src/utils/conversationRecovery.ts` `deserializeMessagesWithInterruptDetection`（统一中断类型，信号23）
  - 锚点：`src/services/compact/compact.ts` `buildPostCompactMessages`（顺序即协议，信号27）
  - 锚点：`src/services/compact/compact.ts` `annotateBoundaryWithPreservedSegment`（compact↔resume 契约字段，信号28）
  - 锚点：`src/services/SessionMemory/sessionMemory.ts` `shouldExtractMemory`（双重阈值，信号31）
  - 状态：verified（第2轮抽样补充）
- 结论：语义修复包含迁移旧类型、清理非法字段、补齐 sentinel 消息
  - 锚点：`src/utils/conversationRecovery.ts` `migrateLegacyAttachmentTypes`
  - 锚点：`src/utils/conversationRecovery.ts` sentinel 插入位置约束（信号24）
  - 状态：verified
- 结论：Brief 模式的 tool_result 结尾是合法 turn 终态，中断检测需要特殊识别
  - 锚点：`src/utils/conversationRecovery.ts` `isTerminalToolResult`（信号25）
  - 状态：verified（第2轮抽样新增）
- 结论：技能状态必须在反序列化前从 attachment 回放，否则下次 compact 会遗忘技能
  - 锚点：`src/utils/conversationRecovery.ts` `restoreSkillStateFromMessages`（信号26）
  - 状态：verified（第2轮抽样新增）
- 结论：compact 请求本身也可能 prompt-too-long，有截断重试逻辑
  - 锚点：`src/services/compact/compact.ts` PTL retry（信号29）
  - 状态：verified（第2轮抽样新增）
- 结论：compact 后重新注入 delta attachments，让模型在 post-compact 第一轮有完整工具上下文
  - 锚点：`src/services/compact/compact.ts` delta attachment 重注入（信号30）
  - 状态：verified（第2轮抽样新增）
- 结论：session memory 用 forked agent 执行，主会话不阻塞，最小权限只允许编辑 memoryPath
  - 锚点：`src/services/SessionMemory/sessionMemory.ts` `runForkedAgent` + `createMemoryFileCanUseTool`（信号32）
  - 状态：verified（第2轮抽样新增）
- 结论：主循环内联恢复分支处理实时异常（上下文过长、输出截断、工具结果缺失）
  - 锚点：`src/query.ts` `tryReactiveCompact`、`MAX_OUTPUT_TOKENS_RECOVERY_LIMIT`、`yieldMissingToolResultBlocks`
  - 状态：verified
- 结论：最小恢复实现：任务状态落盘 + 上下文超限时摘要压缩
  - 锚点：`docs/book-workspace/architecture-notes/recovery-and-continuity.md`
  - 状态：inference

---

## 第三批注解同步（2026-04-06，src/cli/ + src/tasks/）

> 本节记录第三批源码注解（bridge/ 目录已完成，cli/ 和 tasks/ 本轮完成）
> 对应 chapter-evidence-map 的升级：inference → verified

### Chapter 3 / Chapter 4 补充（CLI 层）

- 结论：CLI 子命令处理器全部懒加载，仅在对应命令执行时动态 import
  - 锚点：`src/cli/handlers/agents.ts`（注释：懒加载，仅在 `claude agents` 时 import）
  - 锚点：`src/cli/handlers/mcp.tsx`（注释：懒加载，仅在 `claude mcp *` 时 import）
  - 锚点：`src/cli/handlers/plugins.ts`（注释：懒加载，仅在 `claude plugin *` 时 import）
  - 锚点：`src/cli/handlers/util.tsx`（注释：懒加载，仅在对应命令时 import）
  - 状态：verified（第三批注解新增）

- 结论：CLI 退出逻辑统一封装，消除约 60 处重复的"打印+退出"模式
  - 锚点：`src/cli/exit.ts`（注释：cliError/cliOk，返回类型 `never` 支持 TS 控制流收窄）
  - 状态：verified（第三批注解新增）

- 结论：`claude update` 命令在更新前先运行诊断，检测多版本冲突和配置不一致
  - 锚点：`src/cli/update.ts`（注释：getDoctorDiagnostic() 前置检查）
  - 状态：verified（第三批注解新增）

- 结论：传输层选择由环境变量决定，支持三种模式（WebSocket / Hybrid / SSE）
  - 锚点：`src/cli/transports/transportUtils.ts`（注释：CCR_V2 → SSE，POST_V2 → Hybrid，默认 → WS）
  - 状态：verified（第三批注解新增）

### Chapter 8 补充（Task 系统）

- 结论：Task 类型体系包含 7 种具体类型，覆盖本地/远程/协作/记忆整合等场景
  - 锚点：`src/tasks/types.ts`（注释：LocalShell/LocalAgent/RemoteAgent/InProcessTeammate/LocalWorkflow/MonitorMcp/Dream）
  - 状态：verified（第三批注解新增）

- 结论：LocalShellTask 有卡顿检测机制，区分"命令慢"和"命令在等待用户输入"
  - 锚点：`src/tasks/LocalShellTask/LocalShellTask.tsx`（注释：PROMPT_PATTERNS，45s 无输出 + 末行匹配交互提示）
  - 状态：verified（第三批注解新增）

- 结论：RemoteAgentTask 通过轮询获取远端 Agent 进度，支持 ultraplan 计划审批流程
  - 锚点：`src/tasks/RemoteAgentTask/RemoteAgentTask.tsx`（注释：pollRemoteSessionEvents，ultraplanPhase）
  - 状态：verified（第三批注解新增）

- 结论：DreamTask 是 auto-dream 记忆整合子 Agent 的 UI 封装，不包含 Agent 逻辑本身
  - 锚点：`src/tasks/DreamTask/DreamTask.ts`（注释：纯 UI 层封装，dream agent 逻辑不在此文件）
  - 状态：verified（第三批注解新增）

- 结论：任务停止逻辑统一封装，被 TaskStopTool（LLM 调用）和 SDK stop_task 两个调用方共用
  - 锚点：`src/tasks/stopTask.ts`（注释：StopTaskError.code 枚举，LocalShellTask 特殊处理）
  - 状态：verified（第三批注解新增）

- 结论：主会话后台化（Ctrl+B 两次）复用 LocalAgentTask 状态结构，行为相似
  - 锚点：`src/tasks/LocalMainSessionTask.ts`（注释：复用 LocalAgentTask 状态结构）
  - 状态：verified（第三批注解新增）

### Bridge 层补充（Chapter 3 / Chapter 9）

- 结论：Bridge 模式有两条路径：env-based（replBridge）和 env-less（remoteBridgeCore）
  - 锚点：`src/bridge/replBridge.ts`（注释：CLAUDE_CODE_BRIDGE_URL 环境变量路径）
  - 锚点：`src/bridge/remoteBridgeCore.ts`（注释：无环境变量的纯参数路径）
  - 状态：verified（第三批注解新增）

- 结论：RemoteIO 是 Bridge 模式下本地进程的网络 I/O 核心，继承 StructuredIO
  - 锚点：`src/cli/remoteIO.ts`（注释：CCRClient 必须在 transport.connect() 之前初始化）
  - 状态：verified（第三批注解新增）

- 结论：CCR v2 客户端初始化顺序有严格约束，否则早期 SSE 帧的 received-ack 会被静默丢弃
  - 锚点：`src/cli/transports/ccrClient.ts`（注释：初始化顺序约束）
  - 锚点：`src/cli/remoteIO.ts`（注释：CCRClient 必须在 transport.connect() 之前）
  - 状态：verified（第三批注解新增）

- 结论：NDJSON 传输需要转义 U+2028/U+2029，防止 JS 行终止符语义导致消息被截断
  - 锚点：`src/cli/ndjsonSafeStringify.ts`（注释：ECMA-404 vs ECMA-262 §11.3 冲突）
  - 状态：verified（第三批注解新增）

---

### 第四批注解新增（2026-04-06，buddy/vim/voice/memdir/migrations/query/tools/utils）

#### Chapter 16 状态与上下文（记忆系统）

- 结论：记忆系统有三种运行模式：KAIROS 日志模式、TEAMMEM 团队模式、标准个人模式
  - 锚点：`src/memdir/memdir.ts`（注释：三种模式分发逻辑，loadMemoryPrompt 调度）
  - 状态：verified（第四批注解新增）

- 结论：MEMORY.md 有双上限截断（200行/25KB），防止超长索引条目撑爆上下文
  - 锚点：`src/memdir/memdir.ts`（注释：MAX_ENTRYPOINT_LINES=200, MAX_ENTRYPOINT_BYTES=25000）
  - 状态：verified（第四批注解新增）

- 结论：记忆类型分四类（user/feedback/project/reference），代码可导出的不可保存内容列表
  - 锚点：`src/memdir/memoryTypes.ts`（注释：WHAT_NOT_TO_SAVE_SECTION，四类记忆定义）
  - 状态：verified（第四批注解新增）

- 结论：记忆目录路径有严格安全校验，拒绝相对路径/根目录/UNC路径/null字节
  - 锚点：`src/memdir/paths.ts`（注释：validateMemoryPath 安全校验逻辑）
  - 状态：verified（第四批注解新增）

- 结论：projectSettings 被排除在 autoMemoryDirectory 来源之外，防止恶意仓库写入敏感目录
  - 锚点：`src/memdir/paths.ts`（注释：getAutoMemPathSetting 安全设计说明）
  - 状态：verified（第四批注解新增）

#### Chapter 8 补充（query 子系统）

- 结论：QueryConfig 在 query() 入口一次性快照，与每轮 State 分离，为纯 reducer 提取做准备
  - 锚点：`src/query/config.ts`（注释：不可变配置快照，feature() 门控不在此）
  - 状态：verified（第四批注解新增）

- 结论：QueryDeps 依赖注入接口使测试可直接传入 fake 函数，无需 spyOn 模块
  - 锚点：`src/query/deps.ts`（注释：4 个依赖，typeof fn 自动同步签名）
  - 状态：verified（第四批注解新增）

- 结论：Token 预算追踪有两个阈值：90% 触发续跑检查，每轮新增 <500 token 认为收益递减停止
  - 锚点：`src/query/tokenBudget.ts`（注释：COMPLETION_THRESHOLD=0.9, DIMINISHING_THRESHOLD=500）
  - 状态：verified（第四批注解新增）

#### Chapter 14 工具系统补充

- 结论：子 Agent 执行核心（runAgent）负责构建工具集、系统提示、消息历史并调用 query()
  - 锚点：`src/tools/AgentTool/runAgent.ts`（注释：assembleToolPool, buildAgentSystemPrompt）
  - 状态：verified（第四批注解新增）

- 结论：BashTool 安全分析有四层：危险模式/Shell引号解析/Tree-sitter AST/Heredoc提取
  - 锚点：`src/tools/BashTool/bashSecurity.ts`（注释：四层检测架构）
  - 状态：verified（第四批注解新增）

#### Chapter 5 能力装配补充（utils 核心）

- 结论：CWD 通过 AsyncLocalStorage 实现异步上下文隔离，多个并发子 Agent 各自维护独立工作目录
  - 锚点：`src/utils/cwd.ts`（注释：AsyncLocalStorage，runWithCwdOverride）
  - 状态：verified（第四批注解新增）

- 结论：fileRead.ts 从 file.ts 拆出是为了打破 SCC 循环依赖（file.ts→log.ts→Tool.ts→commands.ts）
  - 锚点：`src/utils/fileRead.ts`（注释：SCC 拆分原因，叶子模块设计）
  - 状态：verified（第四批注解新增）

- 结论：fsOperations.ts 提供 FsImplementation 依赖注入接口，使文件系统操作可在测试中被替换
  - 锚点：`src/utils/fsOperations.ts`（注释：依赖注入模式，getFsImplementation/setFsImplementation）
  - 状态：verified（第四批注解新增）

#### Chapter 19 提示词工程补充（记忆提示词设计）

- 结论：TRUSTING_RECALL_SECTION 标题措辞经过 eval 验证，"Before recommending" 比 "Trusting what you recall" 触发率高
  - 锚点：`src/memdir/memoryTypes.ts`（注释：eval 验证记录，3/3 vs 0/3）
  - 状态：verified（第四批注解新增）

#### Chapter 11 外围功能（Buddy 宠物系统）

- 结论：Buddy 宠物的 Bones（外观）与 Soul（性格）分离，Bones 每次从 hash(userId) 重新生成防止伪造
  - 锚点：`src/buddy/companion.ts`（注释：Bones 不持久化，防止编辑 config 伪造稀有度）
  - 锚点：`src/buddy/types.ts`（注释：CompanionBones vs StoredCompanion 分离设计）
  - 状态：verified（第四批注解新增）

#### Chapter 11 外围功能（Vim 模式）

- 结论：Vim 模式是纯函数状态机，所有转换函数接收 (state, key) 返回新 state，无副作用
  - 锚点：`src/vim/types.ts`（注释：VimState 状态机类型，INSERT/NORMAL 两态）
  - 锚点：`src/vim/transitions.ts`（注释：纯函数状态转换表）
  - 状态：verified（第四批注解新增）

#### Chapter 11 外围功能（语音模式）

- 结论：语音模式有三层检测：GrowthBook kill-switch / OAuth 令牌 / 完整运行时检测
  - 锚点：`src/voice/voiceModeEnabled.ts`（注释：三层检测函数，tengu_amber_quartz_disabled）
  - 状态：verified（第四批注解新增）

---

## 第五批注解新增 verified 条目（2026-04-06）

#### Chapter 6 API 通信层

- 结论：API 客户端工厂每次 query 调用都重新创建，确保 OAuth token 刷新后立即生效
  - 锚点：`src/services/api/client.ts`（注释：多 Provider 路由逻辑，认证优先级）
  - 状态：verified（第五批注解新增）

- 结论：withRetry.ts 区分前台（用户等待）和后台（静默）查询的 529 重试策略，后台不重试以避免容量级联
  - 锚点：`src/services/api/withRetry.ts`（注释：FOREGROUND_529_RETRY_SOURCES，前台 vs 后台区分）
  - 状态：verified（第五批注解新增）

- 结论：errors.ts 的 getPromptTooLongTokenGap() 解析超出 token 数量，供 reactive compact 一次跳过多组
  - 锚点：`src/services/api/errors.ts`（注释：getPromptTooLongTokenGap，reactive compact 集成）
  - 状态：verified（第五批注解新增）

#### Chapter 9 压缩与上下文管理

- 结论：autoCompact 使用 consecutiveFailures 作为熔断器，防止 prompt_too_long 无限循环
  - 锚点：`src/services/compact/autoCompact.ts`（注释：熔断机制，consecutiveFailures）
  - 状态：verified（第五批注解新增）

- 结论：microCompact 仅压缩最旧的几轮对话，保留近期消息原样，与全量压缩形成互补
  - 锚点：`src/services/compact/microCompact.ts`（注释：与全量压缩的区别，时间驱动触发）
  - 状态：verified（第五批注解新增）

#### Chapter 10 MCP 协议集成

- 结论：MCP 客户端支持四种传输模式（Stdio/SSE/StreamableHTTP/WebSocket），通过 memoize 复用连接
  - 锚点：`src/services/mcp/client.ts`（注释：传输层四模式，memoize 连接复用）
  - 状态：verified（第五批注解新增）

- 结论：MCP 配置来源有四层优先级，项目级 > 全局 > 插件 > Claude.ai 托管
  - 锚点：`src/services/mcp/config.ts`（注释：配置来源优先级，原子写入）
  - 状态：verified（第五批注解新增）

#### Chapter 12 埋点与可观测性

- 结论：Datadog 埋点通过白名单（DATADOG_ALLOWED_EVENTS）过滤，用户 ID 哈希后上报，保护隐私
  - 锚点：`src/services/analytics/datadog.ts`（注释：事件白名单，SHA-256 哈希）
  - 状态：verified（第五批注解新增）

- 结论：analytics sink 与 index.ts 解耦，启动时注入具体实现，避免循环依赖
  - 锚点：`src/services/analytics/sink.ts`（注释：sink 与 index.ts 解耦，延迟初始化）
  - 状态：verified（第五批注解新增）

#### Chapter 13 设置与配置系统

- 结论：设置系统有七层来源优先级，命令行 > MDM > 远程托管 > 项目 > 本地覆盖 > 全局 > 插件
  - 锚点：`src/utils/settings/settings.ts`（注释：设置来源优先级，mergeWith 合并）
  - 状态：verified（第五批注解新增）

- 结论：SettingsSchema 使用 lazySchema() 延迟初始化，解决 Zod Schema 循环依赖问题
  - 锚点：`src/utils/settings/types.ts`（注释：lazySchema 延迟初始化，循环依赖解决）
  - 状态：verified（第五批注解新增）

#### Chapter 17 多智能体协作（Swarm）

- 结论：进程内 Teammate 通过 AsyncLocalStorage 实现上下文隔离，多 Teammate 并发不互相污染
  - 锚点：`src/utils/swarm/inProcessRunner.ts`（注释：AsyncLocalStorage 上下文隔离，与外部进程 Teammate 的区别）
  - 状态：verified（第五批注解新增）

- 结论：Plan Mode 下 Teammate 不继承 bypassPermissions，确保仍需 Leader 审批
  - 锚点：`src/utils/swarm/spawnUtils.ts`（注释：planModeRequired 时不继承 bypassPermissions）
  - 状态：verified（第五批注解新增）

#### Chapter 5 能力装配（Shell 层）

- 结论：BashProvider 在执行前注入禁用 extglob 命令，防止恶意文件名在安全校验后展开
  - 锚点：`src/utils/shell/bashProvider.ts`（注释：getDisableExtglobCommand，安全加固）
  - 状态：verified（第五批注解新增）

- 结论：Bash 输出上限默认 30_000 字符，最大可配置到 150_000，超出截断并附加提示
  - 锚点：`src/utils/shell/outputLimits.ts`（注释：BASH_MAX_OUTPUT_DEFAULT/UPPER_LIMIT）
  - 状态：verified（第五批注解新增）

---

## 第六批注解新增 verified 条目（2026-04-06）

#### Chapter 8 权限系统

- 结论：权限决策引擎有五层优先级：bypassPermissions > 沙箱自动允许 > deny 规则 > allow 规则 > 询问用户
  - 锚点：`src/utils/permissions/permissions.ts`（注释：权限决策流程，五层优先级）
  - 状态：verified（第六批注解新增）

- 结论：yoloClassifier 在 auto mode 下通过独立 sideQuery 调用 LLM 分类器替代人工确认，低置信度时降级为 ask
  - 锚点：`src/utils/permissions/yoloClassifier.ts`（注释：分类器架构，置信度阈值，sideQuery 独立调用）
  - 状态：verified（第六批注解新增）

- 结论：bashClassifier.ts 是外部构建的存根，ANT 内部构建才有真实的 LLM Bash 命令语义分类实现
  - 锚点：`src/utils/permissions/bashClassifier.ts`（注释：外部构建存根，BASH_CLASSIFIER feature flag）
  - 状态：verified（第六批注解新增）

- 结论：filesystem.ts 的路径安全检查包含路径遍历防护、UNC 路径防护、.gitignore 感知和内部路径白名单
  - 锚点：`src/utils/permissions/filesystem.ts`（注释：路径安全策略，getClaudeTempDir 随机后缀）
  - 状态：verified（第六批注解新增）

- 结论：dangerousPatterns.ts 维护危险命令前缀列表，进入 auto mode 时自动剥离过于宽泛的 allow 规则
  - 锚点：`src/utils/permissions/dangerousPatterns.ts`（注释：CROSS_PLATFORM_CODE_EXEC，auto mode 入口剥离）
  - 状态：verified（第六批注解新增）

- 结论：shellRuleMatching.ts 支持精确/前缀/通配符三种规则类型，通配符占位符在模块级编译避免重复 RegExp
  - 锚点：`src/utils/permissions/shellRuleMatching.ts`（注释：三种规则类型，ESCAPED_STAR_PLACEHOLDER 性能优化）
  - 状态：verified（第六批注解新增）

- 结论：permissionsLoader.ts 支持托管规则独占模式（allowManagedPermissionRulesOnly），企业可禁止用户添加自定义规则
  - 锚点：`src/utils/permissions/permissionsLoader.ts`（注释：托管规则独占模式，隐藏 Always allow 选项）
  - 状态：verified（第六批注解新增）

#### Chapter 14 LSP 诊断集成

- 结论：LSP 层采用工厂函数+闭包模式（LSPClient/LSPServerInstance/LSPServerManager 三层），避免使用 class
  - 锚点：`src/services/lsp/LSPClient.ts`（注释：工厂函数模式，闭包封装状态）
  - 锚点：`src/services/lsp/LSPServerInstance.ts`（注释：状态机转换，工厂函数+闭包）
  - 锚点：`src/services/lsp/LSPServerManager.ts`（注释：懒启动，文件扩展名路由）
  - 状态：verified（第六批注解新增）

- 结论：LSP 诊断通过 passiveFeedback 被动接收 publishDiagnostics 通知，存入 LRU 缓存后在下一轮对话注入
  - 锚点：`src/services/lsp/passiveFeedback.ts`（注释：被动反馈，publishDiagnostics 处理）
  - 锚点：`src/services/lsp/LSPDiagnosticRegistry.ts`（注释：LRU 缓存，attachmentSent 防重复注入）
  - 状态：verified（第六批注解新增）

- 结论：LSPServerInstance 有五态状态机（stopped/starting/running/stopping/error），瞬态错误最多重试 3 次
  - 锚点：`src/services/lsp/LSPServerInstance.ts`（注释：状态机转换，LSP_ERROR_CONTENT_MODIFIED=-32801）
  - 状态：verified（第六批注解新增）

#### Chapter 11 外围功能（插件系统）

- 结论：插件加载使用 memoize 确保同一会话只加载一次，错误收集而非抛出保证单个插件失败不影响其他插件
  - 锚点：`src/utils/plugins/pluginLoader.ts`（注释：memoize 缓存，错误收集模式）
  - 状态：verified（第六批注解新增）

- 结论：插件市场支持 URL/GitHub/npm/local 四种来源，memoize 确保同一会话只请求一次，支持离线缓存模式
  - 锚点：`src/utils/plugins/marketplaceManager.ts`（注释：四种市场来源，离线优先，memoize）
  - 状态：verified（第六批注解新增）

- 结论：插件 MCP 服务器以 "plugin_name:server_name" 格式命名，防止与用户配置冲突
  - 锚点：`src/utils/plugins/mcpPluginIntegration.ts`（注释：命名格式，变量替换，错误收集）
  - 状态：verified（第六批注解新增）

- 结论：插件安装使用随机临时目录 + rename 保证原子性，策略检查防止安装被企业禁止的插件
  - 锚点：`src/utils/plugins/pluginInstallationHelpers.ts`（注释：原子安装，isPluginBlockedByPolicy）
  - 状态：verified（第六批注解新增）

---

## 第七批注解新增 verified 条目（2026-04-07）

#### Chapter 7 可观测性与遥测

- 结论：OTel SDK 三大信号（Traces/Metrics/Logs）在 instrumentation.ts 统一初始化，导出器采用懒加载避免 ~1.2MB 包体积拖慢启动
  - 锚点：`src/utils/telemetry/instrumentation.ts`（注释：三大信号初始化，动态导入策略，资源检测）
  - 状态：verified（第七批注解新增）

- 结论：events.ts 通过单调递增 eventSequence 确保事件有序，OTEL_LOG_USER_PROMPTS 控制用户内容是否脱敏
  - 锚点：`src/utils/telemetry/events.ts`（注释：eventSequence，redactIfDisabled，隐私保护）
  - 状态：verified（第七批注解新增）

- 结论：BigQuery 导出器有四重门控（用户退出/信任对话框/订阅类型/交互模式），支持 Sum/Gauge/Histogram 三种 OTel 指标类型
  - 锚点：`src/utils/telemetry/bigqueryExporter.ts`（注释：多重门控，数据转换流程）
  - 状态：verified（第七批注解新增）

- 结论：perfettoTracing.ts 是 Ant 内部专用的 Chrome Trace Event 格式追踪，每个 agent 映射为独立 pid 支持 swarm 层级可视化
  - 锚点：`src/utils/telemetry/perfettoTracing.ts`（注释：Chrome Trace Event 格式，pid/tid 映射，写入策略）
  - 状态：verified（第七批注解新增）

- 结论：betaSessionTracing.ts 在详细追踪模式下记录完整会话内容，Thinking 输出对外部用户不可见（隐私保护）
  - 锚点：`src/utils/telemetry/betaSessionTracing.ts`（注释：内容可见性规则，GrowthBook 门控）
  - 状态：verified（第七批注解新增）

#### Chapter 14 工具执行

- 结论：工具执行有三层架构：toolOrchestration（并发编排）→ StreamingToolExecutor（流式调度）→ toolExecution（单次执行）
  - 锚点：`src/services/tools/toolOrchestration.ts`（注释：并发策略，isConcurrencySafe 分批）
  - 锚点：`src/services/tools/StreamingToolExecutor.ts`（注释：工具状态机，队列管理）
  - 锚点：`src/services/tools/toolExecution.ts`（注释：权限决策流程，遥测字段）
  - 状态：verified（第七批注解新增）

- 结论：MCPTool 是纯代理工具，使用 passthrough schema 接受任意 JSON，逻辑在外部 MCP 服务器中执行
  - 锚点：`src/tools/MCPTool/MCPTool.ts`（注释：透传代理，动态 schema，与内置工具的区别）
  - 状态：verified（第七批注解新增）

- 结论：LSPTool 支持 hover/definition/references/symbols/call_hierarchy/diagnostics 六类操作，路径转 file:// URI 后通过 LSPClient 通信
  - 锚点：`src/tools/LSPTool/LSPTool.ts`（注释：支持的 LSP 操作，路径转换，懒启动）
  - 状态：verified（第七批注解新增）

#### Chapter 11 特性开关与分析

- 结论：GrowthBook 特性开关支持远程拉取+本地缓存双模式，非交互式会话跳过远程拉取避免网络延迟
  - 锚点：`src/services/analytics/growthbook.ts`（注释：特性配置来源，用户属性，缓存策略）
  - 状态：verified（第七批注解新增）

- 结论：firstPartyEventLogger 基于 OTel LoggerProvider，每条事件携带完整用户/会话/平台上下文，isAnalyticsDisabled 时完全跳过
  - 锚点：`src/services/analytics/firstPartyEventLogger.ts`（注释：第一方数据管道，公共属性，BatchLogRecordProcessor）
  - 状态：verified（第七批注解新增）

---

## 第八批注解新增 verified 条目（2026-04-07）

#### Chapter 3/4 认证与 OAuth

- 结论：OAuth 2.0 授权码流程使用 PKCE（code_verifier + SHA-256 challenge），防止授权码拦截攻击
  - 锚点：`src/services/oauth/crypto.ts`（注释：PKCE 加密原语，base64url 编码规则）
  - 锚点：`src/services/oauth/index.ts`（注释：两种授权码获取方式，完整 PKCE 流程）
  - 锚点：`src/services/oauth/client.ts`（注释：token 交换/刷新/撤销，Scope 管理）
  - 状态：verified（第八批注解新增）

- 结论：HTTP 请求统一通过 getAuthHeaders() 注入认证头，User-Agent 含 "claude-cli" 字符串用于日志过滤，不可随意修改
  - 锚点：`src/utils/http.ts`（注释：认证流程，getUserAgent 警告）
  - 状态：verified（第八批注解新增）

#### Chapter 16 状态与上下文

- 结论：agentContext.ts 使用 AsyncLocalStorage 隔离并发 Agent 的分析归因上下文，避免 AppState 单例被覆盖
  - 锚点：`src/utils/agentContext.ts`（注释：AsyncLocalStorage vs AppState，两种 Agent 类型）
  - 状态：verified（第八批注解新增）

- 结论：context.ts 的槽位预留优化：BQ p99 输出 4,911 tokens，32k 默认值过度预留 8 倍，启用上限后 <1% 请求触及限制
  - 锚点：`src/utils/context.ts`（注释：槽位预留优化，1M 上下文支持）
  - 状态：verified（第八批注解新增）

- 结论：sessionState.ts 的 requires_action 状态有两条传递路径：proto webhook（类型化）和 external_metadata JSON（前端可迭代）
  - 锚点：`src/utils/sessionState.ts`（注释：两条传递路径，CCR 侧边栏集成）
  - 状态：verified（第八批注解新增）

#### Chapter 14 工具执行（补充）

- 结论：toolHooks.ts 将 Hook 输出以 AttachmentMessage 形式注入，不污染主消息历史，PreToolUse Hook 可返回权限决策
  - 锚点：`src/services/tools/toolHooks.ts`（注释：Hook 执行时机，AttachmentMessage 注入）
  - 状态：verified（第八批注解新增）

- 结论：attachments.ts 处理 @-mention 文件/图片/URL 注入，每个附件有独立 token 预算，超限时截断
  - 锚点：`src/utils/attachments.ts`（注释：@-mention 解析，token 预算，附件消息独立存储）
  - 状态：verified（第八批注解新增）

#### Chapter 7 可观测性（补充）

- 结论：diagnosticTracking.ts 通过 MCP RPC 从 IDE 获取诊断信息，MAX_DIAGNOSTICS_SUMMARY_CHARS=4000 防止占用过多 context window
  - 锚点：`src/services/diagnosticTracking.ts`（注释：IDE 诊断追踪，路径比较，字符上限）
  - 状态：verified（第八批注解新增）

- 结论：internalLogging.ts 仅在 USER_TYPE=ant 时触发，通过 Kubernetes namespace 区分 laptop/devbox 环境
  - 锚点：`src/services/internalLogging.ts`（注释：Ant 内部日志，namespace 检测）
  - 状态：verified（第八批注解新增）
