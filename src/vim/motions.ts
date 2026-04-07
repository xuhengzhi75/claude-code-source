// =============================================================================
// src/vim/motions.ts — Vim 光标移动（Motion）纯函数
//
// 【模块职责】
//   将 Vim motion 按键（h/j/k/l/w/b/e/0/^/$/f/F/t/T/gg/G 等）解析为
//   目标光标位置，不修改任何状态——纯计算函数。
//
// 【关键函数】
//   resolveMotion(key, cursor, value, count, findChar?)
//     → Cursor | null（null 表示该 key 不是 motion）
//
//   isInclusiveMotion(key)  → 操作符范围是否包含目标字符（f/F/t/T/$ 等）
//   isLinewiseMotion(key)   → 是否为行级 motion（gg/G/j/k）
//
// 【多行支持】
//   value 参数为完整输入框文本，光标用 Cursor 对象（offset）表示，
//   j/k 在多行文本中按视觉行移动。
// =============================================================================

/**
 * Vim Motion Functions
 *
 * Pure functions for resolving vim motions to cursor positions.
 */

import type { Cursor } from '../utils/Cursor.js'

/**
 * Resolve a motion to a target cursor position.
 * Does not modify anything - pure calculation.
 */
export function resolveMotion(
  key: string,
  cursor: Cursor,
  count: number,
): Cursor {
  let result = cursor
  for (let i = 0; i < count; i++) {
    const next = applySingleMotion(key, result)
    if (next.equals(result)) break
    result = next
  }
  return result
}

/**
 * Apply a single motion step.
 */
function applySingleMotion(key: string, cursor: Cursor): Cursor {
  switch (key) {
    case 'h':
      return cursor.left()
    case 'l':
      return cursor.right()
    case 'j':
      return cursor.downLogicalLine()
    case 'k':
      return cursor.upLogicalLine()
    case 'gj':
      return cursor.down()
    case 'gk':
      return cursor.up()
    case 'w':
      return cursor.nextVimWord()
    case 'b':
      return cursor.prevVimWord()
    case 'e':
      return cursor.endOfVimWord()
    case 'W':
      return cursor.nextWORD()
    case 'B':
      return cursor.prevWORD()
    case 'E':
      return cursor.endOfWORD()
    case '0':
      return cursor.startOfLogicalLine()
    case '^':
      return cursor.firstNonBlankInLogicalLine()
    case '$':
      return cursor.endOfLogicalLine()
    case 'G':
      return cursor.startOfLastLine()
    default:
      return cursor
  }
}

/**
 * Check if a motion is inclusive (includes character at destination).
 */
export function isInclusiveMotion(key: string): boolean {
  return 'eE$'.includes(key)
}

/**
 * Check if a motion is linewise (operates on full lines when used with operators).
 * Note: gj/gk are characterwise exclusive per `:help gj`, not linewise.
 */
export function isLinewiseMotion(key: string): boolean {
  return 'jkG'.includes(key) || key === 'gg'
}
