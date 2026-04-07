// =============================================================================
// src/memdir/memoryAge.ts — 记忆文件时效性计算
//
// 【模块职责】
//   将记忆文件的 mtime（毫秒时间戳）转换为人类可读的时效描述，
//   帮助模型判断记忆是否可能已过期。
//
// 【设计动机】
//   模型对原始 ISO 时间戳的日期运算能力较弱，"47 days ago" 这样的
//   自然语言描述比 "2025-02-18T10:30:00Z" 更能触发模型的过期推理。
//
// 【函数】
//   memoryAgeDays(mtimeMs) → number  距今天数（向下取整，负值钳制为 0）
//   memoryAge(mtimeMs)     → string  "today" / "yesterday" / "N days ago"
// =============================================================================

/**
 * Days elapsed since mtime.  Floor-rounded — 0 for today, 1 for
 * yesterday, 2+ for older.  Negative inputs (future mtime, clock skew)
 * clamp to 0.
 */
export function memoryAgeDays(mtimeMs: number): number {
  return Math.max(0, Math.floor((Date.now() - mtimeMs) / 86_400_000))
}

/**
 * Human-readable age string.  Models are poor at date arithmetic —
 * a raw ISO timestamp doesn't trigger staleness reasoning the way
 * "47 days ago" does.
 */
export function memoryAge(mtimeMs: number): string {
  const d = memoryAgeDays(mtimeMs)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  return `${d} days ago`
}

/**
 * Plain-text staleness caveat for memories >1 day old.  Returns ''
 * for fresh (today/yesterday) memories — warning there is noise.
 *
 * Use this when the consumer already provides its own wrapping
 * (e.g. messages.ts relevant_memories → wrapMessagesInSystemReminder).
 *
 * Motivated by user reports of stale code-state memories (file:line
 * citations to code that has since changed) being asserted as fact —
 * the citation makes the stale claim sound more authoritative, not less.
 */
export function memoryFreshnessText(mtimeMs: number): string {
  const d = memoryAgeDays(mtimeMs)
  if (d <= 1) return ''
  return (
    `This memory is ${d} days old. ` +
    `Memories are point-in-time observations, not live state — ` +
    `claims about code behavior or file:line citations may be outdated. ` +
    `Verify against current code before asserting as fact.`
  )
}

/**
 * Per-memory staleness note wrapped in <system-reminder> tags.
 * Returns '' for memories ≤ 1 day old.  Use this for callers that
 * don't add their own system-reminder wrapper (e.g. FileReadTool output).
 */
export function memoryFreshnessNote(mtimeMs: number): string {
  const text = memoryFreshnessText(mtimeMs)
  if (!text) return ''
  return `<system-reminder>${text}</system-reminder>\n`
}
