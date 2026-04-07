// bridge/flushGate.ts — Bridge 初始 flush 期间的消息写入门控状态机
// 职责：在 Bridge 会话启动时的历史消息 flush 阶段，
// 阻塞新消息写入，防止 flush 与实时消息交错导致顺序混乱。
//
// 状态机：
//   idle → flushing（开始 flush）→ done（flush 完成，解除阻塞）
//
// 使用场景：
//   Bridge 会话恢复时，需要先将历史消息批量 POST 到服务器，
//   在此期间新产生的消息必须等待 flush 完成后才能写入
/**
 * State machine for gating message writes during an initial flush.
 *
 * When a bridge session starts, historical messages are flushed to the
 * server via a single HTTP POST. During that flush, new messages must
 * be queued to prevent them from arriving at the server interleaved
 * with the historical messages.
 *
 * Lifecycle:
 *   start() → enqueue() returns true, items are queued
 *   end()   → returns queued items for draining, enqueue() returns false
 *   drop()  → discards queued items (permanent transport close)
 *   deactivate() → clears active flag without dropping items
 *                   (transport replacement — new transport will drain)
 */
export class FlushGate<T> {
  private _active = false
  private _pending: T[] = []

  get active(): boolean {
    return this._active
  }

  get pendingCount(): number {
    return this._pending.length
  }

  /** Mark flush as in-progress. enqueue() will start queuing items. */
  start(): void {
    this._active = true
  }

  /**
   * End the flush and return any queued items for draining.
   * Caller is responsible for sending the returned items.
   */
  end(): T[] {
    this._active = false
    return this._pending.splice(0)
  }

  /**
   * If flush is active, queue the items and return true.
   * If flush is not active, return false (caller should send directly).
   */
  enqueue(...items: T[]): boolean {
    if (!this._active) return false
    this._pending.push(...items)
    return true
  }

  /**
   * Discard all queued items (permanent transport close).
   * Returns the number of items dropped.
   */
  drop(): number {
    this._active = false
    const count = this._pending.length
    this._pending.length = 0
    return count
  }

  /**
   * Clear the active flag without dropping queued items.
   * Used when the transport is replaced (onWorkReceived) — the new
   * transport's flush will drain the pending items.
   */
  deactivate(): void {
    this._active = false
  }
}
