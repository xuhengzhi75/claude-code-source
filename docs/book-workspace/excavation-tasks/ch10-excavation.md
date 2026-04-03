# ch10 挖掘任务卡：运行时壁垒

**认领人：** startheart
**状态：** 已完成 ✅
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

**结论 1-A：三层 fallback，最终兜底是调用方传入的 `defaultValue`**
- 状态：verified
- 源码：`src/services/analytics/growthbook.ts:734-775`（`getFeatureValue_CACHED_MAY_BE_STALE`）
- 优先级从高到低：
  1. **env var 覆盖**（`CLAUDE_INTERNAL_FC_OVERRIDES`，仅 ant 用户）：eval 测试用，完全绕过网络和磁盘
  2. **config 覆盖**（`growthBookOverrides`，仅 ant 用户）：运行时通过 `/config Gates` 面板设置
  3. **内存缓存**（`remoteEvalFeatureValues`）：本次进程成功拉取后的值，最新鲜
  4. **磁盘缓存**（`~/.claude.json` 的 `cachedGrowthBookFeatures`）：跨进程持久化，可能是上次会话的值
  5. **调用方 `defaultValue`**：完全离线时的最终兜底

**结论 1-B：`CACHED_MAY_BE_STALE` 的"最旧"是上一次成功拉取的值，没有 TTL**
- 状态：verified
- 源码：`src/services/analytics/growthbook.ts:407-417`（`syncRemoteEvalToDisk`）
- 磁盘缓存是"整体替换"（wholesale replace），每次成功拉取后用新值覆盖全部。没有 TTL 机制——如果网络一直不可达，磁盘缓存会永远保持上次成功拉取时的值。
- 注释明确说明："Wholesale replace (not merge): features deleted server-side are dropped from disk on the next successful payload."
- 实际含义：如果用户 6 个月没有联网，feature flag 的值是 6 个月前的快照。对于 kill switch 类的安全功能，这意味着离线用户无法被远程关闭。

**结论 1-C：init 超时是 5 秒，超时后静默降级到磁盘缓存**
- 状态：verified
- 源码：`src/services/analytics/growthbook.ts:554-607`
- `thisClient.init({ timeout: 5000 })` — 5 秒超时。超时后 `.catch(error => { if (process.env.USER_TYPE === 'ant') { logError(toError(error)) } })` — 外部用户连错误日志都不记，静默降级。
- 这是有意的设计：GrowthBook 初始化失败不应该阻塞用户使用 Claude Code。

**结论 1-D：安全相关的 gate 有特殊处理——等待 re-init 完成**
- 状态：verified
- 源码：`src/services/analytics/growthbook.ts:851-889`（`checkSecurityRestrictionGate`）
- 普通 feature flag 用 `_CACHED_MAY_BE_STALE`（同步，立即返回缓存值）。安全限制 gate 用 `checkSecurityRestrictionGate`（异步，如果正在 re-init 则等待完成）。
- 这区分了两类 flag：功能性 flag（可以用旧值）vs 安全性 gate（必须用最新值）。

**结论 1-E：GrowthBook 依赖 1P 事件日志，1P 日志被禁用时 GrowthBook 整体关闭**
- 状态：verified
- 源码：`src/services/analytics/growthbook.ts:422-425`（`isGrowthBookEnabled`）
- `isGrowthBookEnabled()` 直接调用 `is1PEventLoggingEnabled()`。如果用户禁用了遥测（或在不支持 1P 日志的环境），GrowthBook 整体不工作，所有 feature flag 返回 `defaultValue`。
- 这意味着：禁用遥测 = 禁用所有 feature flag = 系统退化到"出厂默认值"状态。

---

**任务 2：`agent_busy` 状态机**

文件：`src/utils/tasks.ts`

**结论 2-A：`agent_busy` 是任务认领时的原子检查结果，不是持久化的状态字段**
- 状态：verified
- 源码：`src/utils/tasks.ts:491-502, 621-697`
- `agent_busy` 是 `ClaimTaskResult.reason` 的一个枚举值，不是 Task 对象上的字段。它在 `claimTaskWithBusyCheck()` 执行时动态计算：如果 agent 已经拥有其他未完成的任务（`status !== 'completed' && owner === claimantAgentId`），就返回 `agent_busy`。
- 没有"进入 agent_busy 状态"和"退出 agent_busy 状态"的概念——每次认领任务时都重新检查。

