// commands/advisor.ts — /advisor 斜杠命令
// 职责：管理 Advisor 模型配置，允许用户为当前会话设置一个辅助顾问模型。
//
// Advisor 模式：
//   - 主模型（main loop model）负责执行，Advisor 模型在旁提供建议
//   - 用户可通过 /advisor <model> 设置，/advisor off 关闭
//   - 仅部分模型支持 Advisor 功能（modelSupportsAdvisor 检查）
//   - 仅有权限的用户可配置（canUserConfigureAdvisor 检查）
//
// 命令格式：
//   /advisor          — 查看当前 Advisor 设置
//   /advisor <model>  — 设置 Advisor 模型（如 /advisor opus）
//   /advisor off      — 关闭 Advisor

import type { Command } from '../commands.js'
import type { LocalCommandCall } from '../types/command.js'
import {
  canUserConfigureAdvisor,
  isValidAdvisorModel,
  modelSupportsAdvisor,
} from '../utils/advisor.js'
import {
  getDefaultMainLoopModelSetting,
  normalizeModelStringForAPI,
  parseUserSpecifiedModel,
} from '../utils/model/model.js'
import { validateModel } from '../utils/model/validateModel.js'
import { updateSettingsForSource } from '../utils/settings/settings.js'

const call: LocalCommandCall = async (args, context) => {
  const arg = args.trim().toLowerCase()
  const baseModel = parseUserSpecifiedModel(
    context.getAppState().mainLoopModel ?? getDefaultMainLoopModelSetting(),
  )

  if (!arg) {
    const current = context.getAppState().advisorModel
    if (!current) {
      return {
        type: 'text',
        value:
          'Advisor: not set\nUse "/advisor <model>" to enable (e.g. "/advisor opus").',
      }
    }
    if (!modelSupportsAdvisor(baseModel)) {
      return {
        type: 'text',
        value: `Advisor: ${current} (inactive)\nThe current model (${baseModel}) does not support advisors.`,
      }
    }
    return {
      type: 'text',
      value: `Advisor: ${current}\nUse "/advisor unset" to disable or "/advisor <model>" to change.`,
    }
  }

  if (arg === 'unset' || arg === 'off') {
    const prev = context.getAppState().advisorModel
    context.setAppState(s => {
      if (s.advisorModel === undefined) return s
      return { ...s, advisorModel: undefined }
    })
    updateSettingsForSource('userSettings', { advisorModel: undefined })
    return {
      type: 'text',
      value: prev
        ? `Advisor disabled (was ${prev}).`
        : 'Advisor already unset.',
    }
  }

  const normalizedModel = normalizeModelStringForAPI(arg)
  const resolvedModel = parseUserSpecifiedModel(arg)
  const { valid, error } = await validateModel(resolvedModel)
  if (!valid) {
    return {
      type: 'text',
      value: error
        ? `Invalid advisor model: ${error}`
        : `Unknown model: ${arg} (${resolvedModel})`,
    }
  }

  if (!isValidAdvisorModel(resolvedModel)) {
    return {
      type: 'text',
      value: `The model ${arg} (${resolvedModel}) cannot be used as an advisor`,
    }
  }

  context.setAppState(s => {
    if (s.advisorModel === normalizedModel) return s
    return { ...s, advisorModel: normalizedModel }
  })
  updateSettingsForSource('userSettings', { advisorModel: normalizedModel })

  if (!modelSupportsAdvisor(baseModel)) {
    return {
      type: 'text',
      value: `Advisor set to ${normalizedModel}.\nNote: Your current model (${baseModel}) does not support advisors. Switch to a supported model to use the advisor.`,
    }
  }

  return {
    type: 'text',
    value: `Advisor set to ${normalizedModel}.`,
  }
}

const advisor = {
  type: 'local',
  name: 'advisor',
  description: 'Configure the advisor model',
  argumentHint: '[<model>|off]',
  isEnabled: () => canUserConfigureAdvisor(),
  get isHidden() {
    return !canUserConfigureAdvisor()
  },
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
} satisfies Command

export default advisor
