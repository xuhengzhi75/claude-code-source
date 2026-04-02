# Code Annotation Roadmap（源码注释补齐路线图）

更新时间：2026-04-02（第3轮抽样后）

## 0. 目标与口径

本文件用于把“源码注释补充进度”与“book/notes 写作状态”对齐，给后续小步提交提供统一清单。

口径：
- **已补位点**：以 `docs/book-workspace/architecture-notes/key-comment-signals.md` 已登记、且可在源码定位的注释信号为准。
- **待补位点**：优先覆盖当前书稿里 `inference` 占比高、或 `planning/planning/project-status.md` 标记为短板的主题。
- **优先级**：P0（立即补）/ P1（本轮补）/ P2（排队补）。

---

## 1. 已补注释位点（截至第 21 条信号）

来源：`architecture-notes/key-comment-signals.md` + `status-2026-04-01-*.md`

### A. 启动与信任边界（`src/main.tsx`）

1. 启动预取为首轮响应提速（2338-2363）
2. 进程早期 PATH 劫持防护（588-591）
3. MCP/AWS 相关动作后置到 trust 之后（1816-1817, 2018）
4. LSP 初始化后置到 trust 之后（1120-1122, 2317-2321）
5. Assistant 模式未信任目录直接禁用（1043-1047, 1067-1069）
6. setup 顺序约束 + 并行加载策略（1903-1934）
7. 入口最前受控副作用并行（1-19）
8. 启动埋点避开阻塞弹窗（2231-2234）
9. 子命令 preAction 先挂 sink，避免事件丢失（927-934）
10. 系统上下文预取受 trust 约束（354-379）
11. `--print` 先合并环境再预取 context（1964-1978）
12. `--settings` 临时文件路径哈希稳定化（445-454）
13. stdin 读取 3 秒探测阈值（870-875）

### B. 会话编排与循环（`src/QueryEngine.ts`, `src/query.ts`）

14. headless/SDK 启动不被插件网络更新阻塞（`QueryEngine.ts:533-540`）
15. 先持久化用户消息再入 loop（`QueryEngine.ts:439-446`）
16. 返回结果前 flush transcript 防止桌面端杀进程丢写（`QueryEngine.ts:1075-1084`）
17. `max_output_tokens` 中间错误的分层可见性策略（`query.ts:166-174`）
18. context collapse 是投影视图，不改写原始历史（`query.ts:433-441`）

### C. 终端与历史一致性

19. 历史撤销的异步写盘竞态兜底（`src/history.ts:121-126,286-289,448-463`）
20. 终端能力探测 DA1 哨兵 + 顺序屏障（`src/ink/terminal-querier.ts`）
21. PATH 安全基线在“任何命令执行前”固定（`src/main.tsx:589`，与第 2 条互证）

### 已补注释支撑章节

- **强支撑（verified 可直接落文）**：
  - `ch04` 入口与请求路由
  - `ch06` QueryEngine
  - `ch07` QueryLoop
  - `ch14` 工具（部分）
  - `ch16` 状态与上下文（部分）
  - `ch17` 任务推进（部分）
  - `ch18` 恢复机制（第2轮补充后已达强支撑）
  - `ch10` 运行时壁垒（第2轮补充后已达强支撑）
- 依据：`planning/planning/completed-coverage-and-writing-queue.md` 的优先级 A 清单 + `references/references/chapter-evidence-map.md` verified 项。

### B2. 第 2 轮抽样（2026-04-02，信号 22-32）

来源：`conversationRecovery.ts` / `compact.ts` / `sessionMemory.ts`

22. 恢复反序列化"先取事实、再语义修复"两步设计（`conversationRecovery.ts:461-468`）
23. 中断检测统一 interrupted_turn → interrupted_prompt，SDK/REPL 走同一路径（`conversationRecovery.ts:207-227`）
24. assistant sentinel 插入位置约束，与 removeInterruptedMessage splice 精确配合（`conversationRecovery.ts:229-248`）
25. Brief 模式 tool_result 结尾是合法 turn 终态，需 isTerminalToolResult 特殊识别（`conversationRecovery.ts:338-376`）
26. 技能状态必须在反序列化前从 attachment 回放，否则下次 compact 遗忘技能（`conversationRecovery.ts:385-408`）
27. compact 后重建顺序是协议：boundary→summary→kept→attachments→hooks（`compact.ts:330-339`）
28. preservedSegment 是 compact↔resume 契约字段，记录 head/anchor/tail（`compact.ts:351-371`）
29. compact 请求本身也可能 prompt-too-long，有截断重试逻辑（`compact.ts:466-495`）
30. compact 后重新注入 delta attachments，post-compact 第一轮有完整工具上下文（`compact.ts:567-589`）
31. session memory 双重阈值：token 增量是硬门槛，tool call 次数是软门槛（`sessionMemory.ts:134-187`）
32. session memory 用 forked agent 执行，主会话不阻塞，最小权限只允许编辑 memoryPath（`sessionMemory.ts:321-333`）

