# Completed Coverage and Writing Queue

## 作用
本文件给写作侧直接使用：说明哪些代码主题已经解读完成，可以立刻开写哪些文章；哪些主题仍需补分析，不应过早定稿。

## 一、已完成解读清单

### 1. 主干执行链
代码主题：
- `src/entrypoints/cli.tsx`
- `src/main.tsx`
- `src/QueryEngine.ts`
- `src/query.ts`

对应产物：
- `architecture-notes/system-overview.md`
- `architecture-notes/execution-flow-guide.md`
- `references/references/chapter-evidence-map.md`
- `ch03 / ch04 / ch06 / ch07`

### 2. 能力装配层
代码主题：
- `src/commands.ts`
- `src/tools.ts`
- `src/Tool.ts`

对应产物：
- `architecture-notes/tool-system-detail.md`
- `ch05 / ch14 / ch15`

### 3. 任务系统与运行时接缝
代码主题：
- `src/Task.ts`
- `src/tasks.ts`
- `src/tasks/*`
- `query.ts` 中 tasks 接缝

对应产物：
- `architecture-notes/task-system.md`
- `architecture-notes/runtime-structure.md`
- `architecture-notes/task-recovery-map.md`
- `ch08 / ch17`

### 4. 恢复与连续性
代码主题：
- `conversationRecovery.ts`
- `compact.ts`
- `sessionMemory.ts`
- `sessionStorage.ts`

对应产物：
- `architecture-notes/recovery-and-continuity.md`
- `ch10 / ch18`

### 5. 护城河与可迁移经验
对应产物：
- `architecture-notes/moat-and-barriers.md`
- `architecture-notes/what-to-learn-from-claude-code.md`
- `ch09 / ch11 / ch12`

## 二、可立即开写的章节

### 优先级 A（证据最扎实）
- ch04 入口与请求路由
- ch06 QueryEngine
- ch07 QueryLoop
- ch14 工具
- ch16 状态与上下文
- ch17 任务推进与运行时结构
- ch18 恢复机制

### 优先级 B（可写，但需保守处理 inference）
- ch09 护城河
- ch10 运行时壁垒
- ch11 为什么很多 Agent 干不了真活
- ch12 该学什么 / 先别抄什么

### 优先级 C（下一轮优先的新章节）
- 前桥接章（替换 ch03）
- 恢复全景章
- 权限与安全治理章
- 后桥接章（从看懂到复用）

## 三、先不要定稿的部分
1. Part V（业务落地全套）
2. 强性能收益 / 强稳定性收益结论
3. 权限与安全治理最终定稿版
4. 跨模型可迁移性的绝对化判断

## 四、写作侧注意事项
- 优先使用已完成的 architecture-notes 与 evidence map
- 不重复深挖已经明确交给源码分析侧处理的主题
- 保守区分 verified / inference
- 未被 analysis notes 覆盖的新判断，先回提给分析侧，不直接拍板
