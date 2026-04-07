// utils/permissions/PermissionRule.ts — 权限规则类型定义
// 职责：定义权限规则的类型结构和 Zod Schema，
// 是权限系统的数据模型层。
//
// 核心类型（定义在 src/types/permissions.ts，此处 re-export）：
//   - PermissionRule：{ behavior, value, source } 三元组
//   - PermissionBehavior：'allow' | 'deny' | 'ask'
//   - PermissionRuleValue：{ toolName, ruleContent? }
//   - PermissionRuleSource：规则来源（global/project/local/policy 等）
//
// 规则语法示例：
//   - "Bash(git commit:*)"：允许所有以 "git commit" 开头的 Bash 命令
//   - "FileEdit(src/**)"：允许编辑 src/ 下的所有文件
//   - "Bash"：允许所有 Bash 命令（无 ruleContent）
//
// 关键设计：
//   - 类型提取到 src/types/permissions.ts 打破循环依赖
//   - permissionBehaviorSchema / permissionRuleValueSchema 用于 Zod 校验
import z from 'zod/v4'
// Types extracted to src/types/permissions.ts to break import cycles
import type {
  PermissionBehavior,
  PermissionRule,
  PermissionRuleSource,
  PermissionRuleValue,
} from '../../types/permissions.js'
import { lazySchema } from '../lazySchema.js'

// Re-export for backwards compatibility
export type {
  PermissionBehavior,
  PermissionRule,
  PermissionRuleSource,
  PermissionRuleValue,
}

/**
 * ToolPermissionBehavior is the behavior associated with a permission rule.
 * 'allow' means the rule allows the tool to run.
 * 'deny' means the rule denies the tool from running.
 * 'ask' means the rule forces a prompt to be shown to the user.
 */
export const permissionBehaviorSchema = lazySchema(() =>
  z.enum(['allow', 'deny', 'ask']),
)

/**
 * PermissionRuleValue is the content of a permission rule.
 * @param toolName - The name of the tool this rule applies to
 * @param ruleContent - The optional content of the rule.
 *   Each tool may implement custom handling in `checkPermissions()`
 */
export const permissionRuleValueSchema = lazySchema(() =>
  z.object({
    toolName: z.string(),
    ruleContent: z.string().optional(),
  }),
)
