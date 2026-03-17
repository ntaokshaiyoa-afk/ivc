// compression.worker.ts
import { encode as encodeJpeg } from '@jsquash/jpeg'
import { encode as encodeWebp } from '@jsquash/webp'
import { encode as encodeAVIF } from '@jsquash/avif'
import { encode as encodePng } from '@jsquash/png'

// optimisePng を使っているならそれも
import { optimise } from '@jsquash/oxipng' // ←あなたの実装の実パスに合わせる

self.onmessage = async (e) => {
  try {
    const { file, quality, codec } = e.data as {
      file: File
      quality: number
      codec: string
    }

    const bitmap = await createImageBitmap(file)
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2d context')

    ctx.drawImage(bitmap, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    let encodedBuffer: Uint8Array | ArrayBuffer

    if (codec === 'jpeg') {
      encodedBuffer = await encodeJpeg(imageData, {
        quality: Math.round(quality * 100),
        progressive: true,
        optimize_coding: true,
        chroma_subsample: 2,
      })
    } else if (codec === 'webp') {
      encodedBuffer = await encodeWebp(imageData, { quality: quality * 100 })
    } else if (codec === 'avif') {
      encodedBuffer = await encodeAVIF(imageData, { quality: quality * 100 })
    } else if (codec === 'png') {
      const encoded = await encodePng(imageData)
      encodedBuffer = await optimise(encoded, { level: 3 })
    } else if (codec === 'webp-lossless') {
      encodedBuffer = await encodeWebp(imageData, { lossless: 1, quality: 100 })
    } else {
      throw new Error(`Unsupported codec: ${codec}`)
    }

    const mime =
      codec === 'webp-lossless'
        ? 'image/webp'
        : codec === 'jpeg'
          ? 'image/jpeg'
          : codec === 'png'
            ? 'image/png'
            : codec === 'avif'
              ? 'image/avif'
              : codec === 'webp'
                ? 'image/webp'
                : `image/${codec}`

    const blob = new Blob([encodedBuffer], { type: mime })
    self.postMessage({ ok: true, blob })
  } catch (err) {
    self.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
