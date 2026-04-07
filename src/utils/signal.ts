// utils/signal.ts — 轻量级事件信号原语
// 职责：提供一个极简的监听器集合原语，用于纯事件通知（无状态存储）。
// 将代码库中重复 ~15 次的 8 行样板代码压缩为一行。
//
// 核心函数：createSignal<Args>()
//   返回 { subscribe, emit } 对象：
//   - subscribe(listener)：注册监听器，返回注销函数
//   - emit(...args)：触发所有监听器
//
// 与 Store（AppState/createStore）的区别：
//   - Signal：无快照，无 getState，订阅者只需知道"发生了某事"
//   - Store：有状态，订阅者可读取当前值
//
// 使用场景：
//   - 配置变更通知（settings changed）
//   - GrowthBook 特性开关更新
//   - 任何"发布-订阅"模式但不需要状态的场景
//
// 示例：
//   const changed = createSignal<[SettingSource]>()
//   export const subscribe = changed.subscribe
//   // 触发：changed.emit('userSettings')
/**
 * Tiny listener-set primitive for pure event signals (no stored state).
 *
 * Collapses the ~8-line `const listeners = new Set(); function subscribe(){…};
 * function notify(){for(const l of listeners) l()}` boilerplate that was
 * duplicated ~15× across the codebase into a one-liner.
 *
 * Distinct from a store (AppState, createStore) — there is no snapshot, no
 * getState. Use this when subscribers only need to know "something happened",
 * optionally with event args, not "what is the current value".
 *
 * Usage:
 *   const changed = createSignal<[SettingSource]>()
 *   export const subscribe = changed.subscribe
 *   // later: changed.emit('userSettings')
 */

export type Signal<Args extends unknown[] = []> = {
  /** Subscribe a listener. Returns an unsubscribe function. */
  subscribe: (listener: (...args: Args) => void) => () => void
  /** Call all subscribed listeners with the given arguments. */
  emit: (...args: Args) => void
  /** Remove all listeners. Useful in dispose/reset paths. */
  clear: () => void
}

export function createSignal<Args extends unknown[] = []>(): Signal<Args> {
  const listeners = new Set<(...args: Args) => void>()
  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    emit(...args) {
      for (const listener of listeners) listener(...args)
    },
    clear() {
      listeners.clear()
    },
  }
}
