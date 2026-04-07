// tools/FileReadTool/imageProcessor.ts — 图片处理器
// 职责：为 FileReadTool 提供图片读取和处理能力，
// 将图片文件转换为 Anthropic API 可接受的 base64 content block。
//
// 核心功能：
//   - 图片格式检测：支持 PNG/JPEG/GIF/WebP
//   - 图片缩放（Sharp）：超过尺寸限制时自动缩放
//     · SharpInstance 类型：封装 Sharp 库的操作接口
//     · 仅在 bundled 模式下可用（isInBundledMode）
//   - Base64 编码：将图片 Buffer 转为 base64 字符串
//   - 降采样：质量/颜色数量优化，减少 token 消耗
//
// 运行模式：
//   - bundled 模式（ant-native）：使用内置 Sharp 库处理图片
//   - 非 bundled 模式：跳过缩放，直接 base64 编码
//
// 关联：
//   - FileReadTool.ts：调用此模块处理图片文件
//   - utils/imageResizer.ts：通用图片缩放工具（BashTool 也使用）
//   - utils/bundledMode.ts：检测是否为 bundled 构建
import type { Buffer } from 'buffer'
import { isInBundledMode } from '../../utils/bundledMode.js'

export type SharpInstance = {
  metadata(): Promise<{ width: number; height: number; format: string }>
  resize(
    width: number,
    height: number,
    options?: { fit?: string; withoutEnlargement?: boolean },
  ): SharpInstance
  jpeg(options?: { quality?: number }): SharpInstance
  png(options?: {
    compressionLevel?: number
    palette?: boolean
    colors?: number
  }): SharpInstance
  webp(options?: { quality?: number }): SharpInstance
  toBuffer(): Promise<Buffer>
}

export type SharpFunction = (input: Buffer) => SharpInstance

type SharpCreatorOptions = {
  create: {
    width: number
    height: number
    channels: 3 | 4
    background: { r: number; g: number; b: number }
  }
}

type SharpCreator = (options: SharpCreatorOptions) => SharpInstance

let imageProcessorModule: { default: SharpFunction } | null = null
let imageCreatorModule: { default: SharpCreator } | null = null

export async function getImageProcessor(): Promise<SharpFunction> {
  if (imageProcessorModule) {
    return imageProcessorModule.default
  }

  if (isInBundledMode()) {
    // Try to load the native image processor first
    try {
      // Use the native image processor module
      const imageProcessor = await import('image-processor-napi')
      const sharp = imageProcessor.sharp || imageProcessor.default
      imageProcessorModule = { default: sharp }
      return sharp
    } catch {
      // Fall back to sharp if native module is not available
      // biome-ignore lint/suspicious/noConsole: intentional warning
      console.warn(
        'Native image processor not available, falling back to sharp',
      )
    }
  }

  // Use sharp for non-bundled builds or as fallback.
  // Single structural cast: our SharpFunction is a subset of sharp's actual type surface.
  const imported = (await import(
    'sharp'
  )) as unknown as MaybeDefault<SharpFunction>
  const sharp = unwrapDefault(imported)
  imageProcessorModule = { default: sharp }
  return sharp
}

/**
 * Get image creator for generating new images from scratch.
 * Note: image-processor-napi doesn't support image creation,
 * so this always uses sharp directly.
 */
export async function getImageCreator(): Promise<SharpCreator> {
  if (imageCreatorModule) {
    return imageCreatorModule.default
  }

  const imported = (await import(
    'sharp'
  )) as unknown as MaybeDefault<SharpCreator>
  const sharp = unwrapDefault(imported)
  imageCreatorModule = { default: sharp }
  return sharp
}

// Dynamic import shape varies by module interop mode — ESM yields { default: fn }, CJS yields fn directly.
type MaybeDefault<T> = T | { default: T }

function unwrapDefault<T extends (...args: never[]) => unknown>(
  mod: MaybeDefault<T>,
): T {
  return typeof mod === 'function' ? mod : mod.default
}
