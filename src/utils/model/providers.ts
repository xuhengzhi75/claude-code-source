// utils/model/providers.ts — API Provider 检测
// 职责：根据环境变量检测当前使用的 API Provider，
// 是所有 Provider 路由决策的单一来源。
//
// 核心函数：
//   - getAPIProvider()：返回当前 Provider（firstParty/bedrock/vertex/foundry）
//   - getAPIProviderForStatsig()：返回 Provider 字符串用于 Statsig 埋点
//   - isFirstPartyAnthropicBaseUrl()：检测 ANTHROPIC_BASE_URL 是否指向官方 API
//
// Provider 检测逻辑（优先级从高到低）：
//   1. CLAUDE_CODE_USE_BEDROCK=1  → 'bedrock'（AWS）
//   2. CLAUDE_CODE_USE_VERTEX=1   → 'vertex'（GCP）
//   3. CLAUDE_CODE_USE_FOUNDRY=1  → 'foundry'（Azure）
//   4. 默认                        → 'firstParty'（直连 Anthropic API）
//
// 关键设计：
//   - 此模块是叶子模块（无业务依赖），可被任何模块安全 import
//   - isFirstPartyAnthropicBaseUrl() 用于判断是否可以使用 OAuth 等一方特性
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import { isEnvTruthy } from '../envUtils.js'

export type APIProvider = 'firstParty' | 'bedrock' | 'vertex' | 'foundry'

export function getAPIProvider(): APIProvider {
  return isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)
    ? 'bedrock'
    : isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX)
      ? 'vertex'
      : isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY)
        ? 'foundry'
        : 'firstParty'
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

/**
 * Check if ANTHROPIC_BASE_URL is a first-party Anthropic API URL.
 * Returns true if not set (default API) or points to api.anthropic.com
 * (or api-staging.anthropic.com for ant users).
 */
export function isFirstPartyAnthropicBaseUrl(): boolean {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (!baseUrl) {
    return true
  }
  try {
    const host = new URL(baseUrl).host
    const allowedHosts = ['api.anthropic.com']
    if (process.env.USER_TYPE === 'ant') {
      allowedHosts.push('api-staging.anthropic.com')
    }
    return allowedHosts.includes(host)
  } catch {
    return false
  }
}
