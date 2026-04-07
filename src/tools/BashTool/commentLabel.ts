// tools/BashTool/commentLabel.ts — Bash 命令注释标签提取
// 职责：从 Bash 命令的第一行提取 `# 注释` 作为工具调用的显示标签。
//
// 使用场景：
//   - 全屏模式（fullscreen）下作为工具调用的简短标签
//   - 折叠组（collapse-group）的 ⎿ 提示文本
//   - 这是 Claude 为用户写的人类可读描述
//
// 规则：
//   - 第一行以 `#` 开头（非 `#!` shebang）→ 提取注释文本
//   - 去除 `#` 前缀和前导空格
//   - 空注释返回 undefined
//
// 示例：
//   `# 安装依赖\nnpm install` → "安装依赖"
//   `#!/bin/bash\necho hi`   → undefined（shebang 不算注释标签）

/**
 * If the first line of a bash command is a `# comment` (not a `#!` shebang),
 * return the comment text stripped of the `#` prefix. Otherwise undefined.
 *
 * Under fullscreen mode this is the non-verbose tool-use label AND the
 * collapse-group ⎿ hint — it's what Claude wrote for the human to read.
 */
export function extractBashCommentLabel(command: string): string | undefined {
  const nl = command.indexOf('\n')
  const firstLine = (nl === -1 ? command : command.slice(0, nl)).trim()
  if (!firstLine.startsWith('#') || firstLine.startsWith('#!')) return undefined
  return firstLine.replace(/^#+\s*/, '') || undefined
}
