import { encode } from "@jsquash/png"

export async function encodeOxiPNG(imageData: ImageData) {

  const result = await encode(imageData, {
quality:40
  })

  return result
}
