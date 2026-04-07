// utils/agentContext.ts — Agent 上下文追踪（AsyncLocalStorage）
// 职责：通过 AsyncLocalStorage 在异步操作链中追踪 Agent 身份，
// 用于分析归因（analytics attribution），无需参数透传。
//
// 支持两种 Agent 类型：
//   1. Subagent（Agent 工具）：进程内 fork，执行快速委托任务
//      上下文：SubagentContext { agentType: 'subagent', agentId, parentSessionId }
//   2. In-process Teammate：swarm 中的协作 Agent，有团队协调
//      上下文：TeammateAgentContext { agentType: 'teammate', agentId, ... }
//
// 跨进程 Teammate（tmux/iTerm2）：
//   使用环境变量代替：CLAUDE_CODE_AGENT_ID、CLAUDE_CODE_PARENT_SESSION_ID
//
// 为什么用 AsyncLocalStorage 而不是 AppState：
//   当 Agent 被后台化（ctrl+b）时，多个 Agent 可在同一进程中并发运行。
//   AppState 是单一共享状态，会被覆盖，导致 Agent A 的事件错误使用 Agent B 的上下文。
//   AsyncLocalStorage 隔离每个异步执行链，并发 Agent 各自维护独立上下文。
/**
 * Agent context for analytics attribution using AsyncLocalStorage.
 *
 * This module provides a way to track agent identity across async operations
 * without parameter drilling. Supports two agent types:
 *
 * 1. Subagents (Agent tool): Run in-process for quick, delegated tasks.
 *    Context: SubagentContext with agentType: 'subagent'
 *
 * 2. In-process teammates: Part of a swarm with team coordination.
 *    Context: TeammateAgentContext with agentType: 'teammate'
 *
 * For swarm teammates in separate processes (tmux/iTerm2), use environment
 * variables instead: CLAUDE_CODE_AGENT_ID, CLAUDE_CODE_PARENT_SESSION_ID
 *
 * WHY AsyncLocalStorage (not AppState):
 * When agents are backgrounded (ctrl+b), multiple agents can run concurrently
 * in the same process. AppState is a single shared state that would be
 * overwritten, causing Agent A's events to incorrectly use Agent B's context.
 * AsyncLocalStorage isolates each async execution chain, so concurrent agents
 * don't interfere with each other.
 */

import { AsyncLocalStorage } from 'async_hooks'
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../services/analytics/index.js'
import { isAgentSwarmsEnabled } from './agentSwarmsEnabled.js'

/**
 * Context for subagents (Agent tool agents).
 * Subagents run in-process for quick, delegated tasks.
 */
export type SubagentContext = {
  /** The subagent's UUID (from createAgentId()) */
  agentId: string
  /** The team lead's session ID (from CLAUDE_CODE_PARENT_SESSION_ID env var), undefined for main REPL subagents */
  parentSessionId?: string
  /** Agent type - 'subagent' for Agent tool agents */
  agentType: 'subagent'
  /** The subagent's type name (e.g., "Explore", "Bash", "code-reviewer") */
  subagentName?: string
  /** Whether this is a built-in agent (vs user-defined custom agent) */
  isBuiltIn?: boolean
  /** The request_id in the invoking agent that spawned or resumed this agent.
   *  For nested subagents this is the immediate invoker, not the root —
   *  session_id already bundles the whole tree. Updated on each resume. */
  invokingRequestId?: string
  /** Whether this invocation is the initial spawn or a subsequent resume
   *  via SendMessage. Undefined when invokingRequestId is absent. */
  invocationKind?: 'spawn' | 'resume'
  /** Mutable flag: has this invocation's edge been emitted to telemetry yet?
   *  Reset to false on each spawn/resume; flipped true by
   *  consumeInvokingRequestId() on the first terminal API event. */
  invocationEmitted?: boolean
}

/**
 * Context for in-process teammates.
 * Teammates are part of a swarm and have team coordination.
 */
export type TeammateAgentContext = {
  /** Full agent ID, e.g., "researcher@my-team" */
  agentId: string
  /** Display name, e.g., "researcher" */
  agentName: string
  /** Team name this teammate belongs to */
  teamName: string
  /** UI color assigned to this teammate */
  agentColor?: string
  /** Whether teammate must enter plan mode before implementing */
  planModeRequired: boolean
  /** The team lead's session ID for transcript correlation */
  parentSessionId: string
  /** Whether this agent is the team lead */
  isTeamLead: boolean
  /** Agent type - 'teammate' for swarm teammates */
  agentType: 'teammate'
  /** The request_id in the invoking agent that spawned or resumed this
   *  teammate. Undefined for teammates started outside a tool call
   *  (e.g. session start). Updated on each resume. */
  invokingRequestId?: string
  /** See SubagentContext.invocationKind. */
  invocationKind?: 'spawn' | 'resume'
  /** Mutable flag: see SubagentContext.invocationEmitted. */
  invocationEmitted?: boolean
}

/**
 * Discriminated union for agent context.
 * Use agentType to distinguish between subagent and teammate contexts.
 */
export type AgentContext = SubagentContext | TeammateAgentContext

const agentContextStorage = new AsyncLocalStorage<AgentContext>()

/**
 * Get the current agent context, if any.
 * Returns undefined if not running within an agent context (subagent or teammate).
 * Use type guards isSubagentContext() or isTeammateAgentContext() to narrow the type.
 */
export function getAgentContext(): AgentContext | undefined {
  return agentContextStorage.getStore()
}

/**
 * Run an async function with the given agent context.
 * All async operations within the function will have access to this context.
 */
export function runWithAgentContext<T>(context: AgentContext, fn: () => T): T {
  return agentContextStorage.run(context, fn)
}

/**
 * Type guard to check if context is a SubagentContext.
 */
export function isSubagentContext(
  context: AgentContext | undefined,
): context is SubagentContext {
  return context?.agentType === 'subagent'
}

/**
 * Type guard to check if context is a TeammateAgentContext.
 */
export function isTeammateAgentContext(
  context: AgentContext | undefined,
): context is TeammateAgentContext {
  if (isAgentSwarmsEnabled()) {
    return context?.agentType === 'teammate'
  }
  return false
}

/**
 * Get the subagent name suitable for analytics logging.
 * Returns the agent type name for built-in agents, "user-defined" for custom agents,
 * or undefined if not running within a subagent context.
 *
 * Safe for analytics metadata: built-in agent names are code constants,
 * and custom agents are always mapped to the literal "user-defined".
 */
export function getSubagentLogName():
  | AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  | undefined {
  const context = getAgentContext()
  if (!isSubagentContext(context) || !context.subagentName) {
    return undefined
  }
  return (
    context.isBuiltIn ? context.subagentName : 'user-defined'
  ) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

/**
 * Get the invoking request_id for the current agent context — once per
 * invocation. Returns the id on the first call after a spawn/resume, then
 * undefined until the next boundary. Also undefined on the main thread or
 * when the spawn path had no request_id.
 *
 * Sparse edge semantics: invokingRequestId appears on exactly one
 * tengu_api_success/error per invocation, so a non-NULL value downstream
 * marks a spawn/resume boundary.
 */
export function consumeInvokingRequestId():
  | {
      invokingRequestId: string
      invocationKind: 'spawn' | 'resume' | undefined
    }
  | undefined {
  const context = getAgentContext()
  if (!context?.invokingRequestId || context.invocationEmitted) {
    return undefined
  }
  context.invocationEmitted = true
  return {
    invokingRequestId: context.invokingRequestId,
    invocationKind: context.invocationKind,
  }
}
