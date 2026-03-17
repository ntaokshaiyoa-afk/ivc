import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null
let isLoaded = false

export async function initFFmpeg(onProgress?: (progress: number) => void) {
  if (isLoaded) return

  ffmpeg = new FFmpeg()

  ffmpeg.on('log', ({ level, message }) => {
    console.log(`[ffmpeg:${level}] ${message}`)
  })

  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) =>
      onProgress(Math.floor(progress * 100)),
    )
  }

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  isLoaded = true
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))
type Codec = 'h264' | 'vp9' | 'av1'

export async function compressVideo(
  file: File,
  codec: Codec,
  quality: number,
  onProgress?: (progress: number) => void,
): Promise<File> {
  if (!ffmpeg) await initFFmpeg(onProgress)
  if (!ffmpeg) throw new Error('FFmpeg not initialized')

  const q = clamp(Math.round(quality), 18, 40)
  const maxWidth = 854 // まずはここまで落とす。まだ落ちるなら 640
  const vfScale = `scale='min(${maxWidth},iw)':-2`

  const commonVideo = [
    '-vf',
    vfScale,
    '-r',
    '30', // 30fps上限（必要なら 24）
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
  ]
  const commonAudioAac = ['-c:a', 'aac', '-b:a', '96k']
  const commonAudioOpus = ['-c:a', 'libopus', '-b:a', '96k']

  let args: string[] = []
  let outExt = 'mp4'
  let outMime = 'video/mp4'

  if (codec === 'h264') {
    args = [
      ...commonVideo,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      String(q),
      ...commonAudioAac,
    ]
    outExt = 'mp4'
    outMime = 'video/mp4'
  }

  if (codec === 'vp9') {
    throw new Error(
      'この環境の ffmpeg-core は VP9 非対応です。別のコーデックを選んでください。',
    )
    args = [
      ...commonVideo,
      '-c:v',
      'libvpx-vp9',
      '-b:v',
      '0',
      '-crf',
      String(q),
      '-deadline',
      'realtime',
      '-speed',
      '8',
      '-cpu-used',
      '8',
      '-row-mt',
      '1',
      '-tile-columns',
      '2',
      ...commonAudioOpus,
    ]
    outExt = 'webm'
    outMime = 'video/webm'
  }

  if (codec === 'av1') {
    throw new Error(
      'この環境の ffmpeg-core は AV1(lib aom) 非対応です。別のコーデックを選んでください。',
    )
    args = [
      ...commonVideo,
      '-c:v',
      'libaom-av1',
      '-b:v',
      '0',
      '-crf',
      String(q),
      '-cpu-used',
      '8',
      '-row-mt',
      '1',
      '-g',
      '240',
      ...commonAudioAac,
    ]
    outExt = 'mp4'
    outMime = 'video/mp4'
  }

  const inExt = file.name.split('.').pop() || 'mp4'
  const inFile = `in.${inExt}`
  const outFile = `out.${outExt}`

  try {
    // 既存削除（あってもなくてもOK）
<<<<<<< HEAD
    try { 
      await ffmpeg.deleteFile(inFile) 
    } 
    catch (err) {
      // 削除対象が存在しない等は無視する（eslint no-empty 対応）
      console.debug('ffmpeg.deleteFile ignored:', inFile, err)
    }

    try { 
      await ffmpeg.deleteFile(outFile)
    } catch (err) {
      // 削除対象が存在しない等は無視する（eslint no-empty 対応）
      console.debug('ffmpeg.deleteFile ignored:', outFile, err)
    }
=======
    try {
      await ffmpeg.deleteFile(inFile)
    } catch {}
    try {
      await ffmpeg.deleteFile(outFile)
    } catch {}
>>>>>>> 1db1432548b2bda74ea97b1691c1601d833cf91c

    await ffmpeg.writeFile(inFile, new Uint8Array(await file.arrayBuffer()))
    try {
      await ffmpeg.exec(['-i', inFile, ...args, outFile])
    } catch (e) {
      console.error('ffmpeg exec failed:', e)
      throw e
    }

    const data = await ffmpeg.readFile(outFile) // Uint8Array
    const blob = new Blob([data], { type: outMime })

    return new File([blob], file.name.replace(/\.[^/.]+$/, `.${outExt}`), {
      type: outMime,
    })
  } finally {
<<<<<<< HEAD
    try { 
      await ffmpeg.deleteFile(inFile) 
    } catch (err) {
      // 削除対象が存在しない等は無視する（eslint no-empty 対応）
      console.debug('ffmpeg.deleteFile ignored:', inFile, err)
    }
    try { 
      await ffmpeg.deleteFile(outFile) 
    } catch (err) {
      // 削除対象が存在しない等は無視する（eslint no-empty 対応）
      console.debug('ffmpeg.deleteFile ignored:', outFile, err)
    }
=======
    try {
      await ffmpeg.deleteFile(inFile)
    } catch {}
    try {
      await ffmpeg.deleteFile(outFile)
    } catch {}
>>>>>>> 1db1432548b2bda74ea97b1691c1601d833cf91c
  }
}
