# ch10 挖掘任务卡：运行时壁垒

**认领人：** startheart
**状态：** 待认领
**目标章节：** `docs/book/chapters/ch10-运行时壁垒.md`（当前 123 行）
**写作规范：** `docs/book-workspace/methodology/writing-principles.md`

---

## 背景与现状

ch10 讲 Claude Code 如何通过运行时机制形成竞争壁垒：GrowthBook feature flags、Statsig 遥测分层、agent_busy/kill switch、构建时字符串检查（excluded-strings.txt）。

现有内容的主要缺口：
1. **GrowthBook 轮询间隔的设计意图没有** — 章节提到"外部用户 6 小时、内部用户 20 分钟"，但没有解释为什么这么设计：为什么不实时？6小时意味着什么？
2. **feature flag 的 fallback 行为没有** — 如果 GrowthBook 服务不可达，feature flag 的值是什么？是固定的 default，还是用缓存？
3. **`agent_busy` 和 `kill switch` 的关系没有厘清** — 章节把这两个混在一起，但它们是不同层次的控制机制

---

## 挖掘任务

### 🔴 必答（ch10 改稿必须覆盖）

**任务 1：GrowthBook 离线/不可达时的 fallback**

文件：`src/services/analytics/growthbook.ts`

- `getFeatureValue_CACHED_MAY_BE_STALE()` 在缓存未命中时怎么处理？（返回 default？抛错？阻塞？）
- 如果网络不可达，系统的功能集会退化成什么状态？有没有注释说明哪些功能依赖 feature flag，哪些功能在离线时还能工作？
- `CACHED_MAY_BE_STALE` 这个命名是设计意图的直接表达——可以有多"stale"（最旧的状态是什么？）

格式要求：结论 + verified/inference 标注 + 源码行号

---

**任务 2：`agent_busy` 状态机**

文件：`src/utils/tasks.ts` 或 `src/services/agentStatus.ts`

- `agent_busy` 状态是怎么设置和清除的？（什么时候进入，什么时候退出）
- `claimTaskWithBusyCheck()` 失败时返回什么？调用方怎么处理这个失败？
- `agent_busy` 和外部 kill switch 的区别：前者是本地状态，后者是远程下发——在代码里它们是否有交集？

---

**任务 3：excluded-strings.txt 的实际覆盖范围**

文件：构建脚本（可能在 `scripts/` 或 `package.json` 的 build 相关命令里）

- excluded-strings.txt 列出了哪些类型的字符串？（内部代号？API key 前缀？）
- 构建时检查是在哪个阶段运行的？（打包前？打包后？）
- 这次源码泄露中，`excluded-strings.txt` 的检查有没有被触发？（source map 是否在检查范围内？）

---

### 🟡 加分项

**任务 4：Statsig 遥测分层的具体分层逻辑**

- `IS_STATSIG_INTERNAL` 或类似常量：内部用户和外部用户在遥测数据上有什么不同？
- 内部用户是否会收集更多数据（比如完整的 tool call 内容），外部用户是否被脱敏？
- 遥测数据会不会反过来影响 feature flag 的决策？（A/B 测试的数据回路）

---

**任务 5：`setupPeriodicGrowthBookRefresh` 的实现细节**

`growthbook.ts#L1087` 的定期刷新：
- 刷新是 setInterval 还是递归 setTimeout？（两者的误差特性不同）
- 刷新失败时（网络超时）会影响下次刷新的调度吗？
- 有没有主动失效机制（比如用户权限变化时立即刷新，不等到下次轮询）？

---

### 🟢 意外发现区

格式：`[文件路径#行号] 发现 + 为什么有意思`

---

## 写作注意事项

1. ch10 的核心论题是"运行时控制能力是竞争壁垒"——重点不是"有 feature flag"，而是"feature flag + 实时下发 + 离线降级"这套组合能做到什么
2. GrowthBook 的轮询间隔（6小时 vs 20分钟）要和"安全事件响应速度"连起来——如果出现模型越权行为，Anthropic 能在多快时间内在全球范围关闭这个功能？
3. 避免把 ch10 写成"功能介绍"，要写成"这些机制在实际运营中意味着什么"
