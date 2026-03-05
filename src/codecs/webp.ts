import { encode } from "@jsquash/webp"

export async function encodeWebp(
  imageData: ImageData,
  quality: number
) {

  const data = await encode(imageData, {
    quality: quality * 100
  })

  return new Blob([data], {
    type: "image/webp"
  })
}
