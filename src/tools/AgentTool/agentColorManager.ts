// tools/AgentTool/agentColorManager.ts — 子 Agent 颜色管理器
// 职责：为并发运行的多个子 Agent 分配唯一的显示颜色，
// 使 TUI 界面中不同 Agent 的输出可视化区分。
//
// 颜色池（AGENT_COLORS）：
//   red / blue / green / yellow / purple / orange / pink / cyan
//   共 8 种颜色，循环分配
//
// 核心函数：
//   - getAgentColor(agentId)：为指定 agentId 分配/查询颜色
//   - releaseAgentColor(agentId)：Agent 结束后释放颜色
//   - getAgentColorMap()：从 bootstrap/state 获取全局颜色映射表
//
// 关联：
//   - bootstrap/state.ts：存储全局 agentColorMap
//   - utils/theme.ts：Theme 类型，用于颜色渲染
//   - AgentTool/UI.tsx：使用颜色渲染 Agent 输出
import { getAgentColorMap } from '../../bootstrap/state.js'
import type { Theme } from '../../utils/theme.js'

export type AgentColorName =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'orange'
  | 'pink'
  | 'cyan'

export const AGENT_COLORS: readonly AgentColorName[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
  'pink',
  'cyan',
] as const

export const AGENT_COLOR_TO_THEME_COLOR = {
  red: 'red_FOR_SUBAGENTS_ONLY',
  blue: 'blue_FOR_SUBAGENTS_ONLY',
  green: 'green_FOR_SUBAGENTS_ONLY',
  yellow: 'yellow_FOR_SUBAGENTS_ONLY',
  purple: 'purple_FOR_SUBAGENTS_ONLY',
  orange: 'orange_FOR_SUBAGENTS_ONLY',
  pink: 'pink_FOR_SUBAGENTS_ONLY',
  cyan: 'cyan_FOR_SUBAGENTS_ONLY',
} as const satisfies Record<AgentColorName, keyof Theme>

export function getAgentColor(agentType: string): keyof Theme | undefined {
  if (agentType === 'general-purpose') {
    return undefined
  }

  const agentColorMap = getAgentColorMap()

  // Check if color already assigned
  const existingColor = agentColorMap.get(agentType)
  if (existingColor && AGENT_COLORS.includes(existingColor)) {
    return AGENT_COLOR_TO_THEME_COLOR[existingColor]
  }

  return undefined
}

export function setAgentColor(
  agentType: string,
  color: AgentColorName | undefined,
): void {
  const agentColorMap = getAgentColorMap()

  if (!color) {
    agentColorMap.delete(agentType)
    return
  }

  if (AGENT_COLORS.includes(color)) {
    agentColorMap.set(agentType, color)
  }
}
