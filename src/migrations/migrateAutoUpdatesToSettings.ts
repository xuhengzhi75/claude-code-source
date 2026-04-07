// =============================================================================
// src/migrations/migrateAutoUpdatesToSettings.ts — 自动更新偏好迁移
//
// 【迁移内容】
//   将 globalConfig.autoUpdates = false（用户主动关闭自动更新）迁移到
//   userSettings.env.DISABLE_AUTOUPDATER = '1'，并从 globalConfig 中删除
//   旧字段。
//
// 【迁移条件】
//   仅当 autoUpdates === false 且 autoUpdatesProtectedForNative !== true 时执行，
//   即只迁移用户主动关闭的情况，不迁移原生安装保护性关闭的情况。
// =============================================================================

import { logEvent } from 'src/services/analytics/index.js'
import { getGlobalConfig, saveGlobalConfig } from '../utils/config.js'
import { logError } from '../utils/log.js'
import {
  getSettingsForSource,
  updateSettingsForSource,
} from '../utils/settings/settings.js'
/**
 * Migration: Move user-set autoUpdates preference to settings.json env var
 * Only migrates if user explicitly disabled auto-updates (not for protection)
 * This preserves user intent while allowing native installations to auto-update
 */
export function migrateAutoUpdatesToSettings(): void {
  const globalConfig = getGlobalConfig()

  // Only migrate if autoUpdates was explicitly set to false by user preference
  // (not automatically for native protection)
  if (
    globalConfig.autoUpdates !== false ||
    globalConfig.autoUpdatesProtectedForNative === true
  ) {
    return
  }

  try {
    const userSettings = getSettingsForSource('userSettings') || {}

    // Always set DISABLE_AUTOUPDATER to preserve user intent
    // We need to overwrite even if it exists, to ensure the migration is complete
    updateSettingsForSource('userSettings', {
      ...userSettings,
      env: {
        ...userSettings.env,
        DISABLE_AUTOUPDATER: '1',
      },
    })

    logEvent('tengu_migrate_autoupdates_to_settings', {
      was_user_preference: true,
      already_had_env_var: !!userSettings.env?.DISABLE_AUTOUPDATER,
    })

    // explicitly set, so this takes effect immediately
    process.env.DISABLE_AUTOUPDATER = '1'

    // Remove autoUpdates from global config after successful migration
    saveGlobalConfig(current => {
      const {
        autoUpdates: _,
        autoUpdatesProtectedForNative: __,
        ...updatedConfig
      } = current
      return updatedConfig
    })
  } catch (error) {
    logError(new Error(`Failed to migrate auto-updates: ${error}`))
    logEvent('tengu_migrate_autoupdates_error', {
      has_error: true,
    })
  }
}
