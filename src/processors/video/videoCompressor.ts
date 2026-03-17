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
  codec: 'h264' | 'vp9' | 'av1',
  onProgress?: (progress: number) => void,
): Promise<File> {
  if (!ffmpeg) await initFFmpeg(onProgress)

  const inputName = `input_${Date.now()}.mp4`

  const { args, outExt, outMime } =
    codec === 'vp9'
      ? {
          // WebM(VP9)
          args: ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', '-row-mt', '1'],
          outExt: 'webm',
          outMime: 'video/webm',
        }
      : codec === 'av1'
        ? {
            // MP4(AV1) ※coreのビルド都合で失敗する環境もあります
            args: ['-c:v', 'libaom-av1', '-crf', '34', '-cpu-used', '6'],
            outExt: 'mp4',
            outMime: 'video/mp4',
          }
        : {
            // MP4(H264)
            args: ['-c:v', 'libx264', '-crf', '28', '-preset', 'veryfast'],
            outExt: 'mp4',
            outMime: 'video/mp4',
          }

  const outputName = `output_${Date.now()}.${outExt}`

  await ffmpeg!.writeFile(inputName, await fetchFile(file))

  await ffmpeg!.exec([
    '-i',
    inputName,
    ...args,
    // 音声はコピー（なければ無視されることが多い）
    '-c:a',
    'copy',
    outputName,
  ])

  const data = await ffmpeg!.readFile(outputName)
  const uint8 = new Uint8Array(data as Uint8Array)

  const blob = new Blob([uint8], { type: outMime })
  const outName = file.name.replace(/\.\w+$/, '') + `.${outExt}`

  return new File([blob], outName, { type: outMime })
}