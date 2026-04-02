# 权限与安全治理系统 — 架构分析交接卡

分析者：startheart
日期：2026-04-02
状态：verified（基于源码直接读取，非推断）

---

## 一句话结论

Claude Code 的权限系统是一条**两阶段流水线**：第一阶段是"硬边界"（规则/安全检查，任何 mode 都不能绕过），第二阶段是"mode 级策略"（bypassPermissions / auto / dontAsk / headless 各自的行为转换）。两阶段分离是核心设计意图，不是偶然结构。

---

## 本章最该讲的 5 个点

### 1. 六种 PermissionMode 及其语义

源码：`src/types/permissions.ts#L16-L36`、`src/utils/permissions/PermissionMode.ts`

```
default         → 遇到未授权操作就问用户
acceptEdits     → 文件编辑类操作自动允许，其他还是问
plan            → 只读模式，不执行写操作（可携带 bypass 标记）
bypassPermissions → 跳过大多数权限检查（仍受硬边界约束）
dontAsk         → 把所有 ask 转成 deny，不弹窗
auto            → ant-only，用 AI 分类器替代人工审批（TRANSCRIPT_CLASSIFIER feature flag）
```

关键细节：`auto` 模式只在 `feature('TRANSCRIPT_CLASSIFIER')` 为 true 时才出现在 `INTERNAL_PERMISSION_MODES` 里，外部用户看不到这个 mode。`bubble` 是内部传播用的 mode，不对外暴露。

### 2. 两阶段流水线：硬边界 vs mode 策略

源码：`src/utils/permissions/permissions.ts`

**第一阶段（`hasPermissionsToUseToolInner`，步骤 1a~1g）**：
- 1a：整个工具被 deny 规则命中 → 直接 deny
- 1b：整个工具被 ask 规则命中 → ask（沙箱自动允许例外）
- 1c：调用 `tool.checkPermissions()` 获取工具自身的权限判断
- 1d：工具自身返回 deny → 直接 deny
- 1e：工具要求用户交互（`requiresUserInteraction()`）→ 直接 ask，不可绕过
- 1f：内容级 ask 规则（如 `Bash(npm publish:*)`）→ ask，bypass 也不能绕过
- 1g：安全检查（`.git/`、`.claude/`、shell 配置文件等敏感路径）→ ask，bypass 也不能绕过

**第二阶段（`hasPermissionsToUseTool` 外层，步骤 2a~3）**：
- 2a：bypassPermissions mode → 允许（前提：通过了第一阶段）
- 2b：工具在 alwaysAllow 规则里 → 允许
- 3：passthrough → 转成 ask，进入 mode 级转换（dontAsk/auto/headless）

**关键设计意图**（源码注释 `L1270-L1272`）：
```
// 2a. mode 级治理边界：仅在通过前置硬边界后，才允许 bypass 生效。
// 关键含义：bypassPermissions 不是"无条件放行"，前面的 deny/ask/safety 仍可拦截。
```

### 3. auto 模式的三条快速通道 + 分类器兜底

源码：`src/utils/permissions/permissions.ts#L597-L932`

auto 模式下，ask 决策按以下顺序处理（越早越便宜）：

1. **acceptEdits 快速通道**（`L597-L660`）：如果在 acceptEdits mode 下会被允许，直接放行，不调分类器。跳过 Agent 和 REPL（这两个工具的 checkPermissions 在 acceptEdits 下返回 allow，但实际上可能包含危险操作）。

2. **安全工具白名单**（`L662-L690`）：`isAutoModeAllowlistedTool()` 判断是否是已知安全工具，是则直接放行。

3. **YOLO 分类器**（`L692-L932`）：把工具调用格式化成 action，调用 `classifyYoloAction()`，用 AI 判断是否应该放行。分类器有两阶段（fast + thinking），结果带置信度和 stage 信息。

分类器失败处理：
- `transcriptTooLong`：上下文超限，确定性错误，headless 下直接 abort，交互模式下降级为手动审批
- `unavailable`（API 错误）：由 `tengu_iron_gate_closed` feature gate 控制 fail-closed（deny）还是 fail-open（降级为手动审批）

### 4. denial tracking：防止分类器循环拒绝

源码：`src/utils/permissions/denialTracking.ts`

```typescript
DENIAL_LIMITS = {
  maxConsecutive: 3,   // 连续拒绝 3 次 → 升级为人工审批
  maxTotal: 20,        // 累计拒绝 20 次 → 升级为人工审批
}
```

设计意图：防止 auto 模式下分类器反复拒绝同一类操作，导致 Agent 陷入死循环。触发上限后：
- 交互模式：降级为手动审批（ask），让用户介入
- headless 模式：直接 abort，抛出 `AbortError`

任何一次成功的工具调用（包括被 allow 规则直接放行的）都会重置 `consecutiveDenials`，但不重置 `totalDenials`。

### 5. 两个组织级 killswitch

