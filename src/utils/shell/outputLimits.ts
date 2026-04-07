// utils/shell/outputLimits.ts — Bash 输出长度限制
// 职责：定义和读取 Bash 工具输出的最大字符数限制，
// 防止超大输出占满 context window。
//
// 核心常量：
//   - BASH_MAX_OUTPUT_DEFAULT = 30_000：默认最大输出字符数
//   - BASH_MAX_OUTPUT_UPPER_LIMIT = 150_000：用户可配置的上限
//
// 配置方式：
//   - BASH_MAX_OUTPUT_LENGTH 环境变量：用户自定义限制
//   - validateBoundedIntEnvVar() 确保值在 [1, 150_000] 范围内
//
// 超出处理：
//   - BashTool 在输出超限时截断并附加 "... [truncated]" 提示
import { validateBoundedIntEnvVar } from '../envValidation.js'

export const BASH_MAX_OUTPUT_UPPER_LIMIT = 150_000
export const BASH_MAX_OUTPUT_DEFAULT = 30_000

export function getMaxOutputLength(): number {
  const result = validateBoundedIntEnvVar(
    'BASH_MAX_OUTPUT_LENGTH',
    process.env.BASH_MAX_OUTPUT_LENGTH,
    BASH_MAX_OUTPUT_DEFAULT,
    BASH_MAX_OUTPUT_UPPER_LIMIT,
  )
  return result.effective
}
