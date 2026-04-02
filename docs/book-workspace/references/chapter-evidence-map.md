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
  - 锚点：`src/entrypoints/cli.tsx`
  - 状态：inference
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
  - 锚点：`src/utils/tasks.ts` `claimTaskWithBusyCheck()`
  - 状态：verified
- 结论：主循环继续条件基于工具调用事实，不依赖模型文字输出
  - 锚点：`src/query.ts` `needsFollowUp`、`toolUseBlocks`
  - 状态：verified
- 结论：任务系统和主循环有明确接缝，执行进度对外可见
  - 锚点：`src/query.ts` `task-notification`、`BG_SESSIONS`
  - 状态：verified

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