### B3. 第 3 轮抽样（2026-04-02，信号 33-37）

来源：`src/utils/tasks.ts`（任务并发控制全链路）

33. 两级锁粒度：task-level lock 用于单任务更新，list-level lock 用于需要跨任务原子性的操作（`tasks.ts:355-394, 544-615`）
34. TOCTOU 防护：`claimTaskWithBusyCheck` 把 check-then-act 放进同一把 list-level 锁（`tasks.ts:621-697`）
35. 高水位标记（high water mark）防止任务 ID 在重置/删除后被复用（`tasks.ts:91-131, 141-188, 403-409`）
36. `updateTaskUnsafe` 是内部无锁变体，供已持锁调用方使用，避免 proper-lockfile 不可重入死锁（`tasks.ts:355-371`）
37. teammate 崩溃或退出后，其持有的任务自动归还为 pending，防止任务永久卡死（`tasks.ts:823-865`）

---

## 2. 待补注释位点（按优先级）

> 原则：先补“证据链薄弱但章节优先级高”的位点，再补“Part V/治理类系统化主题”。

| 优先级 | 待补位点（建议源码范围） | 需要补出的注释类型 | 直接支撑章节 |
|---|---|---|---|
| ✅ P0 已完成 | `src/utils/conversationRecovery.ts`（中断判定、迁移、sentinel） | 恢复协议边界、字段合法化动机、异常分支先后顺序 | ch18 / ch10（信号22-26）|
| ✅ P0 已完成 | `src/services/compact/compact.ts`（preserved segment、重建顺序） | 压缩后语义连续性约束、顺序不可变原因 | ch18 / ch10 / ch11（信号27-30）|
| ✅ P0 已完成 | `src/services/SessionMemory/sessionMemory.ts`（阈值、受限工具执行） | 触发阈值设计动机、最小权限边界、失败回退策略 | ch18 / ch16 / ch10（信号31-32）|
| ✅ P0 已完成 | `src/utils/tasks.ts`（claim/lock/busy check） | 并发竞态与 TOCTOU 防护意图、锁粒度取舍 | ch17 / ch08 / ch10（信号33-37）|
| P1 | `src/tools.ts` + `src/Tool.ts`（全集→过滤→排序） | 缓存断点耦合、默认保守策略、并发安全语义 | ch14 / ch05 |
| P1 | `src/constants/prompts.ts` + prompt 组装路径 | 缓存边界、动态段落拆分、模型专项补丁的治理注释 | ch15 / ch19 |
| P1 | `src/entrypoints/cli.tsx`（路由分流 + 动态 import） | fast-path 与完整主链边界、分支不可合并原因 | ch03 / ch04 / ch13 |
| P2 | `src/commands/*`（权限/安全/配置相关命令） | 命令级权限策略、交互与非交互差异、降级策略 | ch09 / ch11 / Part V |
| P2 | `src/services/*Manager*`（状态/权限/任务管理） | 状态机转换约束、可观测性字段、回滚路径 | ch11 / ch16 / Part V |
| P2 | `src/bootstrap` / `src/bridge` / `src/assistant` | Bridge/Daemon/Assistant 运行边界与失败信号 | ch03 / ch09 / Part V |

---

## 3. 执行节奏建议（用于后续小步提交）

1. **每轮只补 1~2 个 P0 位点**：源码注释 + `key-comment-signals.md` 增量 + 一条 `status-*.md`。
2. **章节联动最小闭环**：每补一条注释，明确写“可用于哪章哪个段落”。
3. **证据状态同步**：补完后同步检查 `references/references/chapter-evidence-map.md`，能从 inference 升 verified 的立即升级。
4. **协作约束保持不变**：继续遵循 `planning/planning/collab-split.md`（分析侧补证据，写作侧落正文）。

---

## 4. 当前判断（简版）

- 现状：启动链路与 Query 主链的注释证据已形成规模（21 条可核对信号）。
- 短板：恢复/压缩/记忆/任务并发这四块仍需更系统化注释，才能稳定支撑 ch10/ch18/ch11 的“强结论”。
- 下一步：按 P0 顺序推进，把“恢复连续性 + 并发一致性”从可写提升到可定稿。
