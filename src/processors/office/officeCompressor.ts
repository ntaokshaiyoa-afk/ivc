import JSZip from 'jszip'
import { optimise } from '@jsquash/oxipng'
import type { OfficeImage, OfficeOverrides } from '@/domain/processor/types'

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

function replaceExt(path: string, ext: string) {
  return path.replace(/\.(png|jpe?g)$/i, '.' + ext)
}

async function updateXmlReferences(
  zip: JSZip,
  oldPath: string,
  newPath: string,
  format: string,
) {
  const files = Object.keys(zip.files)

  for (const p of files) {
    if (!p.endsWith('.xml') && !p.endsWith('.rels')) continue

    const f = zip.file(p)
    if (!f) continue

    let text = await f.async('text')

    if (text.includes(oldPath)) {
      text = text.replaceAll(oldPath, newPath)
      zip.file(p, text)
    }
  }

  // ContentTypes更新
  const ct = zip.file('[Content_Types].xml')
  if (!ct) return

  let xml = await ct.async('text')

  xml = xml.replaceAll(oldPath.split('/').pop()!, newPath.split('/').pop()!)

  if (format === 'jpeg') {
    if (!xml.includes('image/jpeg')) {
      xml += '<Default Extension="jpeg" ContentType="image/jpeg"/>'
    }
  }

  if (format === 'png') {
    if (!xml.includes('image/png')) {
      xml += '<Default Extension="png" ContentType="image/png"/>'
    }
  }

  zip.file('[Content_Types].xml', xml)
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
  autoOverrides: OfficeOverrides = {}, // ★追加
) {
  const zip = await JSZip.loadAsync(file)
  const officeImages: OfficeImage[] = []
  const nextAutoOverrides: OfficeOverrides = { ...autoOverrides }

  const entries = Object.entries(zip.files).filter(
    ([path]) => path.includes('/media/') && isImage(path),
  )

  let done = 0

  for (const [path, entry] of entries) {
    const blob = await entry.async('blob')

    const isPng = path.toLowerCase().endsWith('.png')
    const alpha = isPng ? await hasAlpha(blob) : false

    const manual = overrides[path]
    const auto = autoOverrides[path]

    let format: 'jpeg' | 'png'
    let quality = 0.7
    let finalBlob: Blob

    // ===== manual優先 =====
    if (manual?.manual) {
      format = manual.format
      quality = manual.quality ?? 0.7

      finalBlob = await compressImage(blob, format, quality)

      if (finalBlob.size >= blob.size) {
        finalBlob = blob
        format = isPng ? 'png' : 'jpeg'
      }
    } else {
      // ===== Auto処理 =====

      // 既にAuto結果があればそれを使う
      if (auto) {
        format = auto.format
        quality = auto.quality
        finalBlob = await compressImage(blob, format, quality)
      } else {
        // 初回のみ計算
        if (alpha) {
          format = 'png'
          quality = 1
          finalBlob = await compressImage(blob, 'png', 1)
        } else {
          const jpegBlob = await compressImage(blob, 'jpeg', 0.7)
          const pngBlob = await compressImage(blob, 'png', 1)

          if (jpegBlob.size <= pngBlob.size) {
            finalBlob = jpegBlob
            format = 'jpeg'
            quality = 0.7
          } else {
            finalBlob = pngBlob
            format = 'png'
            quality = 1
          }

          if (finalBlob.size >= blob.size) {
            finalBlob = blob
            format = isPng ? 'png' : 'jpeg'
          }
        }

        // ★Auto結果保存（初回のみ）
        nextAutoOverrides[path] = { format, quality }
      }
    }

    const newPath = replaceExt(path, format)

    if (newPath !== path) {
      zip.remove(path)
      zip.file(newPath, finalBlob)

      await updateXmlReferences(zip, path, newPath, format)
    } else {
      zip.file(path, finalBlob)
    }

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

  return {
    outBlob,
    officeImages,
    autoOverrides: nextAutoOverrides, // ★返す
  }
}
