// cli/exit.ts — CLI 退出辅助函数
// 职责：统一封装 CLI 子命令的退出逻辑，消除各 handler 中重复的
// "打印消息 + 调用 process.exit" 模式（原来约 60 处拷贝）。
//
// 设计要点：
//   - cliError：向 stderr 输出错误信息，以 exit code 1 退出
//   - cliOk：向 stdout 输出成功信息，以 exit code 0 退出
//   - 返回类型 `never` 让 TypeScript 在调用点做控制流收窄，
//     调用方可写 `return cliError(...)` 而无需额外的 return 语句
//   - 测试中 process.exit 被 spy 拦截（不真正退出），
//     因此函数末尾有 `return undefined as never` 保证类型安全

/**
 * CLI exit helpers for subcommand handlers.
 *
 * Consolidates the 4-5 line "print + lint-suppress + exit" block that was
 * copy-pasted ~60 times across `claude mcp *` / `claude plugin *` handlers.
 * The `: never` return type lets TypeScript narrow control flow at call sites
 * without a trailing `return`.
 */
/* eslint-disable custom-rules/no-process-exit -- centralized CLI exit point */

// `return undefined as never` (not a post-exit throw) — tests spy on
// process.exit and let it return. Call sites write `return cliError(...)`
// where subsequent code would dereference narrowed-away values under mock.
// cliError uses console.error (tests spy on console.error); cliOk uses
// process.stdout.write (tests spy on process.stdout.write — Bun's console.log
// doesn't route through a spied process.stdout.write).

/** Write an error message to stderr (if given) and exit with code 1. */
export function cliError(msg?: string): never {
  // biome-ignore lint/suspicious/noConsole: centralized CLI error output
  if (msg) console.error(msg)
  process.exit(1)
  return undefined as never
}

/** Write a message to stdout (if given) and exit with code 0. */
export function cliOk(msg?: string): never {
  if (msg) process.stdout.write(msg + '\n')
  process.exit(0)
  return undefined as never
}