**结论 2-B：`agent_busy` 检查和任务认领是原子操作，用 list-level 锁防 TOCTOU**
- 状态：verified
- 源码：`src/utils/tasks.ts:621-697`（`claimTaskWithBusyCheck`）
- 注释（中文）："关键一致性点：把'检查 agent 是否繁忙'与'抢占任务'放进同一把 list-level 锁。这是典型的 check-then-act 场景，分离会导致 TOCTOU 竞争（两个 agent 同时看到空闲并同时认领）。"
- 这是整个代码库里极少见的中文注释之一（另一处是 `buildPostCompactMessages`），说明这个并发正确性约束极其重要。

**结论 2-C：`agent_busy` 和外部 kill switch 是完全不同层次的控制，没有代码交集**
- 状态：verified
- `agent_busy`：**本地任务调度层**，防止单个 agent 同时持有多个任务（避免资源竞争）。由 `tasks.ts` 的文件锁机制实现，完全本地，无网络依赖。
- kill switch（`isSinkKilled`）：**远程遥测控制层**，通过 GrowthBook 的 `tengu_frond_boric` 配置（混淆名）关闭 Datadog 或 1P 事件日志。由 `sinkKillswitch.ts` 实现，依赖 GrowthBook 网络拉取。
- 两者没有任何代码交集：`agent_busy` 不受 kill switch 影响，kill switch 也不影响任务调度。

**结论 2-D：`claimTask` 有两种模式，`checkAgentBusy` 是可选的**
- 状态：verified
- 源码：`src/utils/tasks.ts:528-535`（`ClaimTaskOptions`）
- 默认模式（`checkAgentBusy: false`）：只用 task-level 锁，不检查 agent 是否繁忙，允许 agent 同时持有多个任务。
- 严格模式（`checkAgentBusy: true`）：用 list-level 锁，原子检查 agent 繁忙状态。
- 这个设计允许调用方根据场景选择：swarm 模式下需要严格模式，单 agent 模式下不需要。

---

**任务 3：excluded-strings.txt 的实际覆盖范围**

文件：多处注释引用，`scripts/excluded-strings.txt`（本仓库未包含该文件，但注释揭示了其内容）

**结论 3-A：excluded-strings.txt 主要包含三类字符串：模型代号、内部功能代号、API key 前缀**
- 状态：verified（通过注释推断，文件本身不在本仓库）
- 证据来源：
  - `src/utils/model/antModels.ts:33`："Add the codename to scripts/excluded-strings.txt to prevent it from leaking to external builds."（模型代号）
  - `src/services/compact/autoCompact.ts:178`："it's in excluded-strings.txt"（内部实验代号如 `cobalt_raccoon`、`marble_origami`）
  - `src/services/teamMemorySync/secretScanner.ts:44`："Anthropic API key prefix, assembled at runtime so the literal byte sequence isn't present in the external bundle (excluded-strings check)."（API key 前缀 `sk-ant-api`）
  - `src/buddy/types.ts:10`："One species name collides with a model-codename canary in excluded-strings.txt."（动物代号作为金丝雀检测）

**结论 3-B：检查机制是构建后扫描，不是编译期 DCE**
- 状态：inference（基于注释模式推断）
- 代码里的应对策略揭示了检查机制：
  - 字符串拼接绕过：`const ANT_KEY_PFX = ['sk', 'ant', 'api'].join('-')` — 注释说"join() is not constant-folded by the minifier"，说明检查是扫描打包后的 bundle 文件，而不是源码
  - 动态 import 绕过：`await import('../main.js')` — 把含有 excluded strings 的模块放进动态 import，让它不出现在主 bundle 的静态字符串表里
  - `feature()` 包裹：`if (feature('CONTEXT_COLLAPSE'))` — Bun bundle 的 DCE 会在外部构建时把整个 if 块删掉，连字符串都不会出现在 bundle 里

**结论 3-C：excluded-strings.txt 本身不在本仓库，是构建系统的一部分**
- 状态：verified
- `scripts/` 目录下只有 `check-anchors.sh`、`check-anchors-semantic.py`、`gen-infographic.py`、`hooks/`，没有 `excluded-strings.txt`。
- 这个文件存在于 Anthropic 内部的构建系统中，不随源码一起发布。本仓库是源码泄露版本，构建脚本不完整。

---

### 🟡 加分项

**任务 4：Statsig 遥测分层的具体分层逻辑**

- 状态：verified
- 源码：`src/services/analytics/firstPartyEventLoggingExporter.ts`（多处 `process.env.USER_TYPE === 'ant'` 判断）
- 分层不是"内部用户收集更多数据"，而是"内部用户的数据走不同的上报路径"：
  - 外部用户（`USER_TYPE !== 'ant'`）：数据经过脱敏，model 字段被过滤（`src/services/analytics/datadog.ts:205`："if (process.env.USER_TYPE !== 'ant' && typeof allData.model === 'string')"）
  - 内部用户（`USER_TYPE === 'ant'`）：完整数据，包括 model 字段、详细错误信息、调试日志
