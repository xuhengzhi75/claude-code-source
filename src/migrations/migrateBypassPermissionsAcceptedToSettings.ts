// =============================================================================
// src/migrations/migrateBypassPermissionsAcceptedToSettings.ts
// — 危险模式权限接受状态迁移
//
// 【迁移内容】
//   将 globalConfig.bypassPermissionsModeAccepted 迁移到
//   userSettings 的 hasSkipDangerousModePermissionPrompt 标志，
//   并从 globalConfig 中删除旧字段。
// =============================================================================

import { logEvent } from 'src/services/analytics/index.js'
import { getGlobalConfig, saveGlobalConfig } from '../utils/config.js'
import { logError } from '../utils/log.js'
import {
  hasSkipDangerousModePermissionPrompt,
  updateSettingsForSource,
} from '../utils/settings/settings.js'

/**
 * Migration: Move bypassPermissionsModeAccepted from global config to settings.json
 * as skipDangerousModePermissionPrompt. This is a better home since settings.json
 * is the user-configurable settings file.
 */
export function migrateBypassPermissionsAcceptedToSettings(): void {
  const globalConfig = getGlobalConfig()

  if (!globalConfig.bypassPermissionsModeAccepted) {
    return
  }

  try {
    if (!hasSkipDangerousModePermissionPrompt()) {
      updateSettingsForSource('userSettings', {
        skipDangerousModePermissionPrompt: true,
      })
    }

    logEvent('tengu_migrate_bypass_permissions_accepted', {})

    saveGlobalConfig(current => {
      if (!('bypassPermissionsModeAccepted' in current)) return current
      const { bypassPermissionsModeAccepted: _, ...updatedConfig } = current
      return updatedConfig
    })
  } catch (error) {
    logError(
      new Error(`Failed to migrate bypass permissions accepted: ${error}`),
    )
  }
}
