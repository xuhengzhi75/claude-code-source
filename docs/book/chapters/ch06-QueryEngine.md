# 第6章 QueryEngine：一条注释里藏着的 bug 修复历史

> **核心主张：`QueryEngine` 存在的理由是一个具体的 bug——进程在 API 响应之前被杀死，`--resume` 失败。修复这个 bug 的方式，揭示了整个会话持久化的设计逻辑。**

## 6.1 一个让 `--resume` 失效的场景

用户发出一条消息，然后在 API 响应到来之前点击了 Stop。进程被杀死。

用户重新打开，运行 `claude --resume`，系统提示："No conversation found"。

这不是用户操作错误，这是一个 bug。[`QueryEngine.ts#L443`](https://github.com/xuhengzhi75/claude-code-source/blob/c68ee10/src/QueryEngine.ts#L443) 的注释完整记录了这个 bug 的原因和修复：

```typescript
// Persist the user's message(s) to transcript BEFORE entering the query
// loop. The for-await below only calls recordTranscript when ask() yields
// an assistant/user/compact_boundary message — which doesn't happen until
// the API responds. If the process is killed before that (e.g. user clicks
// Stop in cowork seconds after send), the transcript is left with only
// queue-operation entries; getLastSessionLog filters those out, returns
// null, and --resume fails with "No conversation found". Writing now makes
// the transcript resumable from the point the user message was accepted,
// even if no API response ever arrives.
```

原来的逻辑是：transcript 在 API 响应到来后才写入。这在正常情况下没问题，但在"发送后、响应前"被杀死时，transcript 里只有 queue-operation 条目，没有用户消息，`--resume` 找不到对话。

修复方案是把 transcript 写入移到 API 调用之前。一行代码的位置变化，解决了一个真实的用户体验问题。

## 6.2 这次写入有多贵

注释里还有一个细节：

```typescript
// --bare / SIMPLE: fire-and-forget. Scripted calls don't --resume after
// kill-mid-request. The await is ~4ms on SSD, ~30ms under disk contention
// — the single largest controllable critical-path cost after module eval.
```

这次 transcript 写入是整个启动路径上**最大的可控延迟**——SSD 上约 4ms，磁盘竞争时约 30ms。

所以在 bare 模式（脚本调用）下，这次写入是 fire-and-forget 的，不阻塞主流程：

```typescript
if (isBareMode()) {
  void transcriptPromise  // 不等待
} else {
  await transcriptPromise  // 交互模式等待完成
}
```

脚本调用不需要 `--resume`，所以可以接受写入失败的风险。交互模式需要 `--resume`，所以必须等写入完成再继续。同一个操作，根据使用场景选择不同的等待策略。

## 6.3 两次 `processUserInputContext`：同一接口，两种语义

[`QueryEngine.ts#L342`](https://github.com/xuhengzhi75/claude-code-source/blob/c68ee10/src/QueryEngine.ts#L342) 创建了第一个 `processUserInputContext`，注释解释了为什么要创建两次：

```typescript
// Slash commands that mutate the message array (e.g. /force-snip)
// call setMessages(fn). In interactive mode this writes back to
// AppState; in print mode we write back to mutableMessages so the
// rest of the query loop sees the result. The second
// processUserInputContext below (after slash-command processing)
// keeps the no-op — nothing else calls setMessages past that point.
setMessages: fn => {
  this.mutableMessages = fn(this.mutableMessages)
},
```

第一个对象允许斜杠命令修改消息历史。`/force-snip` 需要截断历史，这个回调让它能做到。

斜杠命令处理完成后，第二个对象把 `setMessages` 替换成空操作：

```typescript
setMessages: () => {},  // 锁定，不再允许修改
```

这是一种"阶段锁定"：斜杠命令处理阶段允许修改历史，查询执行阶段锁定历史。不需要引入新的类型或状态机，只需要替换回调实现。如果后续代码意外调用了 `setMessages`，什么都不会发生，不会有 bug，也不会有报错。

## 6.4 QueryEngine 管什么，query.ts 管什么

`QueryEngine` 是会话级容器，`query.ts` 是单轮执行引擎。两者的职责边界很清晰：

`QueryEngine` 管跨 turn 的东西：消息历史（`mutableMessages`，[`L190`](https://github.com/xuhengzhi75/claude-code-source/blob/c68ee10/src/QueryEngine.ts#L190)）、token 用量累计（`totalUsage`，[`L193`](https://github.com/xuhengzhi75/claude-code-source/blob/c68ee10/src/QueryEngine.ts#L193)）、权限拒绝记录（`permissionDenials`，[`L192`](https://github.com/xuhengzhi75/claude-code-source/blob/c68ee10/src/QueryEngine.ts#L192)）、transcript 持久化。

`query.ts` 管单轮内的东西：当前轮的 `State`（消息演化、压缩状态）、是否继续下一轮（基于 `tool_use` 是否出现）、上下文过长的处理。

这条边界的价值是：新增接入层（SDK、REPL、远程）时，只需要在 `QueryEngine` 层做协议适配，`query.ts` 的状态机逻辑不需要改动。

## 6.5 turn 级状态 vs. 会话级状态

`discoveredSkillNames`（[`QueryEngine.ts#L201`](https://github.com/xuhengzhi75/claude-code-source/blob/c68ee10/src/QueryEngine.ts#L201)）在每次 `submitMessage()` 开始时清空。这说明它是 turn 级状态，不是会话级状态。

`mutableMessages` 跨 turn 保留，`discoveredSkillNames` 每 turn 重置。这个区分目前是隐式的——哪些字段是会话级的，哪些是 turn 级的，需要读代码才能知道。如果未来需要更多 turn 级状态，开发者需要记得在 `submitMessage()` 开始时清空它们，否则上一轮的状态会污染下一轮。

## 6.6 验证题

如果把 transcript 写入从 API 调用前移到 API 调用后，会发生什么？

答案：用户发送消息后、API 响应到来前点击 Stop，进程被杀死。transcript 里只有 queue-operation 条目，没有用户消息。`getLastSessionLog` 过滤掉 queue-operation 后返回 null，`--resume` 失败，提示"No conversation found"。这正是这个 bug 被修复之前的行为。

## 6.7 本章小结

`QueryEngine` 的核心设计来自一个真实 bug 的修复：transcript 必须在 API 调用前写入（[`QueryEngine.ts#L443`](https://github.com/xuhengzhi75/claude-code-source/blob/c68ee10/src/QueryEngine.ts#L443)），否则 `--resume` 在进程被杀死时会失效。这次写入是整个启动路径上最大的可控延迟（4-30ms），所以 bare 模式下改为 fire-and-forget。

两次 `processUserInputContext` 的设计揭示了"阶段锁定"模式：斜杠命令处理阶段允许修改历史，查询执行阶段用空操作锁定历史。

需要记住的核心概念：**持久化的时序决定了恢复能力的边界——写入发生在哪一步，恢复就能从哪一步开始。**
