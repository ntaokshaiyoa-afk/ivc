import { compressImageWorker } from './compressionWorker'

export async function compressImage(
  file: File,
  quality: number,
  codec: string
) {
  return compressImageWorker(file, quality, codec)
}
