import { encode } from "@jsquash/png"

export async function encodeOxiPNG(
  imageData: ImageData,
  quality: number
) {

  const result = await encode(imageData)

  return result
}
