# ch03/ch04 挖掘任务卡：入口路由与装配

## 任务背景

ch03 和 ch04 描述了 CLI 入口路由树和 main.tsx 装配逻辑。本卡聚焦三个关键修正点：
1. 入口文件架构：`cli.tsx` 是真正的入口，`main.tsx` 是完整 CLI 主路径（不是章节描述的"入口"）
2. 路由树比章节描述的更复杂，有更多 fast-path 分支
3. `main.tsx` 预热调用的精确实现（不是函数调用，是 import 副作用）

---

## Q1：入口文件架构修正

### 章节原文描述

ch03 描述 `cli.tsx#L40` 的 `--version` fast-path，ch04 描述 `main.tsx` 的预热调用。

### 源码验证结论

**[verified: src/entrypoints/cli.tsx L1-309, src/main.tsx L1-20]**

**架构关系**：`cli.tsx` 是真正的入口文件（`void main()` 在最后一行），`main.tsx` 是完整 CLI 主路径的实现，由 `cli.tsx` 在未命中任何 fast-path 时动态 import：

```typescript
// cli.tsx 末尾（L294-304）
const { main: cliMain } = await import('../main.js')
await cliMain()
```

`main.tsx` 的预热调用不是"函数调用"，而是**模块顶层的 import 副作用**：

```typescript
// main.tsx L1-20（精确实现）
// These side-effects must run before all other imports:
// 1. profileCheckpoint marks entry before heavy module evaluation begins
// 2. startMdmRawRead fires MDM subprocesses (plutil/reg query) so they run in
//    parallel with the remaining ~135ms of imports below
// 3. startKeychainPrefetch fires both macOS keychain reads (OAuth + legacy API
//    key) in parallel — isRemoteManagedSettingsEligible() otherwise reads them
//    sequentially via sync spawn inside applySafeConfigEnvironmentVariables()
//    (~65ms on every macOS startup)
import { profileCheckpoint, profileReport } from './utils/startupProfiler.js';
profileCheckpoint('main_tsx_entry');
import { startMdmRawRead } from './utils/settings/mdm/rawRead.js';
startMdmRawRead();
import { ensureKeychainPrefetchCompleted, startKeychainPrefetch } from './utils/secureStorage/keychainPrefetch.js';
startKeychainPrefetch();
```

关键细节：`profileCheckpoint` 在 `startMdmRawRead` 的 import 之前调用，`startMdmRawRead` 在 `startKeychainPrefetch` 的 import 之前调用。这是 ES module 顶层副作用的精确顺序，不是普通函数调用序列。

---

## Q2：cli.tsx 路由树的完整分支（比章节描述多）

**[verified: src/entrypoints/cli.tsx L1-309]**

章节描述的路由树不完整。实际路由树按顺序：

1. **`--version`/`-v`/`-V`**（L41）：零模块加载，直接打印版本退出
2. **`--dump-system-prompt`**（L57，DUMP_SYSTEM_PROMPT feature）：ant-only，打印系统提示词后退出
3. **Chrome 集成三分支**（L76-97）：`--claude-in-chrome-mcp`、`--chrome-native-host`、`--computer-use-mcp`（CHICAGO_MCP feature）
4. **`--daemon-worker`**（L104，DAEMON feature）：supervisor 内部生成，**必须在 daemon 子命令之前**
5. **`remote-control`/`rc`/`remote`/`sync`/`bridge`**（L116，BRIDGE_MODE feature）：有三重检查（auth → GrowthBook gate → 版本检查 → 策略限制）
6. **`daemon`**（L169，DAEMON feature）：长期 supervisor 进程
7. **`ps`/`logs`/`attach`/`kill`/`--bg`/`--background`**（L189，BG_SESSIONS feature）：后台会话管理
8. **`new`/`list`/`reply`**（L216，TEMPLATES feature）：模板任务，用 `process.exit(0)` 而非 `return`（Ink TUI 遗留事件循环）
9. **`environment-runner`**（L230，BYOC_ENVIRONMENT_RUNNER feature）：无头 BYOC runner
10. **`self-hosted-runner`**（L242，SELF_HOSTED_RUNNER feature）：自托管 runner
11. **`--worktree --tmux`**（L252）：exec 进 tmux，可能 fall-through 到完整路径
12. **`--update`/`--upgrade`**（L281）：重定向到 update 子命令
13. **`--bare`**（L287）：提前设置 `CLAUDE_CODE_SIMPLE=1`，让模块加载时的 gate 能感知
14. **完整 CLI 主路径**（L294）：`startCapturingEarlyInput()` + 动态 import `main.js`

**重要细节**：
- `--daemon-worker` 必须在 `daemon` 之前（注释明确说明）
- BRIDGE_MODE 的 auth 检查必须在 GrowthBook gate 之前（注释：没有 auth，GrowthBook 没有用户上下文，会返回 stale/default false）
- TEMPLATES 用 `process.exit(0)` 而非 `return`，因为 Ink TUI 可能留下阻止自然退出的事件循环句柄
- `--bare` 在进入完整路径之前设置环境变量，确保模块加载时的 gate 能感知（不只是 action handler 里）

---

## Q3：ABLATION_BASELINE 模块顶层副作用

**[verified: src/entrypoints/cli.tsx L16-26]**

章节未提及的重要细节：`cli.tsx` 顶层有一个 `ABLATION_BASELINE` feature 的副作用：

```typescript
if (feature('ABLATION_BASELINE') && process.env.CLAUDE_CODE_ABLATION_BASELINE) {
  for (const k of ['CLAUDE_CODE_SIMPLE', 'CLAUDE_CODE_DISABLE_THINKING', 
    'DISABLE_INTERLEAVED_THINKING', 'DISABLE_COMPACT', 'DISABLE_AUTO_COMPACT',
    'CLAUDE_CODE_DISABLE_AUTO_MEMORY', 'CLAUDE_CODE_DISABLE_BACKGROUND_TASKS']) {
    process.env[k] ??= '1';
  }
}
```

注释说明为什么必须在 `cli.tsx` 顶层而不是 `init.ts`：`BashTool`/`AgentTool`/`PowerShellTool` 在 import 时就把 `DISABLE_BACKGROUND_TASKS` 捕获到模块级常量里，`init()` 运行太晚。这是"模块加载时机"约束的另一个实例。

---

## Q4：tools.ts 三维度裁剪的精确实现

**[verified: src/tools.ts L1-100, L193-254]**

章节描述的三维度裁剪基本准确，但有几处需要补充：

**实际裁剪维度比章节描述的更多**：

```typescript
// 维度1：用户身份（ant-only）
const REPLTool = process.env.USER_TYPE === 'ant' ? require(...) : null
const SuggestBackgroundPRTool = process.env.USER_TYPE === 'ant' ? require(...) : null

// 维度2：构建时 feature flag
const SleepTool = feature('PROACTIVE') || feature('KAIROS') ? require(...) : null
const WebBrowserTool = feature('WEB_BROWSER_TOOL') ? require(...) : null

// 维度3：运行时环境检测
...(hasEmbeddedSearchTools() ? [] : [GlobTool, GrepTool])

// 维度4：运行时环境变量（不是 feature flag）
const VerifyPlanExecutionTool = process.env.CLAUDE_CODE_VERIFY_PLAN === 'true' ? require(...) : null

// 维度5：运行时函数调用（动态）
...(isWorktreeModeEnabled() ? [EnterWorktreeTool, ExitWorktreeTool] : [])
...(isTodoV2Enabled() ? [TaskCreateTool, TaskGetTool, TaskUpdateTool, TaskListTool] : [])
...(isToolSearchEnabledOptimistic() ? [ToolSearchTool] : [])
```

实际上有五个维度，不是三个。

**懒加载的工具不只 TeamCreateTool**：

```typescript
// 循环依赖懒加载（三个）
const getTeamCreateTool = () => require('./tools/TeamCreateTool/TeamCreateTool.js').TeamCreateTool
const getTeamDeleteTool = () => require('./tools/TeamDeleteTool/TeamDeleteTool.js').TeamDeleteTool
const getSendMessageTool = () => require('./tools/SendMessageTool/SendMessageTool.js').SendMessageTool
```

`getSendMessageTool()` 也是懒加载，且**无条件包含在工具列表里**（`getAllBaseTools()` L229：`getSendMessageTool()`），不像 TeamCreateTool 有 `isAgentSwarmsEnabled()` 门控。

**Statsig 同步约束的精确位置**：

```typescript
// tools.ts L191-192
/**
 * NOTE: This MUST stay in sync with https://console.statsig.com/4aF3Ewatb6xPVpCwxb5nA3/dynamic_configs/claude_code_global_system_caching, in order to cache the system prompt across users.
 */
```

注释直接给出了 Statsig 控制台 URL，说明这是一个需要同时修改代码和云端配置的双重操作。

---

## 写作建议

1. **修正入口文件架构**：`cli.tsx` 是入口，`main.tsx` 是完整路径实现，两者是调用关系
2. **补充路由树完整分支**：Chrome 集成三分支、BRIDGE_MODE 三重检查、TEMPLATES 的 `process.exit` 原因
3. **补充 `--bare` 的提前设置逻辑**：必须在模块加载前设置，不只是 action handler 里
4. **修正工具裁剪维度**：实际有五个维度，不是三个
5. **补充 `getSendMessageTool()` 无条件懒加载**：与 TeamCreateTool 的有条件懒加载不同
