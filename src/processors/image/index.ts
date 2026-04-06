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
      
      // ★比較
      const finalBlob = blob.size < file.size ? blob : file
      
      ctx.onProgress?.(100)
      
      const ext = codec === 'webp-lossless' ? 'webp' : codec
      const outName = file.name.replace(/\.\w+$/, `.${ext}`)
      
      return {
        outputs: [
          {
            name: outName,
            blob: finalBlob,
            mime: finalBlob.type,
          },
        ],
      }
    } catch (e: unknown) {
      // キャンセルはエラー扱いしない（必要なら進捗も戻す）
      if (e instanceof DOMException && e.name === 'AbortError') return { outputs: [] }
      if (e instanceof Error && e.name === 'AbortError') return { outputs: [] } // 念のため
      throw e
    }
  },
}
