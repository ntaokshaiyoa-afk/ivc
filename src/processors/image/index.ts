// src/processors/image/index.ts
import type { Processor } from '@/domain/processor/types'
import { compressImageInWorker } from './workerClient'

export const imageProcessor: Processor = {
  id: 'image',
  label: 'Image',
  kind: 'image',
  accepts: (file) => file.type.startsWith('image/'),
  getDefaultSettings: () => ({ quality: 0.7, codec: 'jpeg' }),
  process: async (file, settings, ctx) => {
    ctx.onProgress?.(0)
    const { quality, codec } = settings as { quality: number; codec: string }

    try {
      const blob = await compressImageInWorker(file, quality, codec)
      ctx.onProgress?.(100)

      const ext = codec === 'webp-lossless' ? 'webp' : codec
      const outName = file.name.replace(/\.\w+$/, `.${ext}`)
      return { outputs: [{ name: outName, blob, mime: blob.type }] }
    } catch (e: any) {
      // キャンセルはエラー扱いしない（必要なら進捗も戻す）
      if (e?.name === 'AbortError') return { outputs: [] }
      throw e
    }
  },
}
