import { encode } from "@jsquash/avif"

export async function encodeAvif(
  imageData: ImageData,
  quality: number
) {

  const data = await encode(imageData, {
    cqLevel: Math.round((1-quality) * 63)
  })

  return new Blob([data], {
    type: "image/avif"
  })
}
