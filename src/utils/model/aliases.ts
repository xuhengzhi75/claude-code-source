// utils/model/aliases.ts — 模型别名定义
// 职责：定义用户可以使用的模型别名（如 'sonnet'/'opus'/'haiku'），
// 以及别名在 availableModels 白名单中的通配符语义。
//
// 核心常量：
//   - MODEL_ALIASES：所有支持的别名列表（用于 /model 命令和 --model 参数）
//   - MODEL_FAMILY_ALIASES：家族别名（'sonnet'/'opus'/'haiku'），
//     在 availableModels 白名单中作为通配符匹配同家族所有版本
//
// 别名语义：
//   - 'sonnet'：解析为当前默认 Sonnet 模型
//   - 'opus'：解析为当前默认 Opus 模型
//   - 'haiku'：解析为当前默认 Haiku 模型
//   - 'best'：解析为当前最强模型（通常是 Opus）
//   - 'sonnet[1m]'/'opus[1m]'：1M context 版本
//   - 'opusplan'：Plan Mode 专用 Opus 配置
//
// 白名单通配符：
//   - "opus" 在 availableModels 中 → 允许所有 opus 版本（4.5/4.6 等）
//   - 具体 ID 在 availableModels 中 → 只允许该精确版本
export const MODEL_ALIASES = [
  'sonnet',
  'opus',
  'haiku',
  'best',
  'sonnet[1m]',
  'opus[1m]',
  'opusplan',
] as const
export type ModelAlias = (typeof MODEL_ALIASES)[number]

export function isModelAlias(modelInput: string): modelInput is ModelAlias {
  return MODEL_ALIASES.includes(modelInput as ModelAlias)
}

/**
 * Bare model family aliases that act as wildcards in the availableModels allowlist.
 * When "opus" is in the allowlist, ANY opus model is allowed (opus 4.5, 4.6, etc.).
 * When a specific model ID is in the allowlist, only that exact version is allowed.
 */
export const MODEL_FAMILY_ALIASES = ['sonnet', 'opus', 'haiku'] as const

export function isModelFamilyAlias(model: string): boolean {
  return (MODEL_FAMILY_ALIASES as readonly string[]).includes(model)
}