源码：`src/utils/permissions/bypassPermissionsKillswitch.ts`

**bypass killswitch**：
- 触发条件：Statsig gate `shouldDisableBypassPermissions()` 返回 true
- 效果：强制把 `isBypassPermissionsModeAvailable` 设为 false，用户无法进入 bypassPermissions mode
- 执行时机：第一次 query 前，只跑一次（`bypassPermissionsCheckRan` flag）
- 重置时机：`/login` 后重置，用新 org 重新检查

**auto mode killswitch**：
- 触发条件：`verifyAutoModeGateAccess()` 检查多个条件（GrowthBook gate + 模型能力 + fastMode breaker）
- 效果：把 mode 从 auto 降级，并推送 warning 通知
- 执行时机：启动时 + 每次模型切换 + fastMode 切换
- 关键实现细节：异步检查完成后，用 `setAppState(prev => updateContext(prev.toolPermissionContext))` 作用到**当前**状态，而不是检查时的快照，防止异步竞态覆盖用户的 mode 切换

---

## 不要重复讲的内容

- `cyberRiskInstruction.ts` 的所有权机制已在 ch19 讲过，不要重复
- 工具的 `checkPermissions` 接口已在 ch14 讲过，这里只讲权限系统如何调用它，不讲接口本身
- 沙箱（SandboxManager）是独立模块，这里只讲它与权限系统的接缝（`shouldUseSandbox`），不展开沙箱实现

---

## 哪些判断只能写成 inference

- `tengu_iron_gate_closed` 的默认值（`true`）意味着 Anthropic 倾向于 fail-closed，但这是当前代码的默认值，不代表生产环境的实际配置——**写成 inference**
- `DANGEROUS_BASH_PATTERNS` 里 ant-only 的部分（`fa run`、`coo`、`gh api` 等）说明 Anthropic 内部有特定的高风险工具，但具体是什么工具不应该在书里展开——**只提机制，不列清单**
- auto 模式的分类器具体 prompt 在 `yoloClassifier.ts` 里，没有完整读，分类器的判断逻辑不要拍板——**写成 inference**

---

## 关键源码锚点

| 位置 | 内容 |
|---|---|
| `src/types/permissions.ts#L16-L36` | 六种 PermissionMode 定义，含 feature flag 条件 |
| `src/utils/permissions/permissions.ts#L477` | `hasPermissionsToUseTool`：权限决策总入口 |
| `src/utils/permissions/permissions.ts#L1066-L1164` | `hasPermissionsToUseToolInner`：硬边界子流水线（步骤 1a~1g） |
| `src/utils/permissions/permissions.ts#L1270-L1290` | bypassPermissions 仅在通过硬边界后生效（注释说明设计意图） |
| `src/utils/permissions/permissions.ts#L597-L660` | auto 模式 acceptEdits 快速通道 |
| `src/utils/permissions/permissions.ts#L662-L690` | auto 模式安全工具白名单 |
| `src/utils/permissions/permissions.ts#L692-L932` | auto 模式 YOLO 分类器调用与结果处理 |
| `src/utils/permissions/denialTracking.ts` | denial tracking：连续/累计拒绝上限（3/20） |
| `src/utils/permissions/bypassPermissionsKillswitch.ts` | 两个组织级 killswitch（bypass + auto mode） |
| `src/utils/permissions/dangerousPatterns.ts` | 危险 Bash 前缀模式列表（含 ant-only 部分） |
| `src/utils/permissions/PermissionMode.ts` | 六种 mode 的 UI 配置（title/color/symbol） |

---

## 建议章节边界

**这章讲**：权限系统的整体架构（两阶段流水线）、六种 mode 的语义、auto 模式的三条快速通道 + 分类器、denial tracking 的防循环机制、两个组织级 killswitch。

**不要越到下一章**：沙箱实现细节、具体工具的 `checkPermissions` 实现、hooks 系统（`executePermissionRequestHooks` 只是被调用，不展开）。

---

## 写作注意事项

1. **两阶段分离是核心叙事**：第一阶段（硬边界）和第二阶段（mode 策略）的分离不是实现细节，是设计哲学——"bypassPermissions 不是无条件放行"这句话值得单独成段。

2. **auto 模式的三条快速通道要按顺序讲**：acceptEdits → 白名单 → 分类器，顺序即成本顺序，这是"先便宜后昂贵"原则的具体体现。

3. **denial tracking 的数字要写出来**：连续 3 次、累计 20 次，这两个数字是系统的"熔断阈值"，值得作为数字锚点。

4. **killswitch 的异步竞态处理值得单独提**：`setAppState(prev => updateContext(prev.toolPermissionContext))` 这个模式——用函数式更新而不是直接赋值——是防止异步竞态的标准做法，值得点出来。

5. **不要把 auto 模式写成"已发布功能"**：它在 `feature('TRANSCRIPT_CLASSIFIER')` flag 后面，是 ant-only 的实验性功能，写作时要保守。
