// src/components/Preview/Compare/useImageDiff.ts

import { useEffect, useState } from 'react'

export function useImageDiff(before: string, after: string) {
  const [diffUrl, setDiffUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const img1 = new Image()
      const img2 = new Image()

      img1.src = before
      img2.src = after

      await Promise.all([
        new Promise((r) => (img1.onload = r)),
        new Promise((r) => (img2.onload = r)),
      ])

      const w = Math.max(img1.width, img2.width)
      const h = Math.max(img1.height, img2.height)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!

      // before
      ctx.drawImage(img1, 0, 0)
      const d1 = ctx.getImageData(0, 0, w, h)

      // after
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img2, 0, 0)
      const d2 = ctx.getImageData(0, 0, w, h)

      const out = ctx.createImageData(w, h)

      const threshold = 20

      for (let i = 0; i < d1.data.length; i += 4) {
        const r = Math.abs(d1.data[i] - d2.data[i])
        const g = Math.abs(d1.data[i + 1] - d2.data[i + 1])
        const b = Math.abs(d1.data[i + 2] - d2.data[i + 2])

        const diff = r + g + b

        if (diff > threshold) {
          // 赤でハイライト
          out.data[i] = 255
          out.data[i + 1] = 0
          out.data[i + 2] = 0
          out.data[i + 3] = 180
        } else {
          out.data[i + 3] = 0
        }
      }

      ctx.putImageData(out, 0, 0)

      if (!cancelled) {
        setDiffUrl(canvas.toDataURL())
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [before, after])

  return diffUrl
}
