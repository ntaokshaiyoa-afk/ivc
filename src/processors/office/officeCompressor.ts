import JSZip from 'jszip'
import { optimise } from '@jsquash/oxipng'
import type {
  OfficeImage,
  OfficeOverrides,
  // OfficeImageOverride,
} from '@/domain/processor/types'

function isImage(path: string) {
  return /\.(png|jpe?g)$/i.test(path)
}

async function hasAlpha(blob: Blob) {
  const bmp = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(bmp.width, bmp.height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bmp, 0, 0)

  const { data } = ctx.getImageData(0, 0, bmp.width, bmp.height)
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true
  }
  return false
}

async function compressImage(
  blob: Blob,
  format: 'jpeg' | 'png' | 'webp',
  quality: number,
) {
  const img = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  if (format === 'png') {
    const raw = await canvas.convertToBlob({ type: 'image/png' })
    const buffer = await raw.arrayBuffer()

    // ★ oxipngで最適化
    const optimised = await optimise(new Uint8Array(buffer), {
      level: 3, // 0〜6（3がバランス良）
    })

    return new Blob([optimised], { type: 'image/png' })
  }

  if (format === 'webp') {
    return canvas.convertToBlob({
      type: 'image/webp',
      quality,
    })
  }

  return canvas.convertToBlob({
    type: 'image/jpeg',
    quality,
  })
}

export async function compressOffice(
  file: File,
  onProgress?: (p: number) => void,
  overrides: OfficeOverrides = {},
) {
  const zip = await JSZip.loadAsync(file)
  const officeImages: OfficeImage[] = []
  const appliedOverrides: OfficeAppliedOverrides = {} // ★追加

  const entries = Object.entries(zip.files).filter(
    ([path]) => path.includes('/media/') && isImage(path),
  )

  if (entries.length === 0) {
    return {
      outBlob: file,
      officeImages: [],
    }
  }

  let done = 0

  for (const [path, entry] of entries) {
    const blob = await entry.async('blob')

    const isPng = path.toLowerCase().endsWith('.png')
    const alpha = isPng ? await hasAlpha(blob) : false

    let finalBlob: Blob
    let format: 'jpeg' | 'png'
    const quality = 0.7
    const override = overrides[path]

    // ===== ケース1：αあり → PNG固定 =====
    if (alpha) {
      finalBlob = await compressImage(blob, 'png', 1)
      format = 'png'
    } else if (override?.format) {
      // ★ユーザー指定優先
      finalBlob = await compressImage(
        blob,
        override.format,
        override.quality ?? 0.7,
      )
      format = override.format
    } else {
      // ===== ケース2：JPEG vs PNG 比較 =====
      const jpegBlob = await compressImage(blob, 'jpeg', quality)
      const pngBlob = await compressImage(blob, 'png', 1)

      // ★小さい方を採用
      if (jpegBlob.size <= pngBlob.size) {
        finalBlob = jpegBlob
        format = 'jpeg'
      } else {
        finalBlob = pngBlob
        format = 'png'
      }

      // ★元より大きいなら元を採用
      if (finalBlob.size >= blob.size) {
        finalBlob = blob
        // TODO: 元のフォーマットをformatに代入
      }

      appliedOverrides[path] = {
  format,
  quality,
}
    }

    // ★ZIPに反映
    zip.file(path, finalBlob)

    officeImages.push({
      path,
      beforeUrl: URL.createObjectURL(blob),
      afterUrl: URL.createObjectURL(finalBlob),
      originalSize: blob.size,
      compressedSize: finalBlob.size,

      format,
      quality,

      skipped: finalBlob === blob,
    })

    done++
    onProgress?.((done / entries.length) * 100)
  }

  const outBlob = await zip.generateAsync({ type: 'blob' })

  console.log(overrides)

  return { outBlob, officeImages, appliedOverrides }
}
