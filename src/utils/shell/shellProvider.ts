// utils/shell/shellProvider.ts — Shell 提供者接口定义
// 职责：定义 ShellProvider 接口，抽象不同 Shell 实现（Bash/PowerShell）的公共契约，
// 使 BashTool 可以通过统一接口调用不同平台的 Shell。
//
// 核心类型：
//   - ShellProvider：Shell 提供者接口，定义 execute() / getInfo() 等方法
//   - ShellType：'bash' | 'powershell'
//   - DEFAULT_HOOK_SHELL：Hook 脚本默认使用 bash
//
// 实现类：
//   - bashProvider.ts：Unix/macOS/Linux 的 Bash 实现
//   - powershellProvider.ts：Windows 的 PowerShell 实现
//
// 关键设计：
//   - 接口抽象使 BashTool 与具体 Shell 解耦
//   - resolveDefaultShell.ts 在启动时检测系统默认 Shell 并选择对应 Provider
export const SHELL_TYPES = ['bash', 'powershell'] as const
export type ShellType = (typeof SHELL_TYPES)[number]
export const DEFAULT_HOOK_SHELL: ShellType = 'bash'

export type ShellProvider = {
  type: ShellType
  shellPath: string
  detached: boolean

  /**
   * Build the full command string including all shell-specific setup.
   * For bash: source snapshot, session env, disable extglob, eval-wrap, pwd tracking.
   */
  buildExecCommand(
    command: string,
    opts: {
      id: number | string
      sandboxTmpDir?: string
      useSandbox: boolean
    },
  ): Promise<{ commandString: string; cwdFilePath: string }>

  /**
   * Shell args for spawn (e.g., ['-c', '-l', cmd] for bash).
   */
  getSpawnArgs(commandString: string): string[]

  /**
   * Extra env vars for this shell type.
   * May perform async initialization (e.g., tmux socket setup for bash).
   */
  getEnvironmentOverrides(command: string): Promise<Record<string, string>>
}
