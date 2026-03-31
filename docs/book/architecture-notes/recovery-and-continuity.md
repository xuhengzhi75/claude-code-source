# Recovery & Continuity（恢复与连续性）架构笔记

## 一句话
该系统的恢复能力不是“单点魔法”，而是一个**分层恢复流水线**：日志链恢复事实、反序列化修复语义、压缩边界保留上下文、会话记忆维持长期连续性。

## 关键源码入口
- `src/utils/conversationRecovery.ts`
  - `loadConversationForResume`
  - `deserializeMessagesWithInterruptDetection`
  - `restoreSkillStateFromMessages`
- `src/history.ts`
  - Prompt 历史写入、异步 flush、撤销 `removeLastFromHistory`
- `src/services/compact/compact.ts`
  - 全量/局部 compact、边界注入、附件重放
- `src/commands/compact/compact.ts`
  - /compact 命令总流程（session-memory compact → reactive/traditional fallback）
- `src/services/SessionMemory/sessionMemory.ts`
  - 会话记忆增量抽取与落盘

## 恢复流水线（核心）

### 第 1 层：事实恢复（log replay）
`loadConversationForResume` 会从不同来源加载：
- 最近会话
- 指定 sessionId
- 指定 jsonl 文件（跨目录）

然后 chain-walk 找主链，恢复消息、快照、metadata。

### 第 2 层：语义修复（anti-corruption）
`deserializeMessagesWithInterruptDetection` 做了很多“脏数据防腐”：
- 迁移 legacy attachment 类型
- 清理非法 permissionMode
- 过滤未配对 tool use / 孤立 thinking / 空白 assistant
- 检测中断 turn，并在必要时补“continue”元消息
- 必要时补 assistant sentinel，保证 API 对话结构合法

### 第 3 层：压缩后连续性（context continuity）
`compact.ts` 在压缩后按固定协议重建最小上下文：
- boundary
- summary
- （可选）保留段
- 文件/技能/计划/异步任务附件
- hooks

并通过 `compactMetadata.preservedSegment` 维护“保留段重连信息”，确保 resume 时链路不断。

### 第 4 层：长期记忆（slow memory）
`sessionMemory.ts` 在阈值触发后，用受限子代理更新 session memory 文件：
- 只允许 edit 指向 memoryPath
- 与主对话隔离上下文，减少污染
- 记录抽取节奏，避免过度频繁

## 历史系统的恢复友好点
`history.ts` 的设计很实用：
- 异步 flush + cleanup 兜底
- remove-last 的“竞态双路径”（pending pop / timestamp skip）
- 大粘贴内容 hash 外置，控制主日志体积

意味着即使有中断，历史仍保持“基本可用+可修复”。

## 对非技术读者的解释
把它看作“航班黑匣子 + 自动续飞系统”：
1. 黑匣子保留飞行事实（日志）。
2. 地面系统校正异常记录（语义修复）。
3. 起飞前装回关键导航卡（compact 后附件重放）。
4. 飞行中写飞行笔记（session memory），下次更稳。

## 可借鉴清单
1. 恢复要分层：**先恢复事实，再恢复语义**。
2. 对 AI 会话，要把“结构合法性”当硬约束（sentinel、tool pairing）。
3. 压缩不是删除，而是“**可重建地删减**”。
4. 长期记忆更新要最小权限化，防止副作用蔓延。
