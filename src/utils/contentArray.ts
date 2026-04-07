// utils/contentArray.ts — Content Block 数组操作工具
// 职责：提供在 Anthropic API content 数组中精确插入 block 的工具函数，
// 用于 API 层正确定位补充内容（如缓存编辑指令）。
//
// 核心函数：insertBlockRelativeToToolResults(content, block)
//   插入规则：
//   - 若存在 tool_result blocks：插入到最后一个 tool_result 之后
//   - 否则：插入到最后一个 block 之前
//   - 若插入后 block 成为最后一个元素：追加文本续接 block
//     （某些 API 要求 prompt 不能以非文本内容结尾）
//
// 使用场景：
//   - 缓存编辑指令（cache editing directives）的精确定位
//   - 确保 tool_result 之后的内容顺序正确
/**
 * Utility for inserting a block into a content array relative to tool_result
 * blocks. Used by the API layer to position supplementary content (e.g.,
 * cache editing directives) correctly within user messages.
 *
 * Placement rules:
 * - If tool_result blocks exist: insert after the last one
 * - Otherwise: insert before the last block
 * - If the inserted block would be the final element, a text continuation
 *   block is appended (some APIs require the prompt not to end with
 *   non-text content)
 */

/**
 * Inserts a block into the content array after the last tool_result block.
 * Mutates the array in place.
 *
 * @param content - The content array to modify
 * @param block - The block to insert
 */
export function insertBlockAfterToolResults(
  content: unknown[],
  block: unknown,
): void {
  // Find position after the last tool_result block
  let lastToolResultIndex = -1
  for (let i = 0; i < content.length; i++) {
    const item = content[i]
    if (
      item &&
      typeof item === 'object' &&
      'type' in item &&
      (item as { type: string }).type === 'tool_result'
    ) {
      lastToolResultIndex = i
    }
  }

  if (lastToolResultIndex >= 0) {
    const insertPos = lastToolResultIndex + 1
    content.splice(insertPos, 0, block)
    // Append a text continuation if the inserted block is now last
    if (insertPos === content.length - 1) {
      content.push({ type: 'text', text: '.' })
    }
  } else {
    // No tool_result blocks — insert before the last block
    const insertIndex = Math.max(0, content.length - 1)
    content.splice(insertIndex, 0, block)
  }
}
