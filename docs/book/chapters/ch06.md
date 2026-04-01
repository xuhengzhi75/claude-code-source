# 第6章 QueryEngine：用户消息在进入模型之前发生了什么

**核心主张：`QueryEngine` 不是 `query.ts` 的包装层，而是一个会话容器——它保证了即使进程在 API 请求中途被杀死，`--resume` 也能正常工作。**

这个主张可以被反驳：如果 `QueryEngine` 只是转发调用，那它存在的意义是什么？读完这章，你会看到它做了一件 `query.ts` 做不了的事：在 API 调用发生之前，把用户消息写入磁盘。

## 6.1 `processUserInputContext` 被创建两次，两次目的不同

`submitMessage()` 在 [`QueryEngine.ts#L342`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L342) 创建了第一个 `processUserInputContext`，在 [`L499`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L499) 创建了第二个。这不是重复代码，而是一个刻意的设计。

第一个对象（[`L342-L402`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L342-L402)）带有可变的 `setMessages` 回调：

```typescript
setMessages: fn => {
  this.mutableMessages = fn(this.mutableMessages)
},
```

这允许斜杠命令（如 `/force-snip`）在处理阶段修改消息历史。`/force-snip` 需要截断历史，这个回调让它能做到。

第二个对象（[`L499-L534`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L499-L534)）把 `setMessages` 替换成空操作：

```typescript
setMessages: () => {},
```

为什么？因为斜杠命令处理完成后，消息历史已经确定，不应该再被修改。第二个对象锁定了历史，防止后续代码意外改写。

同一个接口，两次实例化，两次目的完全不同。如果不看这段代码，你不会知道这个设计存在。

## 6.2 用户消息在 API 调用之前写入磁盘

[`QueryEngine.ts#L443-L468`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L443-L468) 有一段注释，解释了一个真实的故障场景：

```
// Persist the user's message(s) to transcript BEFORE entering the query
// loop. The for-await below only calls recordTranscript when ask() yields
// an assistant/user/compact_boundary message — which doesn't happen until
// the API responds. If the process is killed before that (e.g. user clicks
// Stop in cowork seconds after send), the transcript is left with only
// queue-operation entries; getLastSessionLog filters those out, returns
// null, and --resume fails with "No conversation found".
```

这段注释记录了一个真实的 bug：如果在 API 响应到来之前进程被杀死，`--resume` 会失败，因为 transcript 里没有用户消息。修复方案是在 [`L457-L468`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L457-L468) 处，在进入 `query()` 循环之前，先调用 `recordTranscript(messages)`。

这个设计决策的代价是：每次 `submitMessage()` 都会有一次磁盘写入，发生在 API 调用之前。在 bare 模式下（[`L459`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L459)），这个写入是 fire-and-forget 的，不阻塞主流程。在交互模式下，这个写入是 `await` 的，增加了约 4-30ms 的延迟（注释里的数字）。

这是一个用延迟换可靠性的权衡，而且权衡的理由被记录在代码注释里。

## 6.3 `discoveredSkillNames` 的清理时机揭示了会话边界

[`QueryEngine.ts#L201`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L201) 声明了 `discoveredSkillNames`：

```typescript
private discoveredSkillNames = new Set<string>()
```

[`L245`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L245) 在每次 `submitMessage()` 开始时清空它：

```typescript
this.discoveredSkillNames.clear()
```

注释（[`L196-L200`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L196-L200)）解释了为什么：这个 Set 追踪当前 turn 里发现的技能名称，用于 `was_discovered` 事件上报。它需要在 turn 之间清空（避免跨 turn 污染），但在同一个 turn 的两次 `processUserInputContext` 创建之间保留（因为两次都需要访问同一个 Set）。

这个细节揭示了 `QueryEngine` 的会话边界：`submitMessage()` 是 turn 边界，不是会话边界。会话级状态（`mutableMessages`、`readFileState`、`totalUsage`）跨 turn 保留，turn 级状态（`discoveredSkillNames`）在每次 `submitMessage()` 开始时重置。

## 6.4 `QueryEngine` 和 `query.ts` 的职责边界

`QueryEngine` 做的事情，`query.ts` 不做：

- 维护 `mutableMessages`（[`L190`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L190)）：消息历史是会话级资产，跨 turn 保留
- 在 API 调用前写 transcript（[`L457-L468`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L457-L468)）：保证 `--resume` 可用
- 累计 `totalUsage`（[`L193`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L193)）：跨 turn 的 token 用量统计
- 收集 `permissionDenials`（[`L192`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L192)）：向 SDK 报告哪些工具调用被拒绝
- 产出 `buildSystemInitMessage`（[`L547`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L547)）：向 SDK 报告当前会话的工具、模型、权限配置

`query.ts` 做的事情，`QueryEngine` 不做：

- 维护单轮的 `State`（[`query.ts#L206-L219`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L206-L219)）：消息演化、压缩状态、恢复计数
- 判断是否继续下一轮（[`query.ts#L1071`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L1071)）：基于 `tool_use` 是否出现
- 处理上下文过长、输出截断等运行时异常（[`query.ts#L1094-L1261`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/query.ts#L1094-L1261)）

这条边界的价值在于：新增接入层（SDK、REPL、远程）时，只需要在 `QueryEngine` 层做协议适配，`query.ts` 的状态机逻辑不需要改动。

## 6.5 本章小结

`QueryEngine` 的核心价值是两件事：在 API 调用前持久化用户消息（保证 `--resume` 可用），以及维护跨 turn 的会话状态（消息历史、用量统计、权限记录）。

`processUserInputContext` 被创建两次这个细节，揭示了系统对"斜杠命令处理阶段"和"查询执行阶段"的明确区分：前者允许修改历史，后者锁定历史。这种区分不是偶然的，而是防止意外修改的设计。
