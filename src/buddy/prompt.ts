// =============================================================================
// src/buddy/prompt.ts — Companion 系统提示注入
//
// 【模块职责】
//   在对话开始时将 Companion 信息注入为 attachment，让主模型知晓宠物的
//   存在，从而在用户直接呼叫宠物名字时保持克制（不抢答）。
//
// 【关键函数】
//   companionIntroText(name, species)
//     生成注入到系统提示的介绍文本，明确告知模型：
//     - 宠物是独立的旁观者，不是模型本身
//     - 用户直接呼叫宠物时，模型只需一行内回应或保持沉默
//
//   getCompanionIntroAttachment(messages)
//     检查当前对话是否已注入过同名宠物的 intro attachment，
//     避免重复注入（幂等）。
//     - 功能门控：feature('BUDDY') 关闭时返回空数组
//     - 静音门控：config.companionMuted 为 true 时跳过
// =============================================================================

import { feature } from 'bun:bundle'
import type { Message } from '../types/message.js'
import type { Attachment } from '../utils/attachments.js'
import { getGlobalConfig } from '../utils/config.js'
import { getCompanion } from './companion.js'

export function companionIntroText(name: string, species: string): string {
  return `# Companion

A small ${species} named ${name} sits beside the user's input box and occasionally comments in a speech bubble. You're not ${name} — it's a separate watcher.

When the user addresses ${name} directly (by name), its bubble will answer. Your job in that moment is to stay out of the way: respond in ONE line or less, or just answer any part of the message meant for you. Don't explain that you're not ${name} — they know. Don't narrate what ${name} might say — the bubble handles that.`
}

export function getCompanionIntroAttachment(
  messages: Message[] | undefined,
): Attachment[] {
  if (!feature('BUDDY')) return []
  const companion = getCompanion()
  if (!companion || getGlobalConfig().companionMuted) return []

  // Skip if already announced for this companion.
  for (const msg of messages ?? []) {
    if (msg.type !== 'attachment') continue
    if (msg.attachment.type !== 'companion_intro') continue
    if (msg.attachment.name === companion.name) return []
  }

  return [
    {
      type: 'companion_intro',
      name: companion.name,
      species: companion.species,
    },
  ]
}
