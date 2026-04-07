// tools/MCPTool/MCPTool.ts — MCP 工具代理（Model Context Protocol）
// 职责：作为 MCP 服务器工具的通用代理，将外部 MCP 服务器暴露的工具
// 统一包装为 Claude Code 内部工具格式，实现无缝调用。
//
// 工作原理：
//   - MCP 服务器通过 stdio/SSE/WebSocket 连接，注册自定义工具
//   - MCPTool 作为"透传代理"，将模型的工具调用转发给对应 MCP 服务器
//   - 输入 schema 使用 lazySchema + z.object().passthrough()，接受任意 JSON 对象
//   - 输出结果原样返回给模型（支持文本/图片/资源等多种 content 类型）
//
// 关键特性：
//   - 动态 schema：每个 MCP 工具有自己的 inputSchema，运行时动态解析
//   - 权限控制：通过 PermissionResult 决定是否允许调用
//   - 输出截断：isOutputLineTruncated() 检测并标记被截断的输出
//   - 进度展示：renderToolUseProgressMessage() 实时显示执行进度
//
// 与其他工具的区别：
//   - 内置工具（BashTool/FileEditTool 等）：硬编码逻辑，直接在进程内执行
//   - MCPTool：纯代理，逻辑在外部 MCP 服务器中，通过协议通信
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import type { PermissionResult } from '../../utils/permissions/PermissionResult.js'
import { isOutputLineTruncated } from '../../utils/terminal.js'
import { DESCRIPTION, PROMPT } from './prompt.js'
import {
  renderToolResultMessage,
  renderToolUseMessage,
  renderToolUseProgressMessage,
} from './UI.js'

// Allow any input object since MCP tools define their own schemas
export const inputSchema = lazySchema(() => z.object({}).passthrough())
type InputSchema = ReturnType<typeof inputSchema>

export const outputSchema = lazySchema(() =>
  z.string().describe('MCP tool execution result'),
)
type OutputSchema = ReturnType<typeof outputSchema>

export type Output = z.infer<OutputSchema>

// Re-export MCPProgress from centralized types to break import cycles
export type { MCPProgress } from '../../types/tools.js'

export const MCPTool = buildTool({
  isMcp: true,
  // Overridden in mcpClient.ts with the real MCP tool name + args
  isOpenWorld() {
    return false
  },
  // Overridden in mcpClient.ts
  name: 'mcp',
  maxResultSizeChars: 100_000,
  // Overridden in mcpClient.ts
  async description() {
    return DESCRIPTION
  },
  // Overridden in mcpClient.ts
  async prompt() {
    return PROMPT
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  // Overridden in mcpClient.ts
  async call() {
    return {
      data: '',
    }
  },
  async checkPermissions(): Promise<PermissionResult> {
    return {
      behavior: 'passthrough',
      message: 'MCPTool requires permission.',
    }
  },
  renderToolUseMessage,
  // Overridden in mcpClient.ts
  userFacingName: () => 'mcp',
  renderToolUseProgressMessage,
  renderToolResultMessage,
  isResultTruncated(output: Output): boolean {
    return isOutputLineTruncated(output)
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content,
    }
  },
} satisfies ToolDef<InputSchema, Output>)
