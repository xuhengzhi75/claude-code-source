// tools/FileReadTool/limits.ts — FileReadTool 输出限制配置
// 职责：定义文件读取的两层限制，防止超大文件消耗过多 token。
//
// 两层限制机制：
//   ┌──────────────┬─────────┬──────────────────────────┬──────────────┬──────────────────┐
//   │ 限制         │ 默认值  │ 检查时机                 │ 检查成本     │ 溢出处理         │
//   ├──────────────┼─────────┼──────────────────────────┼──────────────┼──────────────────┤
//   │ maxSizeBytes │ 256 KB  │ 读取前（文件总大小）     │ 1次 stat     │ 抛出错误（预读） │
//   │ maxTokens    │ 25000   │ 读取后（实际输出 token） │ API 往返     │ 抛出错误（后读） │
//   └──────────────┴─────────┴──────────────────────────┴──────────────┴──────────────────┘
//
// 设计决策（#21841, Mar 2026）：
//   曾测试"截断而非抛错"方案：工具错误率下降，但平均 token 上升。
//   抛错路径产生 ~100 字节错误结果，截断路径产生 ~25K token 内容。
//   最终保留抛错方案。
//
// 关键函数：
//   - getMaxOutputTokens()：获取当前 maxTokens 限制（支持 GrowthBook 远程配置）
//   - DEFAULT_MAX_OUTPUT_TOKENS = 25000：默认 token 上限
//
// 关联：
//   - FileReadTool.ts：调用此模块检查文件大小和 token 限制
//   - utils/file.ts：MAX_OUTPUT_SIZE（maxSizeBytes 来源）

/**
 * Read tool output limits.  Two caps apply to text reads:
 *
 *   | limit         | default | checks                    | cost          | on overflow     |
 *   |---------------|---------|---------------------------|---------------|-----------------|
 *   | maxSizeBytes  | 256 KB  | TOTAL FILE SIZE (not out) | 1 stat        | throws pre-read |
 *   | maxTokens     | 25000   | actual output tokens      | API roundtrip | throws post-read|
 *
 * Known mismatch: maxSizeBytes gates on total file size, not the slice.
 * Tested truncating instead of throwing for explicit-limit reads that
 * exceed the byte cap (#21841, Mar 2026).  Reverted: tool error rate
 * dropped but mean tokens rose — the throw path yields a ~100-byte error
 * tool-result while truncation yields ~25K tokens of content at the cap.
 */
import memoize from 'lodash-es/memoize.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from 'src/services/analytics/growthbook.js'
import { MAX_OUTPUT_SIZE } from 'src/utils/file.js'
export const DEFAULT_MAX_OUTPUT_TOKENS = 25000

/**
 * Env var override for max output tokens. Returns undefined when unset/invalid
 * so the caller can fall through to the next precedence tier.
 */
function getEnvMaxTokens(): number | undefined {
  const override = process.env.CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS
  if (override) {
    const parsed = parseInt(override, 10)
    if (!isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }
  return undefined
}

export type FileReadingLimits = {
  maxTokens: number
  maxSizeBytes: number
  includeMaxSizeInPrompt?: boolean
  targetedRangeNudge?: boolean
}

/**
 * Default limits for Read tool when the ToolUseContext doesn't supply an
 * override. Memoized so the GrowthBook value is fixed at first call — avoids
 * the cap changing mid-session as the flag refreshes in the background.
 *
 * Precedence for maxTokens: env var > GrowthBook > DEFAULT_MAX_OUTPUT_TOKENS.
 * (Env var is a user-set override, should beat experiment infrastructure.)
 *
 * Defensive: each field is individually validated; invalid values fall
 * through to the hardcoded defaults (no route to cap=0).
 */
export const getDefaultFileReadingLimits = memoize((): FileReadingLimits => {
  const override =
    getFeatureValue_CACHED_MAY_BE_STALE<Partial<FileReadingLimits> | null>(
      'tengu_amber_wren',
      {},
    )

  const maxSizeBytes =
    typeof override?.maxSizeBytes === 'number' &&
    Number.isFinite(override.maxSizeBytes) &&
    override.maxSizeBytes > 0
      ? override.maxSizeBytes
      : MAX_OUTPUT_SIZE

  const envMaxTokens = getEnvMaxTokens()
  const maxTokens =
    envMaxTokens ??
    (typeof override?.maxTokens === 'number' &&
    Number.isFinite(override.maxTokens) &&
    override.maxTokens > 0
      ? override.maxTokens
      : DEFAULT_MAX_OUTPUT_TOKENS)

  const includeMaxSizeInPrompt =
    typeof override?.includeMaxSizeInPrompt === 'boolean'
      ? override.includeMaxSizeInPrompt
      : undefined

  const targetedRangeNudge =
    typeof override?.targetedRangeNudge === 'boolean'
      ? override.targetedRangeNudge
      : undefined

  return {
    maxSizeBytes,
    maxTokens,
    includeMaxSizeInPrompt,
    targetedRangeNudge,
  }
})
