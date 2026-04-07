// utils/hash.ts — 字符串哈希工具
// 职责：提供快速、确定性的非加密哈希函数，
// 用于生成缓存目录名、会话 ID 等需要跨运行时稳定的标识符。
//
// 核心函数：
//   - djb2Hash(str)：djb2 算法，返回有符号 32 位整数
//     → 跨运行时确定性（不同于 Bun.hash 使用 wyhash，结果可能不同）
//     → 适用于需要磁盘持久化的缓存目录名（跨版本升级后仍一致）
//   - hashString(str)：返回十六进制字符串形式的哈希值
//
// 与 crypto.ts 的区别：
//   - hash.ts：非加密哈希，速度快，用于缓存键/目录名
//   - crypto.ts：加密哈希（SHA-256 等），用于安全相关场景
/**
 * djb2 string hash — fast non-cryptographic hash returning a signed 32-bit int.
 * Deterministic across runtimes (unlike Bun.hash which uses wyhash). Use as a
 * fallback when Bun.hash isn't available, or when you need on-disk-stable
 * output (e.g. cache directory names that must survive runtime upgrades).
 */
export function djb2Hash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return hash
}

/**
 * Hash arbitrary content for change detection. Bun.hash is ~100x faster than
 * sha256 and collision-resistant enough for diff detection (not crypto-safe).
 */
export function hashContent(content: string): string {
  if (typeof Bun !== 'undefined') {
    return Bun.hash(content).toString()
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto') as typeof import('crypto')
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * Hash two strings without allocating a concatenated temp string. Bun path
 * seed-chains wyhash (hash(a) feeds as seed to hash(b)); Node path uses
 * incremental SHA-256 update. Seed-chaining naturally disambiguates
 * ("ts","code") vs ("tsc","ode") so no separator is needed under Bun.
 */
export function hashPair(a: string, b: string): string {
  if (typeof Bun !== 'undefined') {
    return Bun.hash(b, Bun.hash(a)).toString()
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto') as typeof import('crypto')
  return crypto
    .createHash('sha256')
    .update(a)
    .update('\0')
    .update(b)
    .digest('hex')
}
