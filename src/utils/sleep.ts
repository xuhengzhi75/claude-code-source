// utils/sleep.ts — 可中止的异步等待工具
// 职责：提供支持 AbortSignal 的 sleep 函数，
// 确保退避循环（backoff loop）在进程关闭时不会阻塞。
//
// 核心函数：sleep(ms, options?)
//   - 默认：等待 ms 毫秒后 resolve（静默中止，调用方检查 signal.aborted）
//   - throwOnAbort: true：中止时 reject（适合深层重试循环，让异常向上冒泡）
//   - abortError: Error：自定义中止时的 rejection 错误（隐含 throwOnAbort: true）
//
// 使用场景：
//   - API 请求重试的退避等待（withRetry.ts）
//   - 轮询循环的间隔等待
//   - 进程关闭时快速响应 AbortSignal，避免阻塞 graceful shutdown
/**
 * Abort-responsive sleep. Resolves after `ms` milliseconds, or immediately
 * when `signal` aborts (so backoff loops don't block shutdown).
 *
 * By default, abort resolves silently; the caller should check
 * `signal.aborted` after the await. Pass `throwOnAbort: true` to have
 * abort reject — useful when the sleep is deep inside a retry loop
 * and you want the rejection to bubble up and cancel the whole operation.
 *
 * Pass `abortError` to customize the rejection error (implies
 * `throwOnAbort: true`). Useful for retry loops that catch a specific
 * error class (e.g. `APIUserAbortError`).
 */
export function sleep(
  ms: number,
  signal?: AbortSignal,
  opts?: { throwOnAbort?: boolean; abortError?: () => Error; unref?: boolean },
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check aborted state BEFORE setting up the timer. If we defined
    // onAbort first and called it synchronously here, it would reference
    // `timer` while still in the Temporal Dead Zone.
    if (signal?.aborted) {
      if (opts?.throwOnAbort || opts?.abortError) {
        void reject(opts.abortError?.() ?? new Error('aborted'))
      } else {
        void resolve()
      }
      return
    }
    const timer = setTimeout(
      (signal, onAbort, resolve) => {
        signal?.removeEventListener('abort', onAbort)
        void resolve()
      },
      ms,
      signal,
      onAbort,
      resolve,
    )
    function onAbort(): void {
      clearTimeout(timer)
      if (opts?.throwOnAbort || opts?.abortError) {
        void reject(opts.abortError?.() ?? new Error('aborted'))
      } else {
        void resolve()
      }
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    if (opts?.unref) {
      timer.unref()
    }
  })
}

function rejectWithTimeout(reject: (e: Error) => void, message: string): void {
  reject(new Error(message))
}

/**
 * Race a promise against a timeout. Rejects with `Error(message)` if the
 * promise doesn't settle within `ms`. The timeout timer is cleared when
 * the promise settles (no dangling timer) and unref'd so it doesn't
 * block process exit.
 *
 * Note: this doesn't cancel the underlying work — if the promise is
 * backed by a runaway async operation, that keeps running. This just
 * returns control to the caller.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    // eslint-disable-next-line no-restricted-syntax -- not a sleep: REJECTS after ms (timeout guard)
    timer = setTimeout(rejectWithTimeout, ms, reject, message)
    if (typeof timer === 'object') timer.unref?.()
  })
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer !== undefined) clearTimeout(timer)
  })
}
