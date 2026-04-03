# ch17 挖掘任务卡：任务推进

**认领人：** startheart  
**状态：** ✅ 已完成  
**目标章节：** `docs/book/chapters/ch17-任务推进.md`（当前 167 行）  
**写作规范：** `docs/book-workspace/methodology/writing-principles.md`

---

## 背景与现状

ch17 现有内容质量较高：原子化认领、双向阻塞图、高水位标记、宕机归还、通知隔离，逻辑清晰，行号锚点完整。

主要缺口：
1. **`LOCK_OPTIONS` 的具体参数值没有** — 章节提到"retries=30 给了约 2.6s 总等待时间"，但没有展示完整的 `LOCK_OPTIONS` 配置，也没有说明 `stale` 超时（锁文件多久算过期）
2. **`enqueuePendingNotification` 的跨 Agent 通知机制没有深挖** — 通知是怎么被"注入下一次迭代的 tool results"的？具体的数据流是什么？
3. **`taskSummaryModule.maybeGenerateTaskSummary()` 的触发条件和内容格式** — 什么时候生成摘要？摘要长什么样？

---

## 挖掘任务

### 🔴 必答（ch17 改稿必须覆盖）

**任务 1：`LOCK_OPTIONS` 完整配置**

文件：`src/utils/tasks.ts`（搜索 `LOCK_OPTIONS`）

需要挖掘：
- `retries`、`retryWait`、`stale` 的具体值
- `stale` 超时的含义：锁文件多久没有更新就认为持锁进程已死？这个值和 Agent 宕机检测有什么关系？
- 注释里有没有解释为什么选这些参数值？

---

**任务 2：跨 Agent 通知的完整数据流**

文件：`src/utils/tasks.ts`（`enqueuePendingNotification`）、`src/query.ts`（`L1577` 附近）

已知：通知用 XML 格式，被注入下一次迭代的 tool results。

需要挖掘：
- `enqueuePendingNotification` 把通知写到哪里？（文件？内存队列？）
- 主循环在哪里读取这些通知并注入 tool results？具体的注入点是哪一行？
- 通知的 XML 格式是固定的还是动态生成的？有没有 schema 定义？

---

### 🟡 加分项

**任务 3：`maybeGenerateTaskSummary` 的触发条件和摘要格式**

文件：`src/utils/task/` 目录下（搜索 `maybeGenerateTaskSummary`）

- 什么条件触发摘要生成？（任务完成？token 阈值？）
- 摘要写到哪里？格式是什么？
- 摘要和 `diskOutput.ts` 的 output 文件有什么关系？

---

**任务 4：`getTaskOutputDelta` 的字节偏移实现**

文件：`src/utils/task/diskOutput.ts`

- 字节偏移是怎么持久化的？（存在哪里？）
- 如果 output 文件被截断或损坏，偏移读取会怎么处理？

---

### 🟢 意外发现区

格式：`[文件路径#行号] 发现 + 为什么有意思`

---

## startheart 填写区

### Q1：`LOCK_OPTIONS` 完整配置

**结论**：`LOCK_OPTIONS` 没有 `stale` 字段，只有 `retries` 配置（指数退避）。`proper-lockfile` 的 `stale` 默认值是 10000ms（10秒），即锁文件超过 10 秒没有更新就认为持锁进程已死。注释明确说明了参数选择的理由：按 10+ 并发 Agent 的场景设计，每个 critical section 约 50-100ms，最后一个 Agent 等待约 900ms，`retries=30` 给约 2.6s 总等待时间。

**verified** — 源码锚点：`src/utils/tasks.ts` L94-L108

```typescript
// L94-L108
// Budget sized for ~10+ concurrent swarm agents: each critical section does
// readdir + N×readFile + writeFile (~50-100ms on slow disks), so the last
// caller in a 10-way race needs ~900ms. retries=30 gives ~2.6s total wait.
const LOCK_OPTIONS = {
  retries: {
    retries: 30,
    minTimeout: 5,
    maxTimeout: 100,
  },
}
```

