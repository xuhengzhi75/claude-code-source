// =============================================================================
// src/query/config.ts — query() 调用的不可变配置快照
//
// 【模块职责】
//   在 query() 入口处一次性快照所有运行时配置，生成 QueryConfig 对象。
//   将配置与每轮迭代状态（State）和可变上下文（ToolUseContext）分离，
//   使未来提取纯 step(state, event, config) reducer 成为可能。
//
// 【设计约束】
//   - 不包含 feature() 门控：feature() 是 tree-shaking 边界，
//     必须内联在被保护的代码块中才能实现死代码消除
//   - 只包含 env/statsig 运行时门控（CACHED_MAY_BE_STALE 已允许过期）
//
// 【QueryConfig 字段】
//   sessionId              — 当前会话 ID
//   gates.streamingToolExecution — 流式工具执行开关
//   gates.emitToolUseSummaries   — 工具使用摘要输出开关
//   gates.isAnt                  — Anthropic 内部用户标志
//   gates.fastModeEnabled        — 快速模式开关
// =============================================================================

import { getSessionId } from '../bootstrap/state.js'
import { checkStatsigFeatureGate_CACHED_MAY_BE_STALE } from '../services/analytics/growthbook.js'
import type { SessionId } from '../types/ids.js'
import { isEnvTruthy } from '../utils/envUtils.js'

// -- config

// Immutable values snapshotted once at query() entry. Separating these from
// the per-iteration State struct and the mutable ToolUseContext makes future
// step() extraction tractable — a pure reducer can take (state, event, config)
// where config is plain data.
//
// Intentionally excludes feature() gates — those are tree-shaking boundaries
// and must stay inline at the guarded blocks for dead-code elimination.
export type QueryConfig = {
  sessionId: SessionId

  // Runtime gates (env/statsig). NOT feature() gates — see above.
  gates: {
    // Statsig — CACHED_MAY_BE_STALE already admits staleness, so snapshotting
    // once per query() call stays within the existing contract.
    streamingToolExecution: boolean
    emitToolUseSummaries: boolean
    isAnt: boolean
    fastModeEnabled: boolean
  }
}

export function buildQueryConfig(): QueryConfig {
  return {
    sessionId: getSessionId(),
    gates: {
      streamingToolExecution: checkStatsigFeatureGate_CACHED_MAY_BE_STALE(
        'tengu_streaming_tool_execution2',
      ),
      emitToolUseSummaries: isEnvTruthy(
        process.env.CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES,
      ),
      isAnt: process.env.USER_TYPE === 'ant',
      // Inlined from fastMode.ts to avoid pulling its heavy module graph
      // (axios, settings, auth, model, oauth, config) into test shards that
      // didn't previously load it — changes init order and breaks unrelated tests.
      fastModeEnabled: !isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_FAST_MODE),
    },
  }
}
