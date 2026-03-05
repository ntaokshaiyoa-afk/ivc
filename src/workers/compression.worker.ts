import { encodeJpeg } from "../codecs/mozjpeg"
import { encodePng } from "../codecs/oxipng"
import { encodeWebp } from "../codecs/webp"
import { encodeAvif } from "../codecs/avif"

self.onmessage = async (e) => {

  const { file, quality, format } = e.data

  const bitmap = await createImageBitmap(file)

  const canvas = new OffscreenCanvas(
    bitmap.width,
    bitmap.height
  )

  const ctx = canvas.getContext("2d")

  ctx.drawImage(bitmap,0,0)

  const imageData = ctx.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
  )

  let blob

  switch(format){

    case "png":
      blob = await encodePng(imageData)
      break

    case "webp":
      blob = await encodeWebp(imageData,quality)
      break

    case "avif":
      blob = await encodeAvif(imageData,quality)
      break

    default:
      blob = await encodeJpeg(imageData,quality)
  }

  self.postMessage(blob)
}
