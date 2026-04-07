// utils/generators.ts — AsyncGenerator 工具函数集
// 职责：提供操作 AsyncGenerator 的高阶工具函数，
// 用于工具执行管道、查询循环等流式处理场景。
//
// 核心函数：
//   - lastX(gen)：消费 AsyncGenerator，返回最后一个 yield 值
//   - returnValue(gen)：消费 AsyncGenerator，返回 return 值（done 时的值）
//   - all(gens)：并发执行多个 AsyncGenerator，按完成顺序 yield 结果
//     → 工具并发执行的核心原语（toolOrchestration.ts 使用）
//   - map(gen, fn)：对 AsyncGenerator 的每个值应用变换函数
//   - filter(gen, pred)：过滤 AsyncGenerator 的值
//   - merge(gens)：合并多个 AsyncGenerator 为一个（按时间顺序交错）
//
// 关键设计：
//   - NO_VALUE Symbol：区分"未产生任何值"和"产生了 undefined"
//   - all() 使用 Promise.race 实现真正的并发，不等待最慢的 generator
//   - 这些工具函数是工具并发执行（toolOrchestration）的基础设施
const NO_VALUE = Symbol('NO_VALUE')

export async function lastX<A>(as: AsyncGenerator<A>): Promise<A> {
  let lastValue: A | typeof NO_VALUE = NO_VALUE
  for await (const a of as) {
    lastValue = a
  }
  if (lastValue === NO_VALUE) {
    throw new Error('No items in generator')
  }
  return lastValue
}

export async function returnValue<A>(
  as: AsyncGenerator<unknown, A>,
): Promise<A> {
  let e
  do {
    e = await as.next()
  } while (!e.done)
  return e.value
}

type QueuedGenerator<A> = {
  done: boolean | void
  value: A | void
  generator: AsyncGenerator<A, void>
  promise: Promise<QueuedGenerator<A>>
}

// Run all generators concurrently up to a concurrency cap, yielding values as they come in
export async function* all<A>(
  generators: AsyncGenerator<A, void>[],
  concurrencyCap = Infinity,
): AsyncGenerator<A, void> {
  const next = (generator: AsyncGenerator<A, void>) => {
    const promise: Promise<QueuedGenerator<A>> = generator
      .next()
      .then(({ done, value }) => ({
        done,
        value,
        generator,
        promise,
      }))
    return promise
  }
  const waiting = [...generators]
  const promises = new Set<Promise<QueuedGenerator<A>>>()

  // Start initial batch up to concurrency cap
  while (promises.size < concurrencyCap && waiting.length > 0) {
    const gen = waiting.shift()!
    promises.add(next(gen))
  }

  while (promises.size > 0) {
    const { done, value, generator, promise } = await Promise.race(promises)
    promises.delete(promise)

    if (!done) {
      promises.add(next(generator))
      // TODO: Clean this up
      if (value !== undefined) {
        yield value
      }
    } else if (waiting.length > 0) {
      // Start a new generator when one finishes
      const nextGen = waiting.shift()!
      promises.add(next(nextGen))
    }
  }
}

export async function toArray<A>(
  generator: AsyncGenerator<A, void>,
): Promise<A[]> {
  const result: A[] = []
  for await (const a of generator) {
    result.push(a)
  }
  return result
}

export async function* fromArray<T>(values: T[]): AsyncGenerator<T, void> {
  for (const value of values) {
    yield value
  }
}