关键细节：
- `minTimeout: 5`（ms）、`maxTimeout: 100`（ms）：指数退避的上下界
- 没有显式设置 `stale`，使用 `proper-lockfile` 的默认值 10000ms
- `stale` 超时和 Agent 宕机检测**没有直接关系**：`stale` 只是防止锁文件永久残留（进程崩溃后锁文件不会自动删除），不是 Agent 宕机检测机制。Agent 宕机检测由 `unassignTeammateTasks()` 处理，是独立的机制。

---

### Q2：跨 Agent 通知的完整数据流

**结论**：`enqueuePendingNotification` 把通知写入**进程内内存队列**（`messageQueueManager.ts` 的 `commandQueue` 数组），不是文件。主循环在每次工具执行完成后（`query.ts` L1584-L1656）从队列读取通知，转换为 attachment 消息注入 tool results，模型在下一轮看到。通知的 XML 格式由各 task 类型自己构造，标签名定义在 `src/constants/xml.ts`。

**verified** — 源码锚点：`src/utils/messageQueueManager.ts` L53, L142-L149；`src/query.ts` L1584-L1656；`src/constants/xml.ts` L27-L37；`src/utils/task/framework.ts` L274-L290

通知数据流（完整路径）：

```
[任务完成] LocalMainSessionTask / LocalAgentTask / RemoteAgentTask
    ↓ 构造 XML 字符串（<task-notification>...</task-notification>）
    ↓ enqueuePendingNotification({ value: xml, mode: 'task-notification' })
    ↓ 写入 commandQueue[]（内存，priority='later'）
    ↓ notifySubscribers()（React useSyncExternalStore 通知）

[主循环 query.ts L1584]
    ↓ getCommandsByMaxPriority(sleepRan ? 'later' : 'next')
    ↓ 过滤：主线程取 agentId===undefined，子 Agent 取自己的 agentId
    ↓ getAttachmentMessages() 把通知转为 attachment 消息
    ↓ yield attachment → toolResults.push(attachment)
    ↓ removeFromQueue(consumedCommands)（从队列移除已消费的通知）

[下一轮 API 请求]
    ↓ toolResults 作为 tool_result 消息发给模型
    ↓ 模型看到 <task-notification> 内容，决定下一步行动
```

优先级设计（`messageQueueManager.ts` L151-L155）：
- `'now'`（0）：最高优先级，立即处理
- `'next'`（1）：用户输入，在通知之前处理
- `'later'`（2）：任务通知的默认优先级，不会饿死用户输入

Sleep 工具触发"全量刷新"：当模型调用 Sleep 工具时（`sleepRan = true`），主循环把优先级阈值提升到 `'later'`，一次性消费所有积压的任务通知（`query.ts` L1584-L1585）。

通知 XML 格式（`src/constants/xml.ts` + `framework.ts` L281-L287）：
```xml
<task-notification>
<task-id>{taskId}</task-id>
<tool-use-id>{toolUseId}</tool-use-id>   <!-- 可选 -->
<task-type>{taskType}</task-type>
<output-file>{outputPath}</output-file>
<status>{status}</status>
<summary>Task "{description}" completed successfully</summary>
</task-notification>
```

---

### Q3：`maybeGenerateTaskSummary` 的触发条件

**结论**：`taskSummary.ts` 是 feature-gated 文件（`feature('BG_SESSIONS')`），源码仓库中不存在。从 `query.ts` 的调用点可以推断：触发条件是 `shouldGenerateTaskSummary()` 返回 true，且只在主线程（`!toolUseContext.agentId`）触发，子 Agent 不生成摘要。摘要用于 `claude ps` 命令的实时进度显示。

**inference** — 源码锚点：`src/query.ts` L1699-L1715

```typescript
// query.ts L1699-L1715
if (feature('BG_SESSIONS')) {
  if (
    !toolUseContext.agentId &&
    taskSummaryModule!.shouldGenerateTaskSummary()
  ) {
    taskSummaryModule!.maybeGenerateTaskSummary({
      systemPrompt, userContext, systemContext, toolUseContext,
      forkContextMessages: [...messagesForQuery, ...assistantMessages, ...toolResults],
    })
  }
}
```

摘要保存路径（`src/utils/sessionStorage.ts` L2683）：`saveTaskSummary(sessionId, summary)` 写入 session 存储，供 `claude ps` 读取。

---

