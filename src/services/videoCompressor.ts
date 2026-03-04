import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let isLoaded = false;

export async function initFFmpeg(
  onProgress?: (progress: number) => void
) {
  if (isLoaded) return;

  ffmpeg = new FFmpeg();

  // 🔥 進捗イベント
  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(Math.floor(progress * 100));
    });
  }

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

  await ffmpeg.load({
    coreURL: await toBlobURL(
      `${baseURL}/ffmpeg-core.js`,
      "text/javascript"
    ),
    wasmURL: await toBlobURL(
      `${baseURL}/ffmpeg-core.wasm`,
      "application/wasm"
    ),
  });

  isLoaded = true;
}

export async function compressVideo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  if (!ffmpeg) {
    await initFFmpeg(onProgress);
  }

  const inputName = "input.mp4";
  const outputName = "output.mp4";

  await ffmpeg!.writeFile(inputName, await fetchFile(file));

  await ffmpeg!.exec([
    "-i",
    inputName,
    "-vcodec",
    "libx264",
    "-crf",
    "28",
    "-preset",
    "veryfast",
    outputName,
  ]);

  // 🔥 ここが重要
  const data = await ffmpeg!.readFile(outputName);

  // 明示的に Uint8Array に固定
  const uint8 = new Uint8Array(data as Uint8Array);

  // Blobに変換
  const blob = new Blob([uint8.buffer], {
    type: "video/mp4",
  });

  return new File(
    [blob],
    `compressed_${file.name}`,
    { type: "video/mp4" }
  );
}
