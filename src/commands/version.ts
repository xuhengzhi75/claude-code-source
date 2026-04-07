// commands/version.ts — /version 斜杠命令（仅限 Ant 内部）
// 职责：打印当前会话运行的版本号（非 autoupdate 已下载的版本）。
// 输出格式：<version> (built <build_time>) 或仅 <version>
// 注意：isEnabled 限制为 USER_TYPE=ant，外部用户不可见此命令

import type { Command, LocalCommandCall } from '../types/command.js'

const call: LocalCommandCall = async () => {
  return {
    type: 'text',
    value: MACRO.BUILD_TIME
      ? `${MACRO.VERSION} (built ${MACRO.BUILD_TIME})`
      : MACRO.VERSION,
  }
}

const version = {
  type: 'local',
  name: 'version',
  description:
    'Print the version this session is running (not what autoupdate downloaded)',
  isEnabled: () => process.env.USER_TYPE === 'ant',
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
} satisfies Command

export default version
