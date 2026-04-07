# Claude Code 源码中文注解路线图

> 目标：为 Claude Code 核心源码逐模块写入系统性中文注解，
> 帮助中文读者快速理解架构设计与实现细节。

---

## 进度总览

| 轮次 | 模块范围 | 状态 |
|------|---------|------|
| 第1轮 | `src/utils/` 基础工具（http/log/platform/env/uuid/sleep/format/hash） | ✅ 完成 |
| 第2轮 | `src/utils/` 状态管理（sessionState/agentContext/context/contentArray） | ✅ 完成 |
| 第3轮 | `src/utils/` 会话恢复（attachments/sessionRestore/gracefulShutdown/conversationRecovery/cleanupRegistry/abortController/signal/generators） | ✅ 完成 |
| 第4轮 | `src/services/oauth/`（client/index/crypto） | ✅ 完成 |
| 第5轮 | `src/services/`（tools/toolHooks/diagnosticTracking/internalLogging） | ✅ 完成 |
| 第6轮 | `src/tools/BashTool/`（bashPermissions/commandSemantics/modeValidation/sedValidation/shouldUseSandbox） | ✅ 完成 |
| 第7轮 | `src/tools/AgentTool/`（builtInAgents） | ✅ 完成 |
| 第8轮 | `src/tools/AgentTool/`（forkSubagent/agentToolUtils/loadAgentsDir/prompt） | ✅ 完成 |
| 第9轮 | `src/tools/AgentTool/`（agentColorManager/agentDisplay/agentMemorySnapshot/resumeAgent/constants） | ✅ 完成 |
| 第10轮 | `src/tools/AgentTool/built-in/`（generalPurposeAgent/planAgent/exploreAgent/verificationAgent/claudeCodeGuideAgent/statuslineSetup） | ✅ 完成 |
| 第11轮 | `src/tools/BashTool/` 剩余文件（bashCommandHelpers/commentLabel/destructiveCommandWarning/pathValidation/readOnlyValidation/sedEditParser/toolName/utils/prompt） | ✅ 完成 |
| 第12轮 | `src/tools/FileEditTool/`（utils/types/prompt/constants）+ `FileReadTool/`（imageProcessor/limits/prompt）+ `FileWriteTool/prompt` + `GlobTool/prompt` + `GrepTool/prompt` + `WebFetchTool/`（preapproved/utils/prompt）+ `WebSearchTool/prompt` + `shared/`（gitOperationTracking/spawnMultiAgent） | ✅ 完成 |
| 第13轮 | `src/tools/` 其余工具目录 | 🔜 待开始 |

---

## 已完成模块详情

### src/utils/（基础工具层）
- `http.ts` — HTTP 请求封装，含重试/超时/流式响应
- `log.ts` — 结构化日志系统（debug/info/warn/error）
- `platform.ts` — 平台检测（macOS/Linux/Windows/WSL）
- `env.ts` — 环境变量读取与验证
- `uuid.ts` — UUID 生成工具
- `sleep.ts` — 异步延迟工具
- `format.ts` — 文本格式化（截断/对齐/高亮）
- `hash.ts` — 哈希计算（MD5/SHA256）
- `sessionState.ts` — 会话状态全局存储
- `agentContext.ts` — Agent 上下文（AsyncLocalStorage）
- `context.ts` — 请求上下文传递
- `contentArray.ts` — 消息内容数组操作
- `attachments.ts` — 文件附件处理
- `sessionRestore.ts` — 会话恢复逻辑
- `gracefulShutdown.ts` — 优雅关闭处理
- `conversationRecovery.ts` — 对话恢复机制
- `cleanupRegistry.ts` — 资源清理注册表
- `abortController.ts` — 中止控制器管理
- `signal.ts` — 信号处理（SIGINT/SIGTERM）
- `generators.ts` — 异步生成器工具

### src/services/oauth/（OAuth 认证层）
- `client.ts` — OAuth 客户端实现
- `index.ts` — OAuth 服务入口
- `crypto.ts` — PKCE 加密工具（code_verifier/code_challenge）

### src/services/（服务层）
- `tools/toolHooks.ts` — 工具调用钩子（before/after/error）
- `diagnosticTracking.ts` — 诊断追踪（错误上报/性能监控）
- `internalLogging.ts` — 内部日志（结构化事件记录）

### src/tools/BashTool/（Bash 工具层）
- `bashPermissions.ts` — Bash 命令权限检查
- `commandSemantics.ts` — 命令语义分析（危险命令识别）
- `modeValidation.ts` — 执行模式验证（sandbox/normal）
- `sedValidation.ts` — sed 命令安全验证
- `shouldUseSandbox.ts` — 沙箱使用决策
- `bashCommandHelpers.ts` — Bash 命令辅助工具
- `bashSecurity.ts` — Bash 命令安全分析引擎（已有注解）
- `commentLabel.ts` — Bash 命令注释标签提取
- `destructiveCommandWarning.ts` — 破坏性命令警告
- `pathValidation.ts` — Bash 命令路径验证
- `readOnlyValidation.ts` — 只读命令验证
- `sedEditParser.ts` — sed 编辑命令解析器
- `toolName.ts` — BashTool 工具名常量
- `utils.ts` — BashTool 输出处理工具函数
- `prompt.ts` — BashTool 系统提示词生成器

