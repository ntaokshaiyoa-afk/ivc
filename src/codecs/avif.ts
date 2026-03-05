import { encode } from "@jsquash/avif";

export async function encodeAVIF(data: ImageData) {

  const result = await encode(data, {
    quality: 40
  });

  return result;
}
