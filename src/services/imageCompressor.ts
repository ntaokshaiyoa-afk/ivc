import { encode } from "@jsquash/jpeg";

export async function compressImage(
  file: File,
  quality: number
): Promise<File> {

  // 1️⃣ 画像decode
  const bitmap = await createImageBitmap(file);

  // 2️⃣ Canvasへ描画
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context取得失敗");
  }

  ctx.drawImage(bitmap, 0, 0);

  // 3️⃣ ImageData取得
  const imageData = ctx.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
  );

  // 4️⃣ MozJPEG encode
  const jpegData = await encode(imageData, {
    quality: Math.round(quality * 100),
  });

  // 5️⃣ Blob生成
  const blob = new Blob([jpegData], {
    type: "image/jpeg",
  });

  // 6️⃣ Fileとして返す
  const compressedFile = new File(
    [blob],
    file.name.replace(/\.\w+$/, ".jpg"),
    {
      type: "image/jpeg",
      lastModified: Date.now(),
    }
  );

  return compressedFile;
}
