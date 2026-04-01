# 第6章 QueryEngine：用户消息在进入模型之前发生了什么

> **核心主张：`QueryEngine` 解决的第一性问题是"会话持久性"——它保证了即使进程在 API 请求中途被杀死，`--resume` 也能正常工作。这个保证来自一个具体的设计决策：用户消息在 API 调用之前写入磁盘，而不是之后。**

## 6.1 第一性问题：为什么需要 QueryEngine 这一层

如果 `query.ts` 已经能处理单轮对话，为什么还需要 `QueryEngine`？

`query.ts` 是无状态的——它接受消息列表，返回响应，不维护任何跨轮状态。这对单轮对话足够，但对多轮会话不够：消息历史需要跨轮保留，token 用量需要累计，权限拒绝需要记录，`--resume` 需要在进程重启后能找到之前的对话。

`QueryEngine` 是这些跨轮状态的容器。它的存在让 `query.ts` 保持无状态，同时让会话级的持久性需求有一个明确的归属。

**隐含假设：** 这个设计假设会话状态可以完整地保存在单个进程的内存里（加上磁盘上的 transcript）。如果需要多进程共享会话状态，`QueryEngine` 的设计需要根本性的改变。

## 6.2 用户消息在 API 调用之前写入磁盘

[`QueryEngine.ts#L443-L468`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L443-L468) 有一段注释，记录了一个真实的故障场景：

```
// Persist the user's message(s) to transcript BEFORE entering the query
// loop. The for-await below only calls recordTranscript when ask() yields
// an assistant/user/compact_boundary message — which doesn't happen until
// the API responds. If the process is killed before that (e.g. user clicks
// Stop in cowork seconds after send), the transcript is left with only
// queue-operation entries; getLastSessionLog filters those out, returns
// null, and --resume fails with "No conversation found".
```

这段注释记录了一个真实的 bug：如果在 API 响应到来之前进程被杀死，`--resume` 会失败，因为 transcript 里没有用户消息。修复方案是在进入 `query()` 循环之前，先调用 `recordTranscript(messages)`。

**这个设计的代价：** 每次 `submitMessage()` 都会有一次磁盘写入，发生在 API 调用之前。在 bare 模式下（[`L459`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L459)），这个写入是 fire-and-forget 的，不阻塞主流程。在交互模式下，这个写入是 `await` 的，增加了约 4-30ms 的延迟（注释里的数字）。

**替代方案：** 另一种做法是在 API 响应到来后再写入 transcript，但这正是导致 bug 的原因。还有一种做法是用数据库事务保证原子性，但这会引入数据库依赖，增加部署复杂度。文件系统写入是最简单的持久化方案，代价是需要处理写入时序。

## 6.3 两次 `processUserInputContext`：同一接口，两种语义

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

**可迁移原则：** 同一个接口在不同阶段可以有不同的语义。用空操作替换可变回调，是一种轻量的"阶段锁定"机制——不需要引入新的类型或状态机，只需要替换回调实现。

## 6.4 会话边界 vs. Turn 边界

`discoveredSkillNames`（[`QueryEngine.ts#L201`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L201)）在每次 `submitMessage()` 开始时清空（[`L245`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L245)）。

这个细节揭示了 `QueryEngine` 的状态分层：

- **会话级状态**（跨 turn 保留）：`mutableMessages`（[`L190`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L190)）、`totalUsage`（[`L193`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L193)）、`permissionDenials`（[`L192`](https://github.com/xuhengzhi75/claude-code-source/blob/9e4d0c6d68748da4cc9623a89752ed2cf60af4ea/src/QueryEngine.ts#L192)）
- **Turn 级状态**（每次 `submitMessage()` 重置）：`discoveredSkillNames`

`submitMessage()` 是 turn 边界，不是会话边界。会话在 `QueryEngine` 实例的生命周期内持续，turn 在每次 `submitMessage()` 调用内持续。

**技术债：** 状态分层目前是隐式的——哪些字段是会话级的，哪些是 turn 级的，需要读代码才能知道。如果未来需要更多 turn 级状态，开发者需要记得在 `submitMessage()` 开始时清空它们。一个更显式的做法是把 turn 级状态封装成一个对象，在每次 `submitMessage()` 开始时整体重置。

## 6.5 QueryEngine 和 query.ts 的职责边界

`QueryEngine` 做的事情，`query.ts` 不做：维护 `mutableMessages`（消息历史是会话级资产，跨 turn 保留）、在 API 调用前写 transcript（保证 `--resume` 可用）、累计 `totalUsage`（跨 turn 的 token 用量统计）、收集 `permissionDenials`（向 SDK 报告哪些工具调用被拒绝）。

`query.ts` 做的事情，`QueryEngine` 不做：维护单轮的 `State`（消息演化、压缩状态、恢复计数）、判断是否继续下一轮（基于 `tool_use` 是否出现）、处理上下文过长、输出截断等运行时异常。

**这条边界的价值：** 新增接入层（SDK、REPL、远程）时，只需要在 `QueryEngine` 层做协议适配，`query.ts` 的状态机逻辑不需要改动。

## 6.6 心智模型验证题

如果把"在 API 调用前写 transcript"改成"在 API 响应后写 transcript"，会发生什么？

答案：如果用户在发送消息后、API 响应到来前点击 Stop，进程被杀死，transcript 里只有 queue-operation 条目，没有用户消息。`getLastSessionLog` 过滤掉 queue-operation 条目后返回 null，`--resume` 失败，提示"No conversation found"。这正是这个 bug 被修复之前的行为。

## 6.7 本章小结

`QueryEngine` 的核心价值是两件事：在 API 调用前持久化用户消息（保证 `--resume` 可用），以及维护跨 turn 的会话状态（消息历史、用量统计、权限记录）。

两次 `processUserInputContext` 的设计揭示了"阶段锁定"模式：斜杠命令处理阶段允许修改历史，查询执行阶段锁定历史。这种区分不是偶然的，而是防止意外修改的设计。
