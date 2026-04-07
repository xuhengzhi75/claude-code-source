// =============================================================================
// src/voice/voiceModeEnabled.ts — 语音模式可用性检测
//
// 【模块职责】
//   提供三个层次的语音模式可用性检测函数，供 UI 注册、配置页面和
//   运行时路径分别调用：
//
//   isVoiceGrowthBookEnabled()
//     GrowthBook kill-switch 检测：tengu_amber_quartz_disabled 标志为 true
//     时关闭语音（紧急下线开关）。默认 false → 缺失/过期缓存视为"未关闭"，
//     新安装无需等待 GrowthBook 初始化即可使用语音。
//
//   hasVoiceAuth()
//     OAuth 令牌检测：语音模式需要 Anthropic OAuth（claude.ai voice_stream
//     端点），不支持 API Key / Bedrock / Vertex / Foundry。
//     调用 getClaudeAIOAuthTokens()（memoized，首次 ~20-50ms keychain 读取）。
//
//   isVoiceModeEnabled()
//     完整运行时检测 = hasVoiceAuth() && isVoiceGrowthBookEnabled()。
//     适用于命令注册、ConfigTool、VoiceModeNotice 等可接受 keychain 延迟的路径。
//     React 渲染路径应使用 useVoiceEnabled()（缓存 auth 半部分）。
// =============================================================================

import { feature } from 'bun:bundle'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../services/analytics/growthbook.js'
import {
  getClaudeAIOAuthTokens,
  isAnthropicAuthEnabled,
} from '../utils/auth.js'

/**
 * Kill-switch check for voice mode. Returns true unless the
 * `tengu_amber_quartz_disabled` GrowthBook flag is flipped on (emergency
 * off). Default `false` means a missing/stale disk cache reads as "not
 * killed" — so fresh installs get voice working immediately without
 * waiting for GrowthBook init. Use this for deciding whether voice mode
 * should be *visible* (e.g., command registration, config UI).
 */
export function isVoiceGrowthBookEnabled(): boolean {
  // Positive ternary pattern — see docs/feature-gating.md.
  // Negative pattern (if (!feature(...)) return) does not eliminate
  // inline string literals from external builds.
  return feature('VOICE_MODE')
    ? !getFeatureValue_CACHED_MAY_BE_STALE('tengu_amber_quartz_disabled', false)
    : false
}

/**
 * Auth-only check for voice mode. Returns true when the user has a valid
 * Anthropic OAuth token. Backed by the memoized getClaudeAIOAuthTokens —
 * first call spawns `security` on macOS (~20-50ms), subsequent calls are
 * cache hits. The memoize clears on token refresh (~once/hour), so one
 * cold spawn per refresh is expected. Cheap enough for usage-time checks.
 */
export function hasVoiceAuth(): boolean {
  // Voice mode requires Anthropic OAuth — it uses the voice_stream
  // endpoint on claude.ai which is not available with API keys,
  // Bedrock, Vertex, or Foundry.
  if (!isAnthropicAuthEnabled()) {
    return false
  }
  // isAnthropicAuthEnabled only checks the auth *provider*, not whether
  // a token exists. Without this check, the voice UI renders but
  // connectVoiceStream fails silently when the user isn't logged in.
  const tokens = getClaudeAIOAuthTokens()
  return Boolean(tokens?.accessToken)
}

/**
 * Full runtime check: auth + GrowthBook kill-switch. Callers: `/voice`
 * (voice.ts, voice/index.ts), ConfigTool, VoiceModeNotice — command-time
 * paths where a fresh keychain read is acceptable. For React render
 * paths use useVoiceEnabled() instead (memoizes the auth half).
 */
export function isVoiceModeEnabled(): boolean {
  return hasVoiceAuth() && isVoiceGrowthBookEnabled()
}