- `_PROTO_*` 字段是 PII 标记字段，只发给 1P（Anthropic 内部），不发给 Datadog（第三方）。这是数据隐私的代码级实现。

**任务 5：`setupPeriodicGrowthBookRefresh` 的实现细节**

- 状态：verified
- 源码：`src/services/analytics/growthbook.ts:1087-1110`
- 刷新是 `setInterval`（不是递归 setTimeout），间隔固定：外部用户 6 小时，内部用户 20 分钟。
- `refreshInterval.unref?.()` — 这个 timer 不会阻止进程退出（Node.js 的 unref 语义）。
- 刷新失败（网络超时）不影响下次刷新调度：`refreshGrowthBookFeatures()` 内部有 try/catch，失败只记日志，setInterval 继续按时触发。
- **没有主动失效机制**，但有一个特殊路径：`refreshGrowthBookAfterAuthChange()` 在登录/登出时立即重建 client 并重新 init，这是唯一的"立即刷新"触发点。
- 6 小时间隔的设计意图（注释）："Matches Statsig's 6-hour refresh interval"——这是历史遗留，GrowthBook 是从 Statsig 迁移过来的，沿用了 Statsig 的轮询间隔。

---

### 🟢 意外发现区

**[`src/services/analytics/sinkKillswitch.ts:4`] kill switch 的配置名是混淆的**
- 为什么有意思：`SINK_KILLSWITCH_CONFIG_NAME = 'tengu_frond_boric'`。`tengu` 是 Claude Code 的内部代号，`frond_boric` 是随机词组（混淆）。这个混淆是有意的——如果配置名是 `tengu_kill_analytics`，外部用户看到 GrowthBook 请求就能猜到这是 kill switch。混淆名让功能不可被逆向推断。

**[`src/services/analytics/growthbook.ts:330-340`] 服务端 API 有 bug，客户端做了 workaround**
- 为什么有意思：注释说"WORKAROUND: Transform remote eval response format. The API returns { 'value': ... } but SDK expects { 'defaultValue': ... }. TODO: Remove this once the API is fixed to return correct format"。这个 workaround 已经存在了相当长时间（有 TODO 但没有修），说明服务端 API 的 bug 修复优先级很低，或者修复成本高（需要协调客户端和服务端同步升级）。

**[`src/services/analytics/growthbook.ts:338`] 空 payload 保护防止"全局 flag 清零"**
- 为什么有意思：`if (!payload?.features || Object.keys(payload.features).length === 0) { return false }`。注释解释了为什么需要这个检查："Empty object is truthy — without the length check, `{features: {}}` (transient server bug, truncated response) would pass, clear the maps below, return true, and syncRemoteEvalToDisk would wholesale-write `{}` to disk: total flag blackout for every process sharing ~/.claude.json."——一个服务端的瞬时 bug（返回空 features 对象）会导致所有用户的 feature flag 全部清零，直到下次成功拉取。这个防护是真实事故后加的。

**[`src/services/analytics/growthbook.ts:622`] `initializeGrowthBook` 用 `memoize` 但有 re-init 路径**
- 为什么有意思：`initializeGrowthBook` 是 `memoize` 的（只初始化一次），但 `resetGrowthBook()` 会清除 memoize 缓存（`initializeGrowthBook.cache?.clear?.()`），允许重新初始化。这是一个"可重置的单例"模式，用于处理登录/登出时需要更换 auth headers 的场景。

---

## 写作注意事项

1. ch10 的核心论题是"运行时控制能力是竞争壁垒"——重点不是"有 feature flag"，而是"feature flag + 实时下发 + 离线降级"这套组合能做到什么
2. GrowthBook 的轮询间隔（6小时 vs 20分钟）要和"安全事件响应速度"连起来——如果出现模型越权行为，Anthropic 能在多快时间内在全球范围关闭这个功能？答案是：内部用户 20 分钟内生效，外部用户最长 6 小时才生效（离线用户永远不生效）
3. `agent_busy` 和 kill switch 是两个完全不同层次的控制机制，不要混在一起写：前者是本地任务调度的并发控制，后者是远程遥测的紧急关闭
4. excluded-strings.txt 的核心价值是"防止内部信息泄露到外部构建"，不是"防止用户看到"——源码已经泄露了，但构建产物（npm 包）里不应该有这些字符串
