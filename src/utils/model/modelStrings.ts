// utils/model/modelStrings.ts — 模型字符串解析与初始化
// 职责：在启动时根据当前 Provider 初始化模型字符串映射，
// 并提供运行时的模型 ID 解析功能。
//
// 核心函数：
//   - initModelStrings()：启动时调用，将 ALL_MODEL_CONFIGS 按 Provider 展开为 ModelStrings
//   - getModelStrings()：获取当前 Provider 下的模型字符串映射（从 bootstrap state 读取）
//   - resolveOverriddenModel()：将用户指定的模型名（含别名）解析为实际 API 模型 ID
//   - getCanonicalName()：将任意 Provider 的模型 ID 转换为 firstParty 标准 ID
//
// 初始化流程：
//   1. 启动时 initModelStrings() 检测 Provider
//   2. Bedrock：调用 getBedrockInferenceProfiles() 获取用户的推理配置文件列表
//   3. 其他 Provider：直接从 ALL_MODEL_CONFIGS 读取对应 Provider 的 ID
//   4. 结果存入 bootstrap state，供全局访问
//
// Bedrock 推理配置文件：
//   - 用户可能有自定义推理配置文件（如 "eu.anthropic.claude-opus-4-6-v1"）
//   - findFirstMatch() 通过 firstParty ID 子串匹配找到对应的配置文件
//   - 找不到时回退到硬编码的 Bedrock ID
//
// 关键设计：
//   - sequential()：确保并发调用时只初始化一次（防止竞态条件）
//   - bootstrap state 存储：ModelStrings 在进程生命周期内不变
import {
  getModelStrings as getModelStringsState,
  setModelStrings as setModelStringsState,
} from 'src/bootstrap/state.js'
import { logError } from '../log.js'
import { sequential } from '../sequential.js'
import { getInitialSettings } from '../settings/settings.js'
import { findFirstMatch, getBedrockInferenceProfiles } from './bedrock.js'
import {
  ALL_MODEL_CONFIGS,
  CANONICAL_ID_TO_KEY,
  type CanonicalModelId,
  type ModelKey,
} from './configs.js'
import { type APIProvider, getAPIProvider } from './providers.js'

/**
 * Maps each model version to its provider-specific model ID string.
 * Derived from ALL_MODEL_CONFIGS — adding a model there extends this type.
 */
export type ModelStrings = Record<ModelKey, string>

const MODEL_KEYS = Object.keys(ALL_MODEL_CONFIGS) as ModelKey[]

function getBuiltinModelStrings(provider: APIProvider): ModelStrings {
  const out = {} as ModelStrings
  for (const key of MODEL_KEYS) {
    out[key] = ALL_MODEL_CONFIGS[key][provider]
  }
  return out
}

async function getBedrockModelStrings(): Promise<ModelStrings> {
  const fallback = getBuiltinModelStrings('bedrock')
  let profiles: string[] | undefined
  try {
    profiles = await getBedrockInferenceProfiles()
  } catch (error) {
    logError(error as Error)
    return fallback
  }
  if (!profiles?.length) {
    return fallback
  }
  // Each config's firstParty ID is the canonical substring we search for in the
  // user's inference profile list (e.g. "claude-opus-4-6" matches
  // "eu.anthropic.claude-opus-4-6-v1"). Fall back to the hardcoded bedrock ID
  // when no matching profile is found.
  const out = {} as ModelStrings
  for (const key of MODEL_KEYS) {
    const needle = ALL_MODEL_CONFIGS[key].firstParty
    out[key] = findFirstMatch(profiles, needle) || fallback[key]
  }
  return out
}

/**
 * Layer user-configured modelOverrides (from settings.json) on top of the
 * provider-derived model strings. Overrides are keyed by canonical first-party
 * model ID (e.g. "claude-opus-4-6") and map to arbitrary provider-specific
 * strings — typically Bedrock inference profile ARNs.
 */
function applyModelOverrides(ms: ModelStrings): ModelStrings {
  const overrides = getInitialSettings().modelOverrides
  if (!overrides) {
    return ms
  }
  const out = { ...ms }
  for (const [canonicalId, override] of Object.entries(overrides)) {
    const key = CANONICAL_ID_TO_KEY[canonicalId as CanonicalModelId]
    if (key && override) {
      out[key] = override
    }
  }
  return out
}

/**
 * Resolve an overridden model ID (e.g. a Bedrock ARN) back to its canonical
 * first-party model ID. If the input doesn't match any current override value,
 * it is returned unchanged. Safe to call during module init (no-ops if settings
 * aren't loaded yet).
 */
export function resolveOverriddenModel(modelId: string): string {
  let overrides: Record<string, string> | undefined
  try {
    overrides = getInitialSettings().modelOverrides
  } catch {
    return modelId
  }
  if (!overrides) {
    return modelId
  }
  for (const [canonicalId, override] of Object.entries(overrides)) {
    if (override === modelId) {
      return canonicalId
    }
  }
  return modelId
}

const updateBedrockModelStrings = sequential(async () => {
  if (getModelStringsState() !== null) {
    // Already initialized. Doing the check here, combined with
    // `sequential`, allows the test suite to reset the state
    // between tests while still preventing multiple API calls
    // in production.
    return
  }
  try {
    const ms = await getBedrockModelStrings()
    setModelStringsState(ms)
  } catch (error) {
    logError(error as Error)
  }
})

function initModelStrings(): void {
  const ms = getModelStringsState()
  if (ms !== null) {
    // Already initialized
    return
  }
  // Initial with default values for non-Bedrock providers
  if (getAPIProvider() !== 'bedrock') {
    setModelStringsState(getBuiltinModelStrings(getAPIProvider()))
    return
  }
  // On Bedrock, update model strings in the background without blocking.
  // Don't set the state in this case so that we can use `sequential` on
  // `updateBedrockModelStrings` and check for existing state on multiple
  // calls.
  void updateBedrockModelStrings()
}

export function getModelStrings(): ModelStrings {
  const ms = getModelStringsState()
  if (ms === null) {
    initModelStrings()
    // Bedrock path falls through here while the profile fetch runs in the
    // background — still honor overrides on the interim defaults.
    return applyModelOverrides(getBuiltinModelStrings(getAPIProvider()))
  }
  return applyModelOverrides(ms)
}

/**
 * Ensure model strings are fully initialized.
 * For Bedrock users, this waits for the profile fetch to complete.
 * Call this before generating model options to ensure correct region strings.
 */
export async function ensureModelStringsInitialized(): Promise<void> {
  const ms = getModelStringsState()
  if (ms !== null) {
    return
  }

  // For non-Bedrock, initialize synchronously
  if (getAPIProvider() !== 'bedrock') {
    setModelStringsState(getBuiltinModelStrings(getAPIProvider()))
    return
  }

  // For Bedrock, wait for the profile fetch
  await updateBedrockModelStrings()
}
