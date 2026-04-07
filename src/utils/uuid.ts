// utils/uuid.ts — UUID 生成与验证工具
// 职责：提供 UUID 的生成、验证和类型转换工具函数，
// 用于会话 ID、Agent ID、消息 ID 等唯一标识符的管理。
//
// 核心函数：
//   - generateUuid()：生成标准 UUID v4（基于 crypto.randomBytes）
//   - validateUuid(value)：验证字符串是否为合法 UUID 格式，返回 UUID 类型或 null
//   - generateAgentId()：生成 AgentId 类型的 UUID（类型安全包装）
//
// UUID 格式：8-4-4-4-12 十六进制字符（标准 RFC 4122 格式）
// 正则：/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
import { randomBytes, type UUID } from 'crypto'
import type { AgentId } from 'src/types/ids.js'

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validate uuid
 * @param maybeUUID The value to be checked if it is a uuid
 * @returns string as UUID or null if it is not valid
 */
export function validateUuid(maybeUuid: unknown): UUID | null {
  // UUID format: 8-4-4-4-12 hex digits
  if (typeof maybeUuid !== 'string') return null

  return uuidRegex.test(maybeUuid) ? (maybeUuid as UUID) : null
}

/**
 * Generate a new agent ID with prefix for consistency with task IDs.
 * Format: a{label-}{16 hex chars}
 * Example: aa3f2c1b4d5e6f7a8, acompact-a3f2c1b4d5e6f7a8
 */
export function createAgentId(label?: string): AgentId {
  const suffix = randomBytes(8).toString('hex')
  return (label ? `a${label}-${suffix}` : `a${suffix}`) as AgentId
}
