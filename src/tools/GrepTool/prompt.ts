// tools/GrepTool/prompt.ts — GrepTool 工具名称与描述
// 职责：定义 GrepTool 的工具名称和描述文本。
//
// 关键常量：
//   - GREP_TOOL_NAME = 'Grep'：工具名称
//   - getDescription()：动态生成工具描述（引用其他工具名）
//
// 描述要点：
//   - 强制使用 Grep 工具，禁止通过 Bash 调用 grep/rg
//     （Grep 工具有正确的权限和访问控制）
//   - 支持完整正则语法（ripgrep Rust 引擎）
//   - 支持 glob 过滤和文件类型过滤
//   - 三种输出模式：content / files_with_matches / count
//   - 开放式搜索建议使用 Agent 工具
//
// 关联：
//   - GrepTool.ts：调用此文件的常量和描述函数注册工具
//   - AgentTool/built-in agents：引用 GREP_TOOL_NAME
import { AGENT_TOOL_NAME } from '../AgentTool/constants.js'
import { BASH_TOOL_NAME } from '../BashTool/toolName.js'

export const GREP_TOOL_NAME = 'Grep'

export function getDescription(): string {
  return `A powerful search tool built on ripgrep

  Usage:
  - ALWAYS use ${GREP_TOOL_NAME} for search tasks. NEVER invoke \`grep\` or \`rg\` as a ${BASH_TOOL_NAME} command. The ${GREP_TOOL_NAME} tool has been optimized for correct permissions and access.
  - Supports full regex syntax (e.g., "log.*Error", "function\\s+\\w+")
  - Filter files with glob parameter (e.g., "*.js", "**/*.tsx") or type parameter (e.g., "js", "py", "rust")
  - Output modes: "content" shows matching lines, "files_with_matches" shows only file paths (default), "count" shows match counts
  - Use ${AGENT_TOOL_NAME} tool for open-ended searches requiring multiple rounds
  - Pattern syntax: Uses ripgrep (not grep) - literal braces need escaping (use \`interface\\{\\}\` to find \`interface{}\` in Go code)
  - Multiline matching: By default patterns match within single lines only. For cross-line patterns like \`struct \\{[\\s\\S]*?field\`, use \`multiline: true\`
`
}
