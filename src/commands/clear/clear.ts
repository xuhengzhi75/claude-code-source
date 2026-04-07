// commands/clear/clear.ts — /clear 斜杠命令入口
// 职责：清除当前对话历史，开始新会话。
// 实际逻辑委托给 conversation.ts（重依赖，懒加载）。

import type { LocalCommandCall } from '../../types/command.js'
import { clearConversation } from './conversation.js'

export const call: LocalCommandCall = async (_, context) => {
  await clearConversation(context)
  return { type: 'text', value: '' }
}
