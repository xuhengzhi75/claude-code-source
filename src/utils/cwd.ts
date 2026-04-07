// =============================================================================
// src/utils/cwd.ts — 当前工作目录（CWD）管理
//
// 【模块职责】
//   提供 CWD 的读取和异步上下文覆盖能力，支持多个并发子 Agent
//   各自维护独立的工作目录而不互相干扰。
//
// 【核心机制】
//   AsyncLocalStorage<string>：Node.js 异步上下文存储，
//   每个异步调用链可以有独立的 CWD 覆盖值。
//
// 【关键函数】
//   getCwd()                    — 获取当前 CWD（优先返回异步上下文覆盖值）
//   pwd()                       — getCwd() 的别名（兼容 shell 习惯）
//   runWithCwdOverride(cwd, fn) — 在指定 CWD 上下文中运行函数
//                                 子 Agent 通过此函数隔离各自的工作目录
// =============================================================================

import { AsyncLocalStorage } from 'async_hooks'
import { getCwdState, getOriginalCwd } from '../bootstrap/state.js'

const cwdOverrideStorage = new AsyncLocalStorage<string>()

/**
 * Run a function with an overridden working directory for the current async context.
 * All calls to pwd()/getCwd() within the function (and its async descendants) will
 * return the overridden cwd instead of the global one. This enables concurrent
 * agents to each see their own working directory without affecting each other.
 */
export function runWithCwdOverride<T>(cwd: string, fn: () => T): T {
  return cwdOverrideStorage.run(cwd, fn)
}

/**
 * Get the current working directory
 */
export function pwd(): string {
  return cwdOverrideStorage.getStore() ?? getCwdState()
}

/**
 * Get the current working directory or the original working directory if the current one is not available
 */
export function getCwd(): string {
  try {
    return pwd()
  } catch {
    return getOriginalCwd()
  }
}
