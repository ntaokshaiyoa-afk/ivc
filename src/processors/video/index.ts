import type { Processor } from '@/domain/processor/types'
import { compressVideo } from './videoCompressor'

export const videoProcessor: Processor = {
  id: 'video',
  label: 'Video',
  kind: 'video',
  accepts: (file) => file.type.startsWith('video/'),
  getDefaultSettings: () => ({ codec: 'h264', quality: 28 }), // CRF相当
  process: async (file, settings, ctx) => {
    const { codec, quality } = settings as {
      codec: 'h264' | 'vp9' | 'av1'
      quality: number
    }
    ctx.onProgress?.(0)
    const out = await compressVideo(file, codec, quality, ctx.onProgress)
    ctx.onProgress?.(100)
    return { outputs: [{ name: out.name, blob: out, mime: out.type }] }
  },
}
