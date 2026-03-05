import { oxipng } from "@jsquash/oxipng";

export async function encodeOxiPNG(data: ImageData) {
  const result = await oxipng(data, {
    level: 2
  });

  return result;
}
