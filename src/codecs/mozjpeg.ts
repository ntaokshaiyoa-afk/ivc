import { encode } from "@jsquash/jpeg"

export async function encodeJpeg(
  imageData: ImageData,
  quality: number
) {

  const result = await encode(imageData, {
    quality: Math.round(quality * 100)
  })

  return result
}
