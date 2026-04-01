# Runtime Structure

## 一句话定位
这份笔记服务于 Part IV 中“任务推进与运行时结构”。重点不是解释所有细节，而是给写作侧一张清楚的运行时骨架图：状态机怎样继续、为什么继续、在哪里结束、任务系统又在何处接进来。

## 核心判断
`src/query.ts` 不是普通工具文件，而是单个 agentic turn 的主循环状态机。它把上下文准备、模型流式调用、tool_use 执行、恢复重试、预算控制和终态判定组织在同一条循环里。

## 运行时最小结构
```text
query() wrapper
  -> queryLoop(...)
     -> 初始化 State / config / budget
     -> while(true)
        A. 准备 messagesForQuery 与压缩链
        B. 流式调模型
        C. 判断 needsFollowUp
           - 无 tool_use: 进入终态/恢复/预算收口
           - 有 tool_use: 执行工具、回灌结果、构造 next state
```

## 最该讲的 4 个点

### 1. State + transition 是显式状态机
关键字段包括：
- `messages`
- `turnCount`
- `transition`
- `autoCompactTracking`
- `pendingToolUseSummary`

这里不是抽象 FSM 框架，而是“显式原因标签 + 整体 state 替换”的工程化状态机。

### 2. 主判据是 observed `tool_use`
继续下一轮的核心依据是有没有真实出现 `tool_use`，而不是只看 `stop_reason`。

### 3. 三套 budget / recovery 机制不要混写
- API 层 `task_budget`
- 产品层 `TOKEN_BUDGET`
- 错误恢复层 `max_output_tokens` 恢复链

### 4. tasks 接缝在主循环里
主循环里不仅有模型和工具，还会消费任务通知、队列消息，并在 BG sessions 场景下生成 task summary。

## 关键源码锚点
- `src/query.ts`::`type State`
- `src/query.ts`::`while (true)`
- `src/query.ts`::`transition`
- `src/query.ts`::`needsFollowUp`
- `src/query.ts`::`runTools(...)`
- `src/query.ts`::`return { reason: ... }`

## 不要重复讲的内容
- compact 各算法内部实现细节
- hooks 的业务策略细节
- model fallback 的产品叙事
- 各类 analytics / telemetry

## 给写作侧的交接提示
正文重点写：
1. 状态机骨架
2. tool_use 驱动的继续链
3. 三套 budget / recovery 的边界
4. 终态与任务接缝

不要把这一章写成 query.ts 全量逐行讲解。