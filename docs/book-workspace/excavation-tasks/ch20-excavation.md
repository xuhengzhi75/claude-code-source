# ch20 挖掘任务卡：权限系统

**认领人：** startheart  
**状态：** ✅ 已完成  
**目标章节：** `docs/book/chapters/ch20-权限系统.md`（待创建）  
**写作规范：** `docs/book-workspace/methodology/writing-principles.md`

---

## 背景与现状

ch20 是全书最复杂的章节之一。权限系统横跨多个文件，涉及：
- 五种权限模式（default / acceptEdits / plan / auto / bypassPermissions）
- 两阶段检查架构（硬边界 + mode 策略）
- auto 模式的 YOLO 分类器（transcript classifier）
- denial tracking 状态机
- bypass/auto 的 killswitch 机制
- 危险权限规则的 strip/restore 生命周期

本卡覆盖**权限系统的运行时机制**，不覆盖 UI 层（Shift+Tab 切换、对话框）。

---

## 挖掘任务

### 🔴 必答（ch20 正文必须覆盖）

**任务 1：两阶段权限检查架构**

文件：`src/utils/permissions/permissions.ts`（`hasPermissionsToUseTool`、`hasPermissionsToUseToolInner`）

**任务 2：denial tracking 状态机**

文件：`src/utils/permissions/denialTracking.ts`

**任务 3：bypass/auto mode killswitch**

文件：`src/utils/permissions/bypassPermissionsKillswitch.ts`

**任务 4：auto mode 的危险权限 strip/restore 生命周期**

文件：`src/utils/permissions/permissionSetup.ts`（`stripDangerousPermissionsForAutoMode`、`restoreDangerousPermissions`、`transitionPermissionMode`）

**任务 5：auto mode gate 的多层开关**

文件：`src/utils/permissions/permissionSetup.ts`（`verifyAutoModeGateAccess`、`isAutoModeGateEnabled`）

---

## startheart 填写区

### Q1：两阶段权限检查架构

**结论**：权限检查分两阶段。第一阶段是**硬边界**（`hasPermissionsToUseToolInner`）：检查工具是否在 deny 列表、是否在允许的工作目录内、是否有 always-allow 规则命中——这些检查与 mode 无关，任何 mode 下都生效。第二阶段是 **mode 级策略**：根据当前 mode（default/acceptEdits/plan/auto/bypassPermissions）决定是否需要用户确认。

**verified** — 源码锚点：`src/utils/permissions/permissions.ts`

两阶段的关键设计：
- 硬边界先于 mode 检查，保证 deny 规则不可被 bypassPermissions 绕过
- `bypassPermissions` mode 跳过第二阶段（不弹确认框），但第一阶段的 deny 规则仍然生效
- `auto` mode 在第二阶段调用 YOLO 分类器（`yoloClassifier.ts`）而不是弹框

```
用户请求工具调用
      ↓
[第一阶段：硬边界]
  ├─ deny 列表命中？→ 拒绝（任何 mode 都无法绕过）
  ├─ 工作目录越界？→ 拒绝
  └─ always-allow 命中？→ 直接放行（跳过第二阶段）
      ↓
[第二阶段：mode 策略]
  ├─ bypassPermissions → 直接放行
  ├─ auto → 调用 YOLO 分类器
  ├─ acceptEdits → 文件写操作需确认，其他放行
  ├─ plan → 所有写操作拒绝（只读模式）
  └─ default → 弹确认框
```

---

### Q2：denial tracking 状态机

**结论**：`denialTracking.ts` 是一个纯函数状态机，追踪 YOLO 分类器的拒绝次数。当连续拒绝达到 3 次（`maxConsecutive`）或累计拒绝达到 20 次（`maxTotal`），`shouldFallbackToPrompting` 返回 true，系统从 auto 模式降级为弹确认框。成功执行一次工具后，`consecutiveDenials` 清零（但 `totalDenials` 不清零）。

**verified** — 源码锚点：`src/utils/permissions/denialTracking.ts` L1-L45

```typescript
// denialTracking.ts L12-L15
export const DENIAL_LIMITS = {
  maxConsecutive: 3,
  maxTotal: 20,
} as const

// L40-L45：触发降级的条件
export function shouldFallbackToPrompting(state: DenialTrackingState): boolean {
  return (
    state.consecutiveDenials >= DENIAL_LIMITS.maxConsecutive ||
    state.totalDenials >= DENIAL_LIMITS.maxTotal
  )
}
```

状态转换规则：
- `recordDenial`：`consecutiveDenials + 1`，`totalDenials + 1`
- `recordSuccess`：`consecutiveDenials → 0`（totalDenials 不变）
- 初始状态：`{ consecutiveDenials: 0, totalDenials: 0 }`

