import { encode } from "@jsquash/jpeg"

export async function encodeJpeg(
  imageData: ImageData,
  quality: number
) {

  const data = await encode(imageData, {
    quality: Math.round(quality * 100)
  })

  return new Blob([data], { type: "image/jpeg" })
}
