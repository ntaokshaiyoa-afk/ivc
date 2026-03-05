import { optimise } from "@jsquash/oxipng"

export async function encodeOxiPNG(buffer: ArrayBuffer) {

  const result = await optimise(buffer, {
    level: 3
  })

  return result
}
