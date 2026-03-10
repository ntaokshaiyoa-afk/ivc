import { encode as encodePng } from '@jsquash/png'
import { encode as encodeJpeg } from '@jsquash/mozjpeg'
import { encode as encodeWebp } from '@jsquash/webp'
import { encode as encodeAVIF } from '@jsquash/avif'

self.onmessage = async (e) => {
  const { file, quality, format } = e.data

  const bitmap = await createImageBitmap(file)

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')

  ctx.drawImage(bitmap, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  let encodedBuffer

  if (format === 'mozjpeg') {
    encodedBuffer = await encodeJpeg(imageData, {
      quality: Math.round(quality * 100),
    })
  }

  if (format === 'webp') {
    encodedBuffer = await encodeWebp(imageData, {
      quality: quality * 100,
    })
  }

  if (format === 'avif') {
    encodedBuffer = await encodeAVIF(imageData, {
      quality: quality * 100,
    })
  }

  if (format === 'png') {
    encodedBuffer = await encodePng(imageData)
  }

  const blob = new Blob([encodedBuffer], {
    type: `image/${format === 'mozjpeg' ? 'jpeg' : format}`,
  })

  self.postMessage(blob)
}
