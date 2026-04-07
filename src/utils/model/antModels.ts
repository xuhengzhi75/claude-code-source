// utils/model/antModels.ts — ANT 内部模型配置（GrowthBook 动态下发）
// 职责：通过 GrowthBook feature flag 动态获取 ANT 内部专用模型列表，
// 支持在不发版的情况下向内部用户推送新模型。
//
// 核心类型：
//   - AntModel：ANT 内部模型描述（alias/model/label/contextWindow/defaultEffortLevel 等）
//   - AntModelOverrideConfig：完整的 ANT 模型覆盖配置（含默认模型、系统提示词后缀等）
//
// 核心函数：
//   - getAntModelOverrideConfig()：从 GrowthBook 获取 ANT 模型覆盖配置
//   - getAntModels()：获取 ANT 专用模型列表（非 ANT 用户返回空数组）
//
// 关键设计：
//   - 仅 USER_TYPE === 'ant' 时生效，外部用户始终返回 null/[]
//   - 通过 GrowthBook feature flag 'tengu_ant_model_override' 动态下发
//   - @[MODEL LAUNCH] 注释标记：新 ANT 模型发布时需更新此 feature flag
//   - alwaysOnThinking：标记默认开启 adaptive thinking 的模型
import { getFeatureValue_CACHED_MAY_BE_STALE } from 'src/services/analytics/growthbook.js'
import type { EffortLevel } from '../effort.js'

export type AntModel = {
  alias: string
  model: string
  label: string
  description?: string
  defaultEffortValue?: number
  defaultEffortLevel?: EffortLevel
  contextWindow?: number
  defaultMaxTokens?: number
  upperMaxTokensLimit?: number
  /** Model defaults to adaptive thinking and rejects `thinking: { type: 'disabled' }`. */
  alwaysOnThinking?: boolean
}

export type AntModelSwitchCalloutConfig = {
  modelAlias?: string
  description: string
  version: string
}

export type AntModelOverrideConfig = {
  defaultModel?: string
  defaultModelEffortLevel?: EffortLevel
  defaultSystemPromptSuffix?: string
  antModels?: AntModel[]
  switchCallout?: AntModelSwitchCalloutConfig
}

// @[MODEL LAUNCH]: Update tengu_ant_model_override with new ant-only models
// @[MODEL LAUNCH]: Add the codename to scripts/excluded-strings.txt to prevent it from leaking to external builds.
export function getAntModelOverrideConfig(): AntModelOverrideConfig | null {
  if (process.env.USER_TYPE !== 'ant') {
    return null
  }
  return getFeatureValue_CACHED_MAY_BE_STALE<AntModelOverrideConfig | null>(
    'tengu_ant_model_override',
    null,
  )
}

export function getAntModels(): AntModel[] {
  if (process.env.USER_TYPE !== 'ant') {
    return []
  }
  return getAntModelOverrideConfig()?.antModels ?? []
}

export function resolveAntModel(
  model: string | undefined,
): AntModel | undefined {
  if (process.env.USER_TYPE !== 'ant') {
    return undefined
  }
  if (model === undefined) {
    return undefined
  }
  const lower = model.toLowerCase()
  return getAntModels().find(
    m => m.alias === model || lower.includes(m.model.toLowerCase()),
  )
}
