import { encode as encodePng } from '@jsquash/png'
import { optimise as optimisePng } from '@jsquash/oxipng'
import { encode as encodeJpeg } from '@jsquash/jpeg'
import { encode as encodeWebp } from '@jsquash/webp'
import { encode as encodeAVIF } from '@jsquash/avif'

self.onmessage = async (e) => {
  const { file, quality, codec } = e.data

  const bitmap = await createImageBitmap(file)

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')

  ctx.drawImage(bitmap, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  let encodedBuffer

  if (codec === 'jpeg') {
    encodedBuffer = await encodeJpeg(imageData, {
      quality: Math.round(quality * 100),
      progressive: true,
      optimize_coding: true,
      chroma_subsample: 2,
    })
  }

  if (codec === 'webp') {
    encodedBuffer = await encodeWebp(imageData, {
      quality: quality * 100,
    })
  }

  if (codec === 'avif') {
    encodedBuffer = await encodeAVIF(imageData, {
      quality: quality * 100,
    })
  }

  if (codec === 'png') {
    const encoded = await encodePng(imageData)

    const optimized = await optimisePng(encoded, {
      level: 3,
    })

    encodedBuffer = optimized
  }

  if (codec === 'webp-lossless') {
    const encoded = await encodePng(imageData)

    const optimized = await optimisePng(encoded, {
      level: 3,
    })
    encodedBuffer = await encodeWebp(optimized, {
      lossless: 1,
      quality: 100,
    })
  }

  const blob = new Blob([encodedBuffer], {
    type: `image/${codec}`,
  })

  self.postMessage(blob)
}
