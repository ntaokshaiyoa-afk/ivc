import { encodeJpeg } from '../codecs/mozjpeg'
import { encodeOxiPNG } from '../codecs/oxipng'
import { encodeAVIF } from '../codecs/avif'

self.onmessage = async (e) => {
  const { file, quality, codec } = e.data

  const bitmap = await createImageBitmap(file)

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Canvas context unavailable')
  }

  ctx.drawImage(bitmap, 0, 0)

  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height)

  let result

  switch (codec) {
    case 'mozjpeg':
      buffer = await encodeJpeg(imageData, quality)
      type = 'image/jpeg'
      break

    case 'webp':
      buffer = await encodeWebp(imageData, quality)
      type = 'image/webp'
      break

    case 'avif':
      buffer = await encodeAVIF(imageData, quality)
      type = 'image/avif'
      break

    case 'png':
      buffer = await encodeOxiPNG(imageData, quality)
      type = 'image/png'
      break
  }

  postMessage(result)
}
