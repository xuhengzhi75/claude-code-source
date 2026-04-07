// tools/AgentTool/constants.ts — AgentTool 常量定义
// 职责：集中定义 AgentTool 相关的常量，供整个 AgentTool 模块使用。
//
// 关键常量：
//   - AGENT_TOOL_NAME = 'Agent'：当前工具名称
//   - LEGACY_AGENT_TOOL_NAME = 'Task'：旧版工具名（向后兼容）
//     用于权限规则、hooks、已恢复会话的兼容处理
//   - VERIFICATION_AGENT_TYPE = 'verification'：验证 Agent 类型标识
//   - ONE_SHOT_BUILTIN_AGENT_TYPES：一次性内置 Agent 集合
//     包含 'Explore' 和 'Plan'，这类 Agent 执行一次后返回报告
//     父 Agent 不会通过 SendMessage 继续与其交互
//     省略 agentId/SendMessage/usage 尾部可节省约 135 字符 token
export const AGENT_TOOL_NAME = 'Agent'
// Legacy wire name for backward compat (permission rules, hooks, resumed sessions)
export const LEGACY_AGENT_TOOL_NAME = 'Task'
export const VERIFICATION_AGENT_TYPE = 'verification'

// Built-in agents that run once and return a report — the parent never
// SendMessages back to continue them. Skip the agentId/SendMessage/usage
// trailer for these to save tokens (~135 chars × 34M Explore runs/week).
export const ONE_SHOT_BUILTIN_AGENT_TYPES: ReadonlySet<string> = new Set([
  'Explore',
  'Plan',
])
