// utils/telemetry/logger.ts — OTel 诊断日志适配器
// 职责：将 OpenTelemetry SDK 内部的诊断日志（DiagLogger 接口）
// 桥接到 Claude Code 自身的日志系统（logError/logForDebugging）。
//
// 背景：OTel SDK 内部会产生诊断日志（如导出失败、配置错误等），
// 默认输出到 console。此适配器将这些日志统一路由到 Claude Code 的日志管道，
// 避免污染用户终端输出，同时保留可调试性。
//
// ClaudeCodeDiagLogger 实现：
//   - error()：调用 logError() + logForDebugging(level='error')
//   - warn()：调用 logError() + logForDebugging(level='warn')
//   - info()：静默（no-op，避免信息噪音）
//   - debug()：静默（no-op）
//   - verbose()：静默（no-op）
//
// 使用方式：在 instrumentation.ts 中通过 diag.setLogger(new ClaudeCodeDiagLogger()) 注册
import type { DiagLogger } from '@opentelemetry/api'
import { logForDebugging } from '../debug.js'
import { logError } from '../log.js'
export class ClaudeCodeDiagLogger implements DiagLogger {
  error(message: string, ..._: unknown[]) {
    logError(new Error(message))
    logForDebugging(`[3P telemetry] OTEL diag error: ${message}`, {
      level: 'error',
    })
  }
  warn(message: string, ..._: unknown[]) {
    logError(new Error(message))
    logForDebugging(`[3P telemetry] OTEL diag warn: ${message}`, {
      level: 'warn',
    })
  }
  info(_message: string, ..._args: unknown[]) {
    return
  }
  debug(_message: string, ..._args: unknown[]) {
    return
  }
  verbose(_message: string, ..._args: unknown[]) {
    return
  }
}
