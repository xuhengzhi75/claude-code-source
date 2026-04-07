// tools/FileEditTool/prompt.ts — FileEditTool 工具描述生成器
// 职责：生成 FileEditTool 的工具描述文本（tool description），
// 告知模型如何正确使用 Edit 工具。
//
// 描述内容：
//   1. 基础说明：精确字符串替换语义
//   2. 前置读取要求（getPreReadInstruction）：
//      必须先用 FileRead 读取文件，才能执行编辑
//   3. 行号前缀格式（isCompactLinePrefixEnabled）：
//      - compact 模式：行号 + tab
//      - 标准模式：空格 + 行号 + 箭头
//   4. 唯一性提示（USER_TYPE === 'ant'）：
//      ant 内部用户获得额外提示：old_string 通常 2-4 行即可唯一定位
//
// 关联：
//   - FileEditTool.ts：调用 getEditToolDescription() 注册工具
//   - FileReadTool/prompt.ts：FILE_READ_TOOL_NAME 常量
//   - utils/file.ts：isCompactLinePrefixEnabled 检测
import { isCompactLinePrefixEnabled } from '../../utils/file.js'
import { FILE_READ_TOOL_NAME } from '../FileReadTool/prompt.js'

function getPreReadInstruction(): string {
  return `\n- You must use your \`${FILE_READ_TOOL_NAME}\` tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file. `
}

export function getEditToolDescription(): string {
  return getDefaultEditDescription()
}

function getDefaultEditDescription(): string {
  const prefixFormat = isCompactLinePrefixEnabled()
    ? 'line number + tab'
    : 'spaces + line number + arrow'
  const minimalUniquenessHint =
    process.env.USER_TYPE === 'ant'
      ? `\n- Use the smallest old_string that's clearly unique — usually 2-4 adjacent lines is sufficient. Avoid including 10+ lines of context when less uniquely identifies the target.`
      : ''
  return `Performs exact string replacements in files.

Usage:${getPreReadInstruction()}
- When editing text from Read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is: ${prefixFormat}. Everything after that is the actual file content to match. Never include any part of the line number prefix in the old_string or new_string.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.
- The edit will FAIL if \`old_string\` is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use \`replace_all\` to change every instance of \`old_string\`.${minimalUniquenessHint}
- Use \`replace_all\` for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.`
}
