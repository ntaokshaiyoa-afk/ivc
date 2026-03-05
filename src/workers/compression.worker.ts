import { encodeJpeg } from "../codecs/mozjpeg";
import { encodeOxiPNG } from "../codecs/oxipng";
import { encodeAVIF } from "../codecs/avif";

self.onmessage = async (e) => {

  const { file, format } = e.data;

  const bitmap = await createImageBitmap(file);

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  ctx.drawImage(bitmap, 0, 0);

  const imageData = ctx.getImageData(
    0,
    0,
    bitmap.width,
    bitmap.height
  );

  let result;

  if (format === "jpeg") {
    result = await encodJPEG(imageData);
  }

  if (format === "png") {
    result = await encodeOxiPNG(imageData);
  }

  if (format === "avif") {
    result = await encodeAVIF(imageData);
  }

  postMessage(result);
};
