// utils/telemetry/skillLoadedEvent.ts — Skill 加载事件上报
// 职责：在会话启动时，为每个可用的 Skill 记录一条 tengu_skill_loaded 分析事件，
// 用于统计各 Skill 在不同会话中的可用率和使用分布。
//
// 核心函数：logSkillsLoaded(cwd, contextWindowTokens)
//   1. 调用 getSkillToolCommands(cwd) 获取当前工作目录下所有可用 Skill
//   2. 计算 skillBudget（基于上下文窗口 token 数的字符预算）
//   3. 为每个 Skill 调用 logEvent('tengu_skill_loaded', {...}) 上报事件
//
// 上报字段：
//   - skill_name：Skill 名称（非 PII，已验证不含代码或文件路径）
//   - skill_source：Skill 来源（marketplace/local 等）
//   - char_budget：该 Skill 可用的字符预算
//   - 其他 Skill 元数据
//
// 调用时机：会话初始化阶段（bootstrap），在 Skill 工具注册后立即调用
import { getSkillToolCommands } from '../../commands.js'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_PII_TAGGED,
  logEvent,
} from '../../services/analytics/index.js'
import { getCharBudget } from '../../tools/SkillTool/prompt.js'

/**
 * Logs a tengu_skill_loaded event for each skill available at session startup.
 * This enables analytics on which skills are available across sessions.
 */
export async function logSkillsLoaded(
  cwd: string,
  contextWindowTokens: number,
): Promise<void> {
  const skills = await getSkillToolCommands(cwd)
  const skillBudget = getCharBudget(contextWindowTokens)

  for (const skill of skills) {
    if (skill.type !== 'prompt') continue

    logEvent('tengu_skill_loaded', {
      // _PROTO_skill_name routes to the privileged skill_name BQ column.
      // Unredacted names don't go in additional_metadata.
      _PROTO_skill_name:
        skill.name as AnalyticsMetadata_I_VERIFIED_THIS_IS_PII_TAGGED,
      skill_source:
        skill.source as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      skill_loaded_from:
        skill.loadedFrom as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      skill_budget: skillBudget,
      ...(skill.kind && {
        skill_kind:
          skill.kind as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      }),
    })
  }
}
