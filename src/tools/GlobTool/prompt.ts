// tools/GlobTool/prompt.ts — GlobTool 工具名称与描述
// 职责：定义 GlobTool 的工具名称和描述文本。
//
// 关键常量：
//   - GLOB_TOOL_NAME = 'Glob'：工具名称
//   - DESCRIPTION：工具描述，包含使用场景和注意事项
//     · 适合按文件名模式查找文件
//     · 结果按修改时间排序
//     · 开放式搜索建议使用 Agent 工具（多轮 glob+grep）
//
// 关联：
//   - GlobTool.ts：调用此文件的常量注册工具
//   - AgentTool/built-in agents：引用 GLOB_TOOL_NAME
export const GLOB_TOOL_NAME = 'Glob'

export const DESCRIPTION = `- Fast file pattern matching tool that works with any codebase size
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name patterns
- When you are doing an open ended search that may require multiple rounds of globbing and grepping, use the Agent tool instead`
