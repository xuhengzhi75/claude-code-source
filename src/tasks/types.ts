// tasks/types.ts — Task 状态类型联合定义
// 职责：定义所有具体 Task 状态类型的联合类型，供需要处理任意 Task 类型的
// 组件和工具函数使用。
//
// Task 类型体系：
//   LocalShellTask    — 本地 Bash 命令（后台 shell / monitor）
//   LocalAgentTask    — 本地子 Agent（在同一进程内运行）
//   RemoteAgentTask   — 远程 Agent（通过 Teleport/CCR 在云端运行）
//   InProcessTeammateTask — 团队协作 Agent（多 Agent 协同）
//   LocalWorkflowTask — 本地工作流任务
//   MonitorMcpTask    — MCP 服务器监控任务
//   DreamTask         — 自动记忆整合（auto-dream）子 Agent
//
// BackgroundTaskState：可在底部 pill 和 Shift+Down 对话框中显示的任务类型
// isBackgroundTask()：判断任务是否应显示在后台任务指示器中

// Union of all concrete task state types
// Use this for components that need to work with any task type

import type { DreamTaskState } from './DreamTask/DreamTask.js'
import type { InProcessTeammateTaskState } from './InProcessTeammateTask/types.js'
import type { LocalAgentTaskState } from './LocalAgentTask/LocalAgentTask.js'
import type { LocalShellTaskState } from './LocalShellTask/guards.js'
import type { LocalWorkflowTaskState } from './LocalWorkflowTask/LocalWorkflowTask.js'
import type { MonitorMcpTaskState } from './MonitorMcpTask/MonitorMcpTask.js'
import type { RemoteAgentTaskState } from './RemoteAgentTask/RemoteAgentTask.js'

export type TaskState =
  | LocalShellTaskState
  | LocalAgentTaskState
  | RemoteAgentTaskState
  | InProcessTeammateTaskState
  | LocalWorkflowTaskState
  | MonitorMcpTaskState
  | DreamTaskState

// Task types that can appear in the background tasks indicator
export type BackgroundTaskState =
  | LocalShellTaskState
  | LocalAgentTaskState
  | RemoteAgentTaskState
  | InProcessTeammateTaskState
  | LocalWorkflowTaskState
  | MonitorMcpTaskState
  | DreamTaskState

/**
 * Check if a task should be shown in the background tasks indicator.
 * A task is considered a background task if:
 * 1. It is running or pending
 * 2. It has been explicitly backgrounded (not a foreground task)
 */
export function isBackgroundTask(task: TaskState): task is BackgroundTaskState {
  if (task.status !== 'running' && task.status !== 'pending') {
    return false
  }
  // Foreground tasks (isBackgrounded === false) are not yet "background tasks"
  if ('isBackgrounded' in task && task.isBackgrounded === false) {
    return false
  }
  return true
}
