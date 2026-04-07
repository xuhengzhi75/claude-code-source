import { randomBytes } from 'crypto'
import type { AppState } from './state/AppState.js'
import type { AgentId } from './types/ids.js'
import { getTaskOutputPath } from './utils/task/diskOutput.js'

// TaskType：后台任务的类型枚举。
// - local_bash         — 本地 shell 命令（BashTool 触发的后台任务）
// - local_agent        — 本地子 agent（AgentTool 在本进程内 fork 的 agent）
// - remote_agent       — 远程 agent（CCR/bridge 环境下的远端执行）
// - in_process_teammate — 同进程内的 teammate（coordinator 模式下的协作 agent）
// - local_workflow     — 本地工作流（WORKFLOW_SCRIPTS 特性）
// - monitor_mcp        — MCP 监控任务（MONITOR_TOOL 特性）
// - dream              — 后台推理任务（PROACTIVE/KAIROS 特性）
export type TaskType =
  | 'local_bash'
  | 'local_agent'
  | 'remote_agent'
  | 'in_process_teammate'
  | 'local_workflow'
  | 'monitor_mcp'
  | 'dream'

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'killed'

/**
 * True when a task is in a terminal state and will not transition further.
 * Used to guard against injecting messages into dead teammates, evicting
 * finished tasks from AppState, and orphan-cleanup paths.
 */
export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'killed'
}

export type TaskHandle = {
  taskId: string
  cleanup?: () => void
}

export type SetAppState = (f: (prev: AppState) => AppState) => void

export type TaskContext = {
  abortController: AbortController
  getAppState: () => AppState
  setAppState: SetAppState
}

// TaskStateBase：所有任务状态的公共基础字段。
// 这些字段由 createTaskStateBase() 初始化，并在 AppState.tasks 中持久化。
// 字段说明：
//   id          — 任务唯一标识（前缀 + 8 位随机字符，如 a1b2c3d4e5f6g7h8）
//   type        — 任务类型（见 TaskType）
//   status      — 任务状态（pending/running/completed/failed/killed）
//   description — 任务描述（用于 `claude ps` 显示）
//   toolUseId   — 触发该任务的 tool_use block ID（用于关联 tool_result）
//   startTime   — 任务启动时间戳（ms）
//   endTime     — 任务结束时间戳（ms，终态时设置）
//   totalPausedMs — 任务暂停总时长（ms，用于计算实际运行时间）
//   outputFile  — 任务输出文件路径（磁盘持久化，用于 `claude logs` 查看）
//   outputOffset — 已读取的输出偏移量（用于增量读取）
//   notified    — 是否已发送完成通知（防止重复通知）
// Base fields shared by all task states
export type TaskStateBase = {
  id: string
  type: TaskType
  status: TaskStatus
  description: string
  toolUseId?: string
  startTime: number
  endTime?: number
  totalPausedMs?: number
  outputFile: string
  outputOffset: number
  notified: boolean
}

export type LocalShellSpawnInput = {
  command: string
  description: string
  timeout?: number
  toolUseId?: string
  agentId?: AgentId
  /** UI display variant: description-as-label, dialog title, status bar pill. */
  kind?: 'bash' | 'monitor'
}

// What getTaskByType dispatches for: kill. spawn/render were never
// called polymorphically (removed in #22546). All six kill implementations
// use only setAppState — getAppState/abortController were dead weight.
// Task 接口是任务调度器的"能力契约"（精简版）。
// 历史上曾有 spawn/render 方法，但它们从未被多态调用，已在 #22546 中移除。
// 现在 Task 接口只保留 kill()，用于 getTaskByType 分发终止操作。
// 各任务类型的 kill 实现都只需要 setAppState，因此接口也只暴露这一依赖。
export type Task = {
  name: string
  type: TaskType
  kill(taskId: string, setAppState: SetAppState): Promise<void>
}

// Task ID prefixes
const TASK_ID_PREFIXES: Record<string, string> = {
  local_bash: 'b', // Keep as 'b' for backward compatibility
  local_agent: 'a',
  remote_agent: 'r',
  in_process_teammate: 't',
  local_workflow: 'w',
  monitor_mcp: 'm',
  dream: 'd',
}

// Get task ID prefix
function getTaskIdPrefix(type: TaskType): string {
  return TASK_ID_PREFIXES[type] ?? 'x'
}

// Case-insensitive-safe alphabet (digits + lowercase) for task IDs.
// 36^8 ≈ 2.8 trillion combinations, sufficient to resist brute-force symlink attacks.
const TASK_ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

export function generateTaskId(type: TaskType): string {
  // 边界条件：task id 同时用于磁盘输出路径与外部可见标识，
  // 需要在可读性（prefix 可识别类型）和不可预测性（随机后缀）之间平衡。
  const prefix = getTaskIdPrefix(type)
  const bytes = randomBytes(8)
  let id = prefix
  for (let i = 0; i < 8; i++) {
    id += TASK_ID_ALPHABET[bytes[i]! % TASK_ID_ALPHABET.length]
  }
  return id
}

export function createTaskStateBase(
  id: string,
  type: TaskType,
  description: string,
  toolUseId?: string,
): TaskStateBase {
  return {
    id,
    type,
    status: 'pending',
    description,
    toolUseId,
    startTime: Date.now(),
    outputFile: getTaskOutputPath(id),
    outputOffset: 0,
    notified: false,
  }
}
