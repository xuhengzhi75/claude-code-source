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
  - 锚点：`docs/book/architecture-notes/task-recovery-map.md`
  - 锚点：`docs/book/architecture-notes/recovery-and-continuity.md`
  - 状态：inference
