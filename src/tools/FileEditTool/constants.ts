// tools/FileEditTool/constants.ts — FileEditTool 常量定义
// 职责：集中定义 FileEditTool 相关常量，单独抽取以避免循环依赖。
//
// 关键常量：
//   - FILE_EDIT_TOOL_NAME = 'Edit'：工具名称
//   - CLAUDE_FOLDER_PERMISSION_PATTERN = '/.claude/**'
//     项目级 .claude/ 目录的会话级访问权限模式
//   - GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN = '~/.claude/**'
//     全局 ~/.claude/ 目录的会话级访问权限模式
//   - FILE_UNEXPECTEDLY_MODIFIED_ERROR：文件被意外修改时的错误消息
//     触发条件：编辑前后文件哈希不一致（外部程序修改了文件）
//
// 关联：
//   - FileEditTool.ts：使用这些常量进行权限检查和错误处理
//   - BashTool/built-in agents 等：引用 FILE_EDIT_TOOL_NAME 避免循环依赖

// In its own file to avoid circular dependencies
export const FILE_EDIT_TOOL_NAME = 'Edit'

// Permission pattern for granting session-level access to the project's .claude/ folder
export const CLAUDE_FOLDER_PERMISSION_PATTERN = '/.claude/**'

// Permission pattern for granting session-level access to the global ~/.claude/ folder
export const GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN = '~/.claude/**'

export const FILE_UNEXPECTEDLY_MODIFIED_ERROR =
  'File has been unexpectedly modified. Read it again before attempting to write it.'
