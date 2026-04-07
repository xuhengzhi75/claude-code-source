// tools/FileWriteTool/prompt.ts — FileWriteTool 工具描述与常量
// 职责：定义 FileWriteTool 的工具名称和描述文本。
//
// 关键常量：
//   - FILE_WRITE_TOOL_NAME = 'Write'：工具名称
//   - DESCRIPTION：简短工具描述
//
// 描述内容（getWriteToolDescription）：
//   1. 基础说明：全量写入文件（新建或覆盖）
//   2. 前置读取要求（getPreReadInstruction）：
//      修改已有文件时必须先用 FileRead 读取
//   3. 使用建议：优先用 Edit 工具修改已有文件（只发 diff）
//      仅在创建新文件或完全重写时使用 Write
//
// 关联：
//   - FileWriteTool.ts：调用 getWriteToolDescription() 注册工具
//   - FileReadTool/prompt.ts：FILE_READ_TOOL_NAME 常量
import { FILE_READ_TOOL_NAME } from '../FileReadTool/prompt.js'

export const FILE_WRITE_TOOL_NAME = 'Write'
export const DESCRIPTION = 'Write a file to the local filesystem.'

function getPreReadInstruction(): string {
  return `\n- If this is an existing file, you MUST use the ${FILE_READ_TOOL_NAME} tool first to read the file's contents. This tool will fail if you did not read the file first.`
}

export function getWriteToolDescription(): string {
  return `Writes a file to the local filesystem.

Usage:
- This tool will overwrite the existing file if there is one at the provided path.${getPreReadInstruction()}
- Prefer the Edit tool for modifying existing files \u2014 it only sends the diff. Only use this tool to create new files or for complete rewrites.
- NEVER create documentation files (*.md) or README files unless explicitly requested by the User.
- Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.`
}
