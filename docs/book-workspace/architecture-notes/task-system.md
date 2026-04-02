# Task System（任务系统）架构笔记

## 一句话
这个任务系统本质上是一个“**文件系统驱动的轻量调度器**”：用目录+JSON 文件做状态真相，用锁文件保证并发一致性，用内存信号做本进程 UI 刷新。

## 关键源码入口
- `src/Task.ts`
  - 任务抽象（`TaskType`/`TaskStatus`/`Task` 接口）
  - `generateTaskId`、`createTaskStateBase`
- `src/tasks.ts`
  - 任务注册表（`getAllTasks/getTaskByType`）
- `src/utils/tasks.ts`
  - 任务持久化、认领、阻塞关系、并发锁、team/taskList 归属
- `src/tasks/*`
  - 各类任务实现（local shell / local agent / remote agent / teammate / dream）

## 设计拆解

### 1) 控制平面 vs 数据平面
- **控制平面**：`Task.ts` + `tasks.ts` 声明“有哪些任务类型、怎么调度到实现”。
- **数据平面**：`utils/tasks.ts` 负责“任务状态如何落盘、如何原子更新、如何避免竞争”。

这让新增任务类型只需接入注册表，不必重写底层存储与一致性逻辑。

### 2) 持久化模型：目录即队列
- 任务目录：`~/.claude/tasks/<taskListId>/`
- 单任务文件：`<taskId>.json`
- 高水位文件：`.highwatermark`（防止 reset/delete 后 ID 回绕复用）
- 锁文件：`.lock`

这是“可观测、可调试、可恢复”的朴素方案：出现问题时可以直接看文件，排障成本低。

### 3) 并发一致性策略
`utils/tasks.ts` 里有两层锁策略：
- **task-level lock**：更新单任务时加锁（`updateTask/claimTask`）
- **list-level lock**：需要原子看全局再更新时加锁（`claimTaskWithBusyCheck/resetTaskList`）

典型场景是 `check-then-act`：先看某 agent 是否忙，再认领任务，必须在同一把锁内完成，避免 TOCTOU。

### 4) 任务归属与协作域
`getTaskListId()` 决定“大家写到哪一份任务列表”，优先级支持：
1. 显式环境变量
2. teammate 上下文
3. team 名
4. 当前 session

这保证主会话、同进程 teammate、tmux teammate 最终能汇聚到同一任务池。

## 为什么靠谱（对外表现）
- **崩溃后可继续**：状态已在磁盘，不依赖内存存活。
- **多人并发不易串单**：显式锁 + schema 校验。
- **排障直观**：文件可读、人眼可审计。

## 对非技术读者的解释
可把它理解为“共享任务白板 + 排队取号机”：
- 白板（任务文件）永远在那，谁重启都能看到。
- 取号机（高水位）保证编号不重复。
- 管理员（锁）防止两个人同时改同一条造成冲突。

## 可借鉴清单
1. **先用文件+锁跑通协作闭环**，不要一上来分布式数据库。
2. 对“认领任务”这种竞争动作，优先做**原子事务语义**。
3. 保留“可人工检查”的存储形态，降低运维与事故响应成本。
