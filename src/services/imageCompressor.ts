import { compressImageWorker }
from "./compressionWorker"

import { detectFormat }
from "./compressionRouter"

export async function compressImage(
  file: File,
  quality: number
) {

  const format = detectFormat(file)

  return compressImageWorker(
    file,
    quality,
    format
  )
}
