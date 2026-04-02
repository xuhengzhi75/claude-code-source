# ch16 挖掘任务卡：状态与上下文

**认领人：** startheart
**状态：** 待认领
**目标章节：** `docs/book/chapters/ch16-状态与上下文.md`（当前 122 行）
**写作规范：** `docs/book-workspace/methodology/writing-principles.md`

---

## 背景与现状

ch16 讲 Claude Code 的状态管理：`AppState`、函数式更新 `setAppState(prev => f(prev))`、`useAppState`/`useAppStateSelector` 两层 hook 的区分、上下文裁剪（token 预算管理）。

现有内容的主要缺口：
1. **函数式更新的必要性没有具体 bug 支撑** — 章节说"防止并发竞态"，但没有说：不用函数式更新，在什么真实场景下会出问题？
2. **上下文裁剪的具体算法没有** — 章节提到"token 预算"，但没有说：哪些内容会被裁剪、裁剪顺序是什么、有没有硬性截断 vs 软性优先级降序
3. **`useAppStateSelector` vs `useAppState` 的性能差异没有量化** — 章节说"避免不必要的重渲染"，但没有说在实际中这有多大影响

---

## 挖掘任务

### 🔴 必答（ch16 改稿必须覆盖）

**任务 1：函数式更新的必要场景**

文件：`src/AppState.ts` 或 `src/hooks/useAppState.ts`

- `setAppState(prev => f(prev))` vs `setAppState(newState)`，两者在并发场景下的区别
- 有没有注释或 bug 修复历史说明"不用函数式更新会出现什么问题"？（竞态条件的具体案例）
- 实际代码里有没有地方用了非函数式更新，然后加了注释说明为什么这里是安全的？

格式要求：结论 + verified/inference 标注 + 源码行号

---

**任务 2：上下文裁剪的算法**

文件：`src/utils/context.ts` 或相关文件

- token 预算的阈值是多少？（硬编码？配置？）
- 裁剪顺序：先裁哪些内容？（tool_result？中间轮次？还是有其他优先级？）
- 有没有"宁可截断也不能丢"的内容（比如最近几轮一定保留）？
- 裁剪后的上下文会有什么标记？（模型知道上下文被裁剪了吗？）

---

**任务 3：`useAppStateSelector` 的实际性能价值**

文件：`src/hooks/useAppState.ts`（或相关 hook 文件）

- `useAppState`（订阅全量）和 `useAppStateSelector`（订阅字段子集）的实现差异
- 在 Claude Code 的实际组件里，有没有注释说明某个组件"必须用 selector 否则重渲染太频繁"的例子？
- AppState 的更新频率大概是多少？（每次工具调用？每次 token？）

---

### 🟡 加分项

**任务 4：AppState 的字段膨胀历史**

`AppState` 有多少个字段？和 ch11 的 `State` 对象类似，有没有明显是后期补丁的字段？（注释里带 `// TODO`、`// HACK`、`// legacy` 等标记的）

---

**任务 5：上下文裁剪 vs `--resume` 截断的关系**

`sessionStorage.ts` 的 50MB 截断（读取层截断）和 `context.ts` 的 token 预算裁剪（组装层裁剪）是两个独立的机制吗？还是有协调？用户能感知到这两者的区别吗？

---

### 🟢 意外发现区

格式：`[文件路径#行号] 发现 + 为什么有意思`

---

## 写作注意事项

1. ch16 的核心论题是"状态管理在 Agent 系统里为什么比普通前端更难"——上下文裁剪是最有说服力的例子（普通前端不需要考虑 token 预算）
2. 函数式更新的必要性要用具体场景说明，不能只说"防止竞态"——读者不知道 Agent 系统的并发场景长什么样
3. 如果找不到 ch16 对应的具体源文件，可以在 `src/` 里搜索 `AppState`、`contextWindow`、`tokenBudget` 等关键词
