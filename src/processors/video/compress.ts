import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null
let isLoaded = false

export async function initFFmpeg(onProgress?: (progress: number) => void) {
  if (isLoaded) return

  ffmpeg = new FFmpeg()

  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      onProgress(Math.floor(progress * 100))
    })
  }

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  isLoaded = true
}

export async function compressVideo(
  file: File,
  codec: string, // いまは未使用（まずビルド優先）
  onProgress?: (progress: number) => void,
): Promise<File> {
  if (!ffmpeg) await initFFmpeg(onProgress)

  const inputName = 'input.mp4'
  const outputName = 'output.mp4'

  await ffmpeg!.writeFile(inputName, await fetchFile(file))

  // いったん従来通り libx264 固定（codec選択対応は次段）
  await ffmpeg!.exec([
    '-i', inputName,
    '-vcodec', 'libx264',
    '-crf', '28',
    '-preset', 'veryfast',
    outputName,
  ])

  const data = await ffmpeg!.readFile(outputName)
  const uint8 = new Uint8Array(data as Uint8Array)
  const blob = new Blob([uint8.buffer], { type: 'video/mp4' })

  return new File([blob], `compressed_${file.name}`, { type: 'video/mp4' })
}