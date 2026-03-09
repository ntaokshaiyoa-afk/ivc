import { encode } from '@jsquash/avif'

export async function encodeAVIF(data: ImageData, quality: number) {
  const result = await encode(data, {
    quality: quality,
  })

  return result
}