设计意图（inference）：
- `maxConsecutive = 3`：防止分类器陷入"反复拒绝同一类操作"的死循环，3 次连续拒绝说明分类器可能误判，应该让用户介入
- `maxTotal = 20`：整个会话的安全阀，防止分类器被大量低风险操作淹没后失去判断力
- `totalDenials` 不随成功清零：累计拒绝是会话级别的风险信号，不应被单次成功重置

---

### Q3：bypass/auto mode killswitch

**结论**：`bypassPermissionsKillswitch.ts` 实现了两个独立的 killswitch：bypass 权限 killswitch 和 auto mode gate。两者都使用**模块级单次运行标志**（`bypassPermissionsCheckRan`、`autoModeCheckRan`）保证每次会话只检查一次。关键设计：auto mode 的状态更新使用**函数式更新**（`setAppState(prev => updateContext(prev.toolPermissionContext))`）防止异步竞态。

**verified** — 源码锚点：`src/utils/permissions/bypassPermissionsKillswitch.ts` L17-L161

```typescript
// L17：模块级单次运行标志
let bypassPermissionsCheckRan = false

// L41-L48：函数式更新防竞态（关键设计）
setAppState(prev => {
  return {
    ...prev,
    toolPermissionContext: createDisabledBypassPermissionsContext(
      prev.toolPermissionContext,  // 使用 prev（最新状态），不是闭包捕获的旧快照
    ),
  }
})
```

bypass killswitch 流程：
1. 组件挂载时触发（`useKickOffCheckAndDisableBypassPermissionsIfNeeded`）
2. 检查 `isBypassPermissionsModeAvailable`，不可用则直接返回
3. 调用 `shouldDisableBypassPermissions()`（异步，查询 Statsig gate）
4. 如果需要禁用：`setAppState(prev => createDisabledBypassPermissionsContext(prev.toolPermissionContext))`

auto mode gate 流程（更复杂）：
1. 组件挂载 + 模型切换 + fastMode 切换时触发（`useKickOffCheckAndDisableAutoModeIfNeeded`）
2. 调用 `verifyAutoModeGateAccess()`（异步，查询 GrowthBook）
3. 返回 `updateContext` 函数（不是预计算的 context）
4. `setAppState(prev => updateContext(prev.toolPermissionContext))` 作用到最新状态

为什么 auto mode 返回函数而不是直接返回新 context（注释原文）：
> "Pre-computing the context here captured a stale snapshot: the async GrowthBook await below can be outrun by a mid-turn shift-tab, and returning `{ ...currentContext, ... }` would overwrite the user's mode change."

`/login` 后重置：`resetBypassPermissionsCheck()` 和 `resetAutoModeGateCheck()` 把标志清零，让新 org 的策略重新生效。

---

### Q4：auto mode 的危险权限 strip/restore 生命周期

**结论**：进入 auto mode 时，系统自动剥离可绕过分类器的 allow 规则（`stripDangerousPermissionsForAutoMode`），把被剥离的规则暂存到 `strippedDangerousRules`。退出 auto mode 时，从暂存区恢复（`restoreDangerousPermissions`）。这是"运行期收紧、退出后回归"的治理策略，不永久修改用户配置。

**verified** — 源码锚点：`src/utils/permissions/permissionSetup.ts` L514-L585

危险规则的判定标准（`isDangerousClassifierPermission`）：
- `Bash(*)` / `Bash` / `Bash(python:*)` / `Bash(node *)` 等——允许任意代码执行的 Bash 规则
- `PowerShell(iex:*)` / `PowerShell(Start-Process:*)` 等——PowerShell 代码执行规则
- 任何 `Agent` allow 规则——绕过子 agent 的分类器评估

```typescript
// permissionSetup.ts L514-L557：strip 流程
export function stripDangerousPermissionsForAutoMode(
  context: ToolPermissionContext,
): ToolPermissionContext {
  // 1. 从 alwaysAllowRules 收集所有规则
  // 2. 找出危险规则（findDangerousClassifierPermissions）
  // 3. 从 context 中移除危险规则（removeDangerousPermissions）
  // 4. 把被移除的规则存入 strippedDangerousRules（暂存区）
  return {
    ...removeDangerousPermissions(context, dangerousPermissions),
    strippedDangerousRules: stripped,
  }
}
```

`transitionPermissionMode` 是所有模式切换的统一编排点（L606-L655）：
- 进入 auto：`stripDangerousPermissionsForAutoMode` + `setAutoModeActive(true)`
- 离开 auto：`restoreDangerousPermissions` + `setAutoModeActive(false)` + `setNeedsAutoModeExitAttachment(true)`
- plan 模式有特殊处理：如果用户已 opt-in auto，plan 期间也保持 auto 语义（分类器继续运行）

---

### Q5：auto mode gate 的多层开关

**结论**：auto mode 能否进入由三层开关串联控制，任意一层关闭都会阻止进入。同步检查（`isAutoModeGateEnabled`）用于 UI 渲染，异步检查（`verifyAutoModeGateAccess`）是权威来源，会在 GrowthBook 初始化后修正同步检查的缓存值。

