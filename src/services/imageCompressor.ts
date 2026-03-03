import imageCompression from "browser-image-compression";

export async function compressImage(
  file: File,
  quality: number
): Promise<File> {
  return await imageCompression(file, {
    maxSizeMB: 10,
    useWebWorker: true,
    initialQuality: quality,
  });
}