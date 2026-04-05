import { feature } from 'bun:bundle'
import type { Task, TaskType } from './Task.js'
import { DreamTask } from './tasks/DreamTask/DreamTask.js'
import { LocalAgentTask } from './tasks/LocalAgentTask/LocalAgentTask.js'
import { LocalShellTask } from './tasks/LocalShellTask/LocalShellTask.js'
import { RemoteAgentTask } from './tasks/RemoteAgentTask/RemoteAgentTask.js'

/* eslint-disable @typescript-eslint/no-require-imports */
const LocalWorkflowTask: Task | null = feature('WORKFLOW_SCRIPTS')
  ? require('./tasks/LocalWorkflowTask/LocalWorkflowTask.js').LocalWorkflowTask
  : null
const MonitorMcpTask: Task | null = feature('MONITOR_TOOL')
  ? require('./tasks/MonitorMcpTask/MonitorMcpTask.js').MonitorMcpTask
  : null
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * Get all tasks.
 * Mirrors the pattern from tools.ts
 * Note: Returns array inline to avoid circular dependency issues with top-level const
 */
// getAllTasks() 是任务注册表，与 tools.ts 的 getAllBaseTools() 对称。
// 设计原则：
//   - 注册表只声明"可调度的任务类型"，不负责任务生命周期
//   - 生命周期（spawn/kill/状态转换）由各 Task 实现类 + AppState 管理
//   - 条件注册（LocalWorkflowTask/MonitorMcpTask）通过 feature gate 控制，
//     避免未启用特性的代码被加载
// 与 tools.ts 的区别：任务是"后台执行单元"，工具是"模型可调用的能力"；
// 任务由工具触发（如 BashTool → LocalShellTask），但二者生命周期独立。
export function getAllTasks(): Task[] {
  // 架构边界：任务注册表与运行时状态分离。
  // 这里仅声明可调度 task 类型，不负责生命周期；生命周期由各 Task 实现 + AppState 管理。
  const tasks: Task[] = [
    LocalShellTask,
    LocalAgentTask,
    RemoteAgentTask,
    DreamTask,
  ]
  if (LocalWorkflowTask) tasks.push(LocalWorkflowTask)
  if (MonitorMcpTask) tasks.push(MonitorMcpTask)
  return tasks
}

/**
 * Get a task by its type.
 */
export function getTaskByType(type: TaskType): Task | undefined {
  return getAllTasks().find(t => t.type === type)
}