### Q4：`getTaskOutputDelta` 的字节偏移实现

**结论**：字节偏移**不持久化**，存在 AppState 的 `taskState.outputOffset` 字段里（内存）。`getTaskOutputDelta` 每次从指定字节偏移读取文件增量，返回新内容和新偏移。如果文件被截断（`fromOffset > 文件大小`），`readFileRange` 返回 null，函数返回 `{ content: '', newOffset: fromOffset }`——偏移不回退，静默跳过。

**verified** — 源码锚点：`src/utils/task/diskOutput.ts` L304-L330

```typescript
// diskOutput.ts L304-L330
export async function getTaskOutputDelta(
  taskId: string,
  fromOffset: number,
  maxBytes: number = DEFAULT_MAX_READ_BYTES,  // 8MB
): Promise<{ content: string; newOffset: number }> {
  try {
    const result = await readFileRange(getTaskOutputPath(taskId), fromOffset, maxBytes)
    if (!result) {
      return { content: '', newOffset: fromOffset }  // 文件不存在或偏移越界：静默返回
    }
    return { content: result.content, newOffset: fromOffset + result.bytesRead }
  } catch (e) {
    const code = getErrnoCode(e)
    if (code === 'ENOENT') {
      return { content: '', newOffset: fromOffset }  // 文件不存在：静默返回
    }
    logError(e)
    return { content: '', newOffset: fromOffset }  // 其他错误：静默返回，偏移不变
  }
}
```

安全设计亮点（`diskOutput.ts` L17-L21）：
- `O_NOFOLLOW` 标志：打开文件时不跟随符号链接，防止沙箱内的攻击者创建指向任意文件的符号链接，让 Claude Code 主机进程写入那些文件
- Windows 不支持 `O_NOFOLLOW`，但注释说明"沙箱攻击向量是 Unix-only"

`DiskTaskOutput` 的写入队列设计（L97-L231）：
- 使用平坦数组作为写队列，单一 drain 循环处理，每个 chunk 写完后立即 GC
- 注释明确警告：`#writeAllChunks` 里**不能加 await**，否则 Buffer[] 会在队列增长时保留在内存中（L179-L181）
- 5GB 磁盘上限（`MAX_TASK_OUTPUT_BYTES`），超出后追加截断提示并停止写入

---

### 意外发现

**`commandQueue` 是进程全局单例，所有 Agent 共享**（`messageQueueManager.ts` L53）：
```typescript
const commandQueue: QueuedCommand[] = []
```
这是一个模块级变量，进程内所有 Agent（主线程 + 所有子 Agent）共享同一个队列。`agentId` 字段是路由键——主线程只消费 `agentId === undefined` 的命令，子 Agent 只消费自己 `agentId` 的命令。这个设计避免了多队列的同步问题，但要求所有入队操作都正确设置 `agentId`。

**`isQueuedCommandEditable` 和 `isQueuedCommandVisible` 的区别**（`messageQueueManager.ts` L359-L375）：
- `editable`：可以被 UP 键拉入输入框编辑（用户输入）
- `visible`：在输入框下方的队列预览里显示（包括 channel 消息，但不可编辑）
- `task-notification` 模式：既不可编辑也不可见——系统消息不应该泄漏到用户输入框

**`DiskTaskOutput` 的 `O_EXCL` 保证**（`diskOutput.ts` L413-L415）：
`initTaskOutput` 用 `O_EXCL` 创建文件，如果文件已存在则失败。这防止了两个任务意外共享同一个输出文件。`initTaskOutputAsSymlink` 则先尝试创建符号链接，失败时删除已有文件再重试——这是 agent transcript 文件复用的场景（LocalAgentTask 把 transcript 文件符号链接为 output 文件，避免双写）。

**`notifyTasksUpdated` 的 try/catch 隔离**（`framework.ts` 注释）：
章节已提到这个设计，但源码里实际的 `notifyTasksUpdated` 在 `src/utils/task/framework.ts` 里并不存在——它在 `src/utils/tasks.ts` 里（任务状态变更通知），而 `framework.ts` 里的 `enqueuePendingNotification` 是跨 Agent 通知。两者是不同层次的通知机制，章节把它们混在一起描述，可能需要澄清。
