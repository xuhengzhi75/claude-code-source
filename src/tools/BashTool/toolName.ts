// tools/BashTool/toolName.ts — BashTool 工具名常量
// 职责：单独导出 BASH_TOOL_NAME 常量，打破 prompt.ts 的循环依赖。
//
// 设计原因：
//   prompt.ts 需要引用 BASH_TOOL_NAME，而其他模块（如 built-in agents）
//   也需要引用 BASH_TOOL_NAME 但不想引入整个 prompt.ts（避免循环依赖）。
//   将常量单独抽取到此文件解决了这个问题。
//
// 关联：
//   - prompt.ts：BashTool 系统提示词（从此文件导入常量）
//   - built-in/planAgent.ts 等：直接引用此文件获取工具名

// Here to break circular dependency from prompt.ts
export const BASH_TOOL_NAME = 'Bash'
