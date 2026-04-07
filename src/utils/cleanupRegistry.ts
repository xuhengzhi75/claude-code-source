// utils/cleanupRegistry.ts — 全局清理函数注册表
// 职责：维护一个全局的清理函数注册表，供各模块注册需要在优雅退出时执行的清理逻辑。
// 此模块与 gracefulShutdown.ts 分离，以避免循环依赖。
//
// 核心函数：
//   - registerCleanup(fn)：注册清理函数，返回注销函数
//   - runAllCleanups()：执行所有已注册的清理函数（gracefulShutdown.ts 调用）
//
// 使用模式：
//   // 注册
//   const unregister = registerCleanup(async () => { await flushBuffer() })
//   // 注销（组件卸载时）
//   unregister()
//
// 关键设计：
//   - Set<fn>：去重，防止同一函数被注册多次
//   - 返回注销函数：支持组件级生命周期管理
//   - 与 gracefulShutdown.ts 分离：避免循环依赖（gracefulShutdown 依赖 cleanupRegistry，反之不然）
/**
 * Global registry for cleanup functions that should run during graceful shutdown.
 * This module is separate from gracefulShutdown.ts to avoid circular dependencies.
 */

// Global registry for cleanup functions
const cleanupFunctions = new Set<() => Promise<void>>()

/**
 * Register a cleanup function to run during graceful shutdown.
 * @param cleanupFn - Function to run during cleanup (can be sync or async)
 * @returns Unregister function that removes the cleanup handler
 */
export function registerCleanup(cleanupFn: () => Promise<void>): () => void {
  cleanupFunctions.add(cleanupFn)
  return () => cleanupFunctions.delete(cleanupFn) // Return unregister function
}

/**
 * Run all registered cleanup functions.
 * Used internally by gracefulShutdown.
 */
export async function runCleanupFunctions(): Promise<void> {
  await Promise.all(Array.from(cleanupFunctions).map(fn => fn()))
}
