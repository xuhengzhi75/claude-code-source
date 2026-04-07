// tools/FileEditTool/types.ts — FileEditTool 类型定义
// 职责：定义 FileEditTool 的输入 schema 和核心类型，
// 使用 Zod 进行运行时类型验证。
//
// 核心类型：
//   - EditInput（inputSchema）：工具调用的输入参数
//     · file_path：要修改的文件绝对路径
//     · old_string：要替换的原始文本
//     · new_string：替换后的新文本（必须与 old_string 不同）
//     · replace_all：是否替换所有出现（默认 false）
//   - FileEdit：单次编辑操作的结构化表示
//     · 包含编辑前后内容、diff、行号等信息
//
// 特殊处理：
//   - semanticBoolean：将字符串 "true"/"false" 也解析为布尔值
//     （模型有时会输出字符串而非布尔值）
//   - lazySchema：延迟 schema 初始化，避免循环依赖
//
// 关联：
//   - FileEditTool.ts：使用 EditInput 验证工具调用参数
//   - utils.ts：使用 FileEdit 类型传递编辑结果
import { z } from 'zod/v4'
import { lazySchema } from '../../utils/lazySchema.js'
import { semanticBoolean } from '../../utils/semanticBoolean.js'

// The input schema with optional replace_all
const inputSchema = lazySchema(() =>
  z.strictObject({
    file_path: z.string().describe('The absolute path to the file to modify'),
    old_string: z.string().describe('The text to replace'),
    new_string: z
      .string()
      .describe(
        'The text to replace it with (must be different from old_string)',
      ),
    replace_all: semanticBoolean(
      z.boolean().default(false).optional(),
    ).describe('Replace all occurrences of old_string (default false)'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

// Parsed output — what call() receives. z.output not z.input: with
// semanticBoolean the input side is unknown (preprocess accepts anything).
export type FileEditInput = z.output<InputSchema>

// Individual edit without file_path
export type EditInput = Omit<FileEditInput, 'file_path'>

// Runtime version where replace_all is always defined
export type FileEdit = {
  old_string: string
  new_string: string
  replace_all: boolean
}

export const hunkSchema = lazySchema(() =>
  z.object({
    oldStart: z.number(),
    oldLines: z.number(),
    newStart: z.number(),
    newLines: z.number(),
    lines: z.array(z.string()),
  }),
)

export const gitDiffSchema = lazySchema(() =>
  z.object({
    filename: z.string(),
    status: z.enum(['modified', 'added']),
    additions: z.number(),
    deletions: z.number(),
    changes: z.number(),
    patch: z.string(),
    repository: z
      .string()
      .nullable()
      .optional()
      .describe('GitHub owner/repo when available'),
  }),
)

// Output schema for FileEditTool
const outputSchema = lazySchema(() =>
  z.object({
    filePath: z.string().describe('The file path that was edited'),
    oldString: z.string().describe('The original string that was replaced'),
    newString: z.string().describe('The new string that replaced it'),
    originalFile: z
      .string()
      .describe('The original file contents before editing'),
    structuredPatch: z
      .array(hunkSchema())
      .describe('Diff patch showing the changes'),
    userModified: z
      .boolean()
      .describe('Whether the user modified the proposed changes'),
    replaceAll: z.boolean().describe('Whether all occurrences were replaced'),
    gitDiff: gitDiffSchema().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>

export type FileEditOutput = z.infer<OutputSchema>

export { inputSchema, outputSchema }
