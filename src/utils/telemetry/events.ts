// utils/telemetry/events.ts — OpenTelemetry 事件日志
// 职责：通过 OpenTelemetry Logs API 记录结构化事件，
// 供第三方可观测性平台（Datadog/Grafana/Jaeger 等）消费。
//
// 核心函数：
//   - logOTelEvent()：记录单个 OTel 事件（含序列号、时间戳、会话属性）
//   - redactIfDisabled()：根据 OTEL_LOG_USER_PROMPTS 决定是否脱敏内容
//
// 事件结构：
//   - event.name：事件名称
//   - event.timestamp：ISO 8601 时间戳
//   - event.sequence：单调递增序列号（用于排序）
//   - prompt_id：当前 prompt 的唯一 ID（用于关联同一轮对话的事件）
//   - + getTelemetryAttributes()：会话级公共属性（版本/平台/模型等）
//
// 隐私保护：
//   - OTEL_LOG_USER_PROMPTS=1：允许记录用户提示词原文
//   - 默认：所有用户内容替换为 '<REDACTED>'
//
// 关键设计：
//   - eventSequence：模块级单调计数器，确保事件有序
//   - hasWarnedNoEventLogger：防止 "no event logger" 警告刷屏
//   - 测试环境（NODE_ENV=test）跳过日志记录
import type { Attributes } from '@opentelemetry/api'
import { getEventLogger, getPromptId } from 'src/bootstrap/state.js'
import { logForDebugging } from '../debug.js'
import { isEnvTruthy } from '../envUtils.js'
import { getTelemetryAttributes } from '../telemetryAttributes.js'

// Monotonically increasing counter for ordering events within a session
let eventSequence = 0

// Track whether we've already warned about a null event logger to avoid spamming
let hasWarnedNoEventLogger = false

function isUserPromptLoggingEnabled() {
  return isEnvTruthy(process.env.OTEL_LOG_USER_PROMPTS)
}

export function redactIfDisabled(content: string): string {
  return isUserPromptLoggingEnabled() ? content : '<REDACTED>'
}

export async function logOTelEvent(
  eventName: string,
  metadata: { [key: string]: string | undefined } = {},
): Promise<void> {
  const eventLogger = getEventLogger()
  if (!eventLogger) {
    if (!hasWarnedNoEventLogger) {
      hasWarnedNoEventLogger = true
      logForDebugging(
        `[3P telemetry] Event dropped (no event logger initialized): ${eventName}`,
        { level: 'warn' },
      )
    }
    return
  }

  // Skip logging in test environment
  if (process.env.NODE_ENV === 'test') {
    return
  }

  const attributes: Attributes = {
    ...getTelemetryAttributes(),
    'event.name': eventName,
    'event.timestamp': new Date().toISOString(),
    'event.sequence': eventSequence++,
  }

  // Add prompt ID to events (but not metrics, where it would cause unbounded cardinality)
  const promptId = getPromptId()
  if (promptId) {
    attributes['prompt.id'] = promptId
  }

  // Workspace directory from the desktop app (host path). Events only —
  // filesystem paths are too high-cardinality for metric dimensions, and
  // the BQ metrics pipeline must never see them.
  const workspaceDir = process.env.CLAUDE_CODE_WORKSPACE_HOST_PATHS
  if (workspaceDir) {
    attributes['workspace.host_paths'] = workspaceDir.split('|')
  }

  // Add metadata as attributes - all values are already strings
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined) {
      attributes[key] = value
    }
  }

  // Emit log record as an event
  eventLogger.emit({
    body: `claude_code.${eventName}`,
    attributes,
  })
}
