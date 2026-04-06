import JSZip from 'jszip'

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

async function compressImage(blob: Blob, keepPng: boolean) {
  const img = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  return keepPng
    ? canvas.convertToBlob({ type: 'image/png' })
    : canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 })
}

export async function compressOffice(
  file: File,
  onProgress?: (p: number) => void,
) {
  const zip = await JSZip.loadAsync(file)

  const entries = Object.entries(zip.files).filter(
    ([path]) => path.includes('/media/') && isImage(path),
  )

  const officeImages: any[] = []

  let done = 0

  for (const [path, entry] of entries) {
    const blob = await entry.async('blob')

    const isPng = path.toLowerCase().endsWith('.png')
    const alpha = isPng ? await hasAlpha(blob) : false

    const compressed = await compressImage(blob, alpha)

    zip.file(path, compressed)

    officeImages.push({
      path,
      beforeUrl: URL.createObjectURL(blob),
      afterUrl: URL.createObjectURL(compressed),
      originalSize: blob.size,
      compressedSize: compressed.size,
    })

    done++
    onProgress?.((done / entries.length) * 100)
  }

  const outBlob = await zip.generateAsync({ type: 'blob' })

  return { outBlob, officeImages }
}
