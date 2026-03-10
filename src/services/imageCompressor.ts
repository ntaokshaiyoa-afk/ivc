import { compressImageWorker } from './compressionWorker'

import { detectFormat } from './compressionRouter'

export async function compressImage(
  file: File,
  quality: number,
  codec: string,
) {
  const format = detectFormat(file)

  return compressImageWorker(file, quality, format)
}
