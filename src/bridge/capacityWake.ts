// bridge/capacityWake.ts — Bridge 容量控制唤醒原语
// 职责：为 Bridge 轮询循环提供"容量满时休眠、条件满足时提前唤醒"的原语，
// 被 replBridge.ts 和 bridgeMain.ts 共享使用。
//
// 唤醒条件（任一满足即唤醒）：
//   (a) 外层循环信号中止（shutdown）
//   (b) 容量释放（当前会话完成，可接受新消息）
//
// 设计意图：避免忙等待（busy-wait），在容量满时让出 CPU，
// 同时保证关闭信号能立即响应，不被阻塞在 sleep 中
/**
 * Shared capacity-wake primitive for bridge poll loops.
 *
 * Both replBridge.ts and bridgeMain.ts need to sleep while "at capacity"
 * but wake early when either (a) the outer loop signal aborts (shutdown),
 * or (b) capacity frees up (session done / transport lost). This module
 * encapsulates the mutable wake-controller + two-signal merger that both
 * poll loops previously duplicated byte-for-byte.
 */

export type CapacitySignal = { signal: AbortSignal; cleanup: () => void }

export type CapacityWake = {
  /**
   * Create a signal that aborts when either the outer loop signal or the
   * capacity-wake controller fires. Returns the merged signal and a cleanup
   * function that removes listeners when the sleep resolves normally
   * (without abort).
   */
  signal(): CapacitySignal
  /**
   * Abort the current at-capacity sleep and arm a fresh controller so the
   * poll loop immediately re-checks for new work.
   */
  wake(): void
}

export function createCapacityWake(outerSignal: AbortSignal): CapacityWake {
  let wakeController = new AbortController()

  function wake(): void {
    wakeController.abort()
    wakeController = new AbortController()
  }

  function signal(): CapacitySignal {
    const merged = new AbortController()
    const abort = (): void => merged.abort()
    if (outerSignal.aborted || wakeController.signal.aborted) {
      merged.abort()
      return { signal: merged.signal, cleanup: () => {} }
    }
    outerSignal.addEventListener('abort', abort, { once: true })
    const capSig = wakeController.signal
    capSig.addEventListener('abort', abort, { once: true })
    return {
      signal: merged.signal,
      cleanup: () => {
        outerSignal.removeEventListener('abort', abort)
        capSig.removeEventListener('abort', abort)
      },
    }
  }

  return { signal, wake }
}
