// utils/permissions/dangerousPatterns.ts — 危险 Shell 命令模式列表
// 职责：维护可绕过 auto mode 分类器的危险命令前缀列表，
// 在进入 auto mode 时自动剥离这些过于宽泛的权限规则。
//
// 核心常量：
//   - CROSS_PLATFORM_CODE_EXEC：跨平台代码执行入口（python/node/bash 等）
//   - UNIX_CODE_EXEC：Unix 专用代码执行入口（perl/ruby/lua 等）
//   - WINDOWS_CODE_EXEC：Windows 专用代码执行入口（powershell/cmd 等）
//
// 使用场景：
//   - permissionSetup.ts 的 isDangerousBashPermission() 使用这些列表
//   - 进入 auto mode 时，匹配这些模式的 allow 规则会被自动剥离
//   - 防止 "Bash(python:*)" 这类规则绕过分类器执行任意代码
//
// 危险规则示例：
//   - "Bash(python:*)"：允许运行任意 Python 代码
//   - "Bash(node:*)"：允许运行任意 Node.js 代码
//   - "Bash(bash:*)"：允许运行任意 Bash 脚本
/**
 * Pattern lists for dangerous shell-tool allow-rule prefixes.
 *
 * An allow rule like `Bash(python:*)` or `PowerShell(node:*)` lets the model
 * run arbitrary code via that interpreter, bypassing the auto-mode classifier.
 * These lists feed the isDangerous{Bash,PowerShell}Permission predicates in
 * permissionSetup.ts, which strip such rules at auto-mode entry.
 *
 * The matcher in each predicate handles the rule-shape variants (exact, `:*`,
 * trailing `*`, ` *`, ` -…*`). PS-specific cmdlet strings live in
 * isDangerousPowerShellPermission (permissionSetup.ts).
 */

/**
 * Cross-platform code-execution entry points present on both Unix and Windows.
 * Shared to prevent the two lists drifting apart on interpreter additions.
 */
export const CROSS_PLATFORM_CODE_EXEC = [
  // Interpreters
  'python',
  'python3',
  'python2',
  'node',
  'deno',
  'tsx',
  'ruby',
  'perl',
  'php',
  'lua',
  // Package runners
  'npx',
  'bunx',
  'npm run',
  'yarn run',
  'pnpm run',
  'bun run',
  // Shells reachable from both (Git Bash / WSL on Windows, native on Unix)
  'bash',
  'sh',
  // Remote arbitrary-command wrapper (native OpenSSH on Win10+)
  'ssh',
] as const

export const DANGEROUS_BASH_PATTERNS: readonly string[] = [
  ...CROSS_PLATFORM_CODE_EXEC,
  'zsh',
  'fish',
  'eval',
  'exec',
  'env',
  'xargs',
  'sudo',
  // Anthropic internal: ant-only tools plus general tools that ant sandbox
  // dotfile data shows are commonly over-allowlisted as broad prefixes.
  // These stay ant-only — external users don't have coo, and the rest are
  // an empirical-risk call grounded in ant sandbox data, not a universal
  // "this tool is unsafe" judgment. PS may want these once it has usage data.
  ...(process.env.USER_TYPE === 'ant'
    ? [
        'fa run',
        // Cluster code launcher — arbitrary code on the cluster
        'coo',
        // Network/exfil: gh gist create --public, gh api arbitrary HTTP,
        // curl/wget POST. gh api needs its own entry — the matcher is
        // exact-shape, not prefix, so pattern 'gh' alone does not catch
        // rule 'gh api:*' (same reason 'npm run' is separate from 'npm').
        'gh',
        'gh api',
        'curl',
        'wget',
        // git config core.sshCommand / hooks install = arbitrary code
        'git',
        // Cloud resource writes (s3 public buckets, k8s mutations)
        'kubectl',
        'aws',
        'gcloud',
        'gsutil',
      ]
    : []),
]
