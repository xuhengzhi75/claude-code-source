// =============================================================================
// src/migrations/resetAutoModeOptInForDefaultOffer.ts — 自动模式默认提供重置
//
// 【迁移内容】
//   当 feature('AUTO_MODE_DEFAULT_OFFER') 启用时，重置用户的自动模式
//   opt-in 状态，使其重新看到默认提供弹窗。
//   用于在产品策略变更时重新征得用户同意。
// =============================================================================

import { feature } from 'bun:bundle'
import { logEvent } from 'src/services/analytics/index.js'
import { getGlobalConfig, saveGlobalConfig } from '../utils/config.js'
import { logError } from '../utils/log.js'
import { getAutoModeEnabledState } from '../utils/permissions/permissionSetup.js'
import {
  getSettingsForSource,
  updateSettingsForSource,
} from '../utils/settings/settings.js'

/**
 * One-shot migration: clear skipAutoPermissionPrompt for users who accepted
 * the old 2-option AutoModeOptInDialog but don't have auto as their default.
 * Re-surfaces the dialog so they see the new "make it my default mode" option.
 * Guard lives in GlobalConfig (~/.claude.json), not settings.json, so it
 * survives settings resets and doesn't re-arm itself.
 *
 * Only runs when tengu_auto_mode_config.enabled === 'enabled'. For 'opt-in'
 * users, clearing skipAutoPermissionPrompt would remove auto from the carousel
 * (permissionSetup.ts:988) — the dialog would become unreachable and the
 * migration would defeat itself. In practice the ~40 target ants are all
 * 'enabled' (they reached the old dialog via bare Shift+Tab, which requires
 * 'enabled'), but the guard makes it safe regardless.
 */
export function resetAutoModeOptInForDefaultOffer(): void {
  if (feature('TRANSCRIPT_CLASSIFIER')) {
    const config = getGlobalConfig()
    if (config.hasResetAutoModeOptInForDefaultOffer) return
    if (getAutoModeEnabledState() !== 'enabled') return

    try {
      const user = getSettingsForSource('userSettings')
      if (
        user?.skipAutoPermissionPrompt &&
        user?.permissions?.defaultMode !== 'auto'
      ) {
        updateSettingsForSource('userSettings', {
          skipAutoPermissionPrompt: undefined,
        })
        logEvent('tengu_migrate_reset_auto_opt_in_for_default_offer', {})
      }

      saveGlobalConfig(c => {
        if (c.hasResetAutoModeOptInForDefaultOffer) return c
        return { ...c, hasResetAutoModeOptInForDefaultOffer: true }
      })
    } catch (error) {
      logError(new Error(`Failed to reset auto mode opt-in: ${error}`))
    }
  }
}
