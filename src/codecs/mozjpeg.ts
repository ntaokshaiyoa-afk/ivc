import { encode } from "@jsquash/mozjpeg"

export async function encodeJpeg(imageData: ImageData) {

  const result = await encode(imageData, {
    quality: 75
  })

  return result
}
