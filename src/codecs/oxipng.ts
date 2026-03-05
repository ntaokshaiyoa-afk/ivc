import { encode } from "@jsquash/oxipng"

export async function encodeOxiPNG(imageData: ImageData) {

  const result = await encode(imageData, {
    level: 2
  })

  return result
}
