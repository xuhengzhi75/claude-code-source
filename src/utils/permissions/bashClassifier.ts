// utils/permissions/bashClassifier.ts — Bash 命令分类器（外部构建存根）
// 职责：为外部（非 ANT）构建提供 bashClassifier 的空实现存根，
// 使外部版本可以正常编译而不包含内部分类器逻辑。
//
// 架构说明：
//   - 此文件是外部构建的存根（stub），所有函数返回空值/false
//   - ANT 内部构建使用真实实现（通过 feature flag 'BASH_CLASSIFIER' 区分）
//   - 真实实现通过 LLM 对 Bash 命令进行语义分类（allow/deny/ask）
//
// 导出的类型和函数（存根版本）：
//   - ClassifierResult：分类结果（matches/confidence/reason）
//   - ClassifierBehavior：'deny' | 'ask' | 'allow'
//   - classifyBashCommand()：始终返回 matches=false（存根）
//   - getBashPromptAllowDescriptions/DenyDescriptions()：返回空数组（存根）
//   - isClassifierPermissionsEnabled()：始终返回 false（存根）
//
// 关键设计：
//   - PROMPT_PREFIX = 'prompt:'：用于识别基于自然语言描述的权限规则
//   - 存根模式确保外部用户不会意外触发内部分类器逻辑
// Stub for external builds - classifier permissions feature is ANT-ONLY

export const PROMPT_PREFIX = 'prompt:'

export type ClassifierResult = {
  matches: boolean
  matchedDescription?: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export type ClassifierBehavior = 'deny' | 'ask' | 'allow'

export function extractPromptDescription(
  _ruleContent: string | undefined,
): string | null {
  return null
}

export function createPromptRuleContent(description: string): string {
  return `${PROMPT_PREFIX} ${description.trim()}`
}

export function isClassifierPermissionsEnabled(): boolean {
  return false
}

export function getBashPromptDenyDescriptions(_context: unknown): string[] {
  return []
}

export function getBashPromptAskDescriptions(_context: unknown): string[] {
  return []
}

export function getBashPromptAllowDescriptions(_context: unknown): string[] {
  return []
}

export async function classifyBashCommand(
  _command: string,
  _cwd: string,
  _descriptions: string[],
  _behavior: ClassifierBehavior,
  _signal: AbortSignal,
  _isNonInteractiveSession: boolean,
): Promise<ClassifierResult> {
  return {
    matches: false,
    confidence: 'high',
    reason: 'This feature is disabled',
  }
}

export async function generateGenericDescription(
  _command: string,
  specificDescription: string | undefined,
  _signal: AbortSignal,
): Promise<string | null> {
  return specificDescription || null
}
