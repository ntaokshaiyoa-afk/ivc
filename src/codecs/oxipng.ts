import { encode } from "@jsquash/oxipng"

export async function encodePng(
  imageData: ImageData
) {

  const data = await encode(imageData)

  return new Blob([data], {
    type: "image/png"
  })
}