### src/tools/AgentTool/（Agent 工具层）
- `builtInAgents.ts` — 内置 Agent 注册表
- `forkSubagent.ts` — Fork 子 Agent 功能
- `agentToolUtils.ts` — Agent 工具核心工具函数
- `loadAgentsDir.ts` — Agent 定义加载器
- `prompt.ts` — AgentTool 系统提示词生成器
- `agentColorManager.ts` — 子 Agent 颜色管理器
- `agentDisplay.ts` — Agent 信息展示工具函数
- `agentMemory.ts` — 子 Agent 持久化记忆管理（已有注解）
- `agentMemorySnapshot.ts` — Agent 记忆快照管理
- `resumeAgent.ts` — 子 Agent 恢复执行
- `runAgent.ts` — 子 Agent 执行核心（已有注解）
- `constants.ts` — AgentTool 常量定义
- `built-in/generalPurposeAgent.ts` — 通用目的内置 Agent
- `built-in/planAgent.ts` — Plan 内置 Agent
- `built-in/exploreAgent.ts` — Explore 内置 Agent
- `built-in/verificationAgent.ts` — Verification 内置 Agent
- `built-in/claudeCodeGuideAgent.ts` — Claude Code 指南 Agent
- `built-in/statuslineSetup.ts` — 状态栏设置 Agent

### src/tools/FileEditTool/（文件编辑工具层）
- `FileEditTool.ts` — 文件精确编辑工具（已有注解）
- `utils.ts` — FileEditTool 核心编辑工具函数
- `types.ts` — FileEditTool 类型定义
- `prompt.ts` — FileEditTool 工具描述生成器
- `constants.ts` — FileEditTool 常量定义

### src/tools/FileReadTool/（文件读取工具层）
- `FileReadTool.ts` — 文件读取工具（已有注解）
- `imageProcessor.ts` — 图片处理器
- `limits.ts` — FileReadTool 输出限制配置
- `prompt.ts` — FileReadTool 工具描述与常量

### src/tools/FileWriteTool/（文件写入工具层）
- `FileWriteTool.ts` — 文件全量写入工具（已有注解）
- `prompt.ts` — FileWriteTool 工具描述与常量

### src/tools/GlobTool/（Glob 搜索工具层）
- `GlobTool.ts` — 文件路径 Glob 匹配工具（已有注解）
- `prompt.ts` — GlobTool 工具名称与描述

### src/tools/GrepTool/（Grep 搜索工具层）
- `GrepTool.ts` — 文件内容正则搜索工具（已有注解）
- `prompt.ts` — GrepTool 工具名称与描述

### src/tools/WebFetchTool/（网页抓取工具层）
- `WebFetchTool.ts` — 网页内容抓取工具（已有注解）
- `preapproved.ts` — WebFetch 预批准域名列表
- `utils.ts` — WebFetch 核心抓取工具函数
- `prompt.ts` — WebFetchTool 工具名称与描述

### src/tools/WebSearchTool/（网络搜索工具层）
- `WebSearchTool.ts` — 网络搜索工具（已有注解）
- `prompt.ts` — WebSearchTool 工具名称与描述

### src/tools/shared/（工具共享模块）
- `gitOperationTracking.ts` — Git 操作追踪（跨 Shell）
- `spawnMultiAgent.ts` — 多 Agent 生成共享模块

---

## 下一批目标（第13轮）

### src/tools/ 其余工具目录（优先级排序）
- `LSPTool/`（formatters/LSPTool/prompt/schemas/symbolContext）
- `MCPTool/`（classifyForCollapse/MCPTool/prompt）
- `NotebookEditTool/`（NotebookEditTool/prompt/constants）
- `SendMessageTool/`（SendMessageTool/prompt/constants）
- `SkillTool/`（SkillTool/prompt/constants）
- `TodoWriteTool/`（TodoWriteTool/prompt/constants）
- `TaskCreateTool/` + `TaskGetTool/` + `TaskListTool/` + `TaskUpdateTool/` + `TaskStopTool/`
- `BriefTool/`（BriefTool/prompt/upload/attachments）
- `ConfigTool/`（ConfigTool/prompt/supportedSettings）

---

## 注解规范

每个文件顶部（import 之前）插入注解块，格式：

```typescript
// path/to/file.ts — 模块标题
// 职责：一句话描述模块核心职责
//
// 核心功能/关键函数/关键类型：
//   - 条目1：说明
//   - 条目2：说明
//
// 关联：
//   - 依赖模块：关系说明
```