**verified** — 源码锚点：`src/utils/permissions/permissionSetup.ts` L1044-L1374

三层开关（串联，全部为 true 才能进入）：

| 层级 | 检查项 | 来源 | 说明 |
|------|--------|------|------|
| 1 | `enabledState !== 'disabled'` | GrowthBook `tengu_auto_mode_config.enabled` | 远端熔断器，可设为 `enabled`/`disabled`/`opt-in` |
| 2 | `!isAutoModeDisabledBySettings()` | 本地 settings | `disableAutoMode: 'disable'` 或 `permissions.disableAutoMode: 'disable'` |
| 3 | `modelSupportsAutoMode(mainModel)` | 模型能力检查 | 不是所有模型都支持 auto mode |

额外的 fast mode 熔断器（`disableFastModeBreakerFires`）：
- `tengu_auto_mode_config.disableFastMode` 为 true 时，fast mode 下禁止进入 auto
- 检查 `AppState.fastMode` 和模型名是否包含 `-fast`（ant 内部 fast 模型）

`AutoModeEnabledState` 的三个值：
- `'enabled'`：auto mode 在 Shift+Tab 轮转中可见（无需 opt-in）
- `'disabled'`：完全不可用（熔断器，用于事故响应）
- `'opt-in'`：只有显式 opt-in 的用户才能使用（`--enable-auto-mode` 或 settings 开关）

默认值是 `'disabled'`（`AUTO_MODE_ENABLED_DEFAULT`），即未配置时 auto mode 不可用。

同步 vs 异步检查的差异：
- `isAutoModeGateEnabled()`（同步）：使用缓存的 GrowthBook 值，可能过时，用于 UI 渲染
- `verifyAutoModeGateAccess()`（异步）：等待 GrowthBook 初始化完成，是权威来源
- 启动时先用同步检查决定是否显示 opt-in 对话框，异步检查完成后修正

---

### 意外发现

**`isDangerousBashPermission` 的 ant-only 扩展列表**（`dangerousPatterns.ts` L58-L79）：
内部用户（`USER_TYPE === 'ant'`）有额外的危险模式列表，包括 `gh`、`curl`、`wget`、`git`、`kubectl`、`aws`、`gcloud` 等。注释说明这是基于"ant sandbox dotfile data"的经验性风险判断，不是普遍的"这个工具不安全"结论。外部用户不受这些额外限制。

**`Tmux` 工具的特殊处理**（`permissionSetup.ts` L276-L279）：
```typescript
if (process.env.USER_TYPE === 'ant') {
  if (toolName === 'Tmux') return true  // 危险
}
```
Tmux 的 send-keys 可以执行任意 shell 命令，绕过分类器，效果等同于 `Bash(*)`。这个检查只对 ant 内部用户生效，因为外部用户没有 Tmux 工具。

**`verifyAutoModeGateAccess` 返回 transform 函数而非 context 的设计**（`permissionSetup.ts` L1044-L1052）：
这是一个精妙的并发安全设计。注释明确说明：如果直接返回预计算的 context，异步 GrowthBook 等待期间用户的 Shift+Tab 操作会被覆盖。返回 transform 函数，让调用方在 `setAppState(prev => ...)` 里应用，保证作用在最新状态上。

**`strippedDangerousRules` 的暂存区设计**（`permissionSetup.ts` L546-L556）：
被剥离的危险规则不是丢弃，而是存入 `context.strippedDangerousRules`（按 source 分组）。退出 auto mode 时通过 `restoreDangerousPermissions` 精确回放，避免永久修改用户配置。这是"运行期收紧"而非"永久删除"的关键实现。

**`checkAndDisableBypassPermissions` 的两个版本**：
- `permissionSetup.ts` 里的版本（L1420-L1440）：调用 `gracefulShutdown(1, 'bypass_permissions_disabled')`，直接退出进程
- `bypassPermissionsKillswitch.ts` 里的版本：更新 AppState，降级为 default mode，不退出进程
两个版本用于不同场景，前者用于 SDK/headless 路径，后者用于 UI 路径。

---

## 写作注意事项

1. **两阶段架构要用图示**：deny 规则 → always-allow → mode 策略，三层漏斗，配合代码片段
2. **denial tracking 要说清楚"为什么两个计数器"**：`consecutiveDenials` 防死循环，`totalDenials` 防会话级滥用，语义不同
3. **killswitch 的函数式更新要重点解释**：这是防止异步竞态的关键，值得用时序图说明
4. **strip/restore 生命周期要强调"不永久修改"**：用户配置的 `Bash(python:*)` 在 auto 期间被暂存，退出后恢复，不是被删除
5. **auto mode gate 的三层开关要列表**：远端熔断 + 本地设置 + 模型能力，任意一层关闭都阻止进入
6. **ant-only 扩展要提及但不展开**：说明存在内外部差异，不要把 ant-only 的危险模式列表当成普遍规则
