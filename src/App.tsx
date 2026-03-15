import { useState, useEffect, useRef, useCallback } from 'react'
import { compressImage } from './services/imageCompressor'
import {} from import { ImageCompareModal } from './components/ImageCompareModal'
import JSZip from 'jszip'

type FileItem = {
  id: string
  file: File
  previewUrl: string
  compressedUrl?: string
  originalSize: number
  compressedSize?: number

  status: 'waiting' | 'processing' | 'done'
  progress: number

  quality: number
  codec: string
}

function App() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [quality, setQuality] = useState(0.7)
  const [isProcessing, setIsProcessing] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalBefore, setModalBefore] = useState<string | null>(null)
  const [modalAfter, setModalAfter] = useState<string | null>(null)

  const openModal = (before: string, after: string) => {
    setModalBefore(before)
    setModalAfter(after)
    setModalOpen(true)
  }
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // 保存済み設定があれば優先
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') return true
    if (saved === 'light') return false

    // 無ければOS設定を使用
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const IMAGE_CODECS = [
    { value: 'jpeg', label: 'JPEG (MozJPEG)' },
    { value: 'webp', label: 'WebP' },
    { value: 'avif', label: 'AVIF' },
    { value: 'png', label: 'PNG (oxipng)' },
    { value: 'webp-lossless', label: 'WebP Lossless' },
  ]

  const VIDEO_CODECS = [
    { value: 'h264', label: 'H264' },
    { value: 'vp9', label: 'VP9' },
    { value: 'av1', label: 'AV1' },
  ]

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return

    const list = Array.from(selected)
      .filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
      .map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        previewUrl: URL.createObjectURL(f),
        originalSize: f.size,
        status: 'waiting' as const,
        progress: 0,
        quality: 0.7,
        codec: f.type.startsWith('image/') ? 'jpeg' : 'h264',
      }))

    setFiles((prev) => [...prev, ...list])
  }

  const changeQuality = (id: string, value: number) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, quality: value, status: 'waiting' } : f,
      ),
    )
  }

  const changeCodec = (id: string, codec: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, codec, status: 'waiting' } : f)),
    )
  }

  const recompressImage = useCallback(async (item: FileItem) => {
    updateStatus(item.id, 'processing', 0)

    const compressed = await compressImage(item.file, item.quality, item.codec)

    updateResult(item.id, compressed)
  }, [])

  const compressAll = async () => {
    setIsProcessing(true)

    const pendingFiles = files.filter((f) => f.status !== 'done')

    const concurrency = 2
    const queue = [...pendingFiles]

    const workers = Array(concurrency)
      .fill(null)
      .map(async () => {
        while (queue.length > 0) {
          const item = queue.shift()
          if (!item) break

          updateStatus(item.id, 'processing', 0)

          if (item.file.type.startsWith('video/')) {
            const { compressVideo } = await import('./services/videoCompressor')

            const compressed = await compressVideo(item.file, (progress) =>
              updateStatus(item.id, 'processing', progress),
            )

            updateResult(item.id, compressed)
          } else {
            const compressed = await compressImage(
              item.file,
              item.quality,
              item.codec,
            )
            updateResult(item.id, compressed)
          }
        }
      })

    await Promise.all(workers)
    setIsProcessing(false)
  }

  const updateStatus = (
    id: string,
    status: FileItem['status'],
    progress: number,
  ) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status, progress } : f)),
    )
  }

  const updateResult = (id: string, file: File) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              compressedUrl: URL.createObjectURL(file),
              compressedSize: file.size,
              status: 'done',
              progress: 100,
            }
          : f,
      ),
    )
  }

  const calcReduction = (orig: number, comp?: number) => {
    if (!comp) return ''
    const rate = ((orig - comp) / orig) * 100
    return `-${rate.toFixed(1)}%`
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }
  const totalOriginal = files.reduce((sum, f) => sum + f.originalSize, 0)

  const totalCompressed = files.reduce(
    (sum, f) => sum + (f.compressedSize ?? 0),
    0,
  )

  const totalSaved = totalOriginal - totalCompressed

  const downloadZip = async () => {
    const zip = new JSZip()

    const completedFiles = files.filter((f) => f.compressedUrl)

    for (const item of completedFiles) {
      const response = await fetch(item.compressedUrl!)
      const blob = await response.blob()
      zip.file(`compressed_${item.file.name}`, blob)
    }

    const content = await zip.generateAsync({
      type: 'blob',
    })

    const url = URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = 'compressed_files.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  const isVideo = (file: File) => file.type.startsWith('video/')

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  useEffect(() => {
    files.forEach((item) => {
      if (item.file.type.startsWith('image/') && item.status === 'waiting') {
        recompressImage(item)
      }
    })
  }, [files, recompressImage])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const listener = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('theme')
      if (!saved) {
        setDarkMode(e.matches)
      }
    }

    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-8 py-10">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
            Image & Video Compressor
          </h1>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-4 py-2 rounded-xl bg-gray-800 text-white dark:bg-yellow-400 dark:text-black font-semibold"
          >
            {darkMode ? '☀ Light' : '🌙 Dark'}
          </button>
        </div>

        {/* コントロール */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg mb-10 transition-colors">
          <div className="grid md:grid-cols-3 gap-6 items-end">
            <div className="md:col-span-2">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => handleFiles(e.target.files)}
                className="block w-full text-sm
                file:mr-4 file:py-3 file:px-6
                file:rounded-xl file:border-0
                file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700"
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                品質: {(quality * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex gap-6 mt-6">
            <button
              onClick={compressAll}
              disabled={isProcessing || files.length === 0}
              className="px-8 py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50"
            >
              圧縮開始
            </button>

            <button
              onClick={downloadZip}
              disabled={files.filter((f) => f.compressedUrl).length === 0}
              className="px-8 py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50"
            >
              ZIPダウンロード
            </button>
          </div>
          <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
            総サイズ：
            {formatSize(totalOriginal)} →{formatSize(totalCompressed)}
            <span className="font-semibold text-green-600">
              -{formatSize(totalSaved)}
            </span>
          </div>
        </div>

        {/* ファイル一覧 */}
        <div className="space-y-8">
          {files.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg transition-colors"
            >
              <div className="flex justify-end mb-2">
                {item.compressedUrl && (
                  <button
                    onClick={() =>
                      openModal(item.previewUrl, item.compressedUrl)
                    }
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg"
                  >
                    拡大表示
                  </button>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                {/* codec */}
                <select
                  value={item.codec}
                  onChange={(e) => changeCodec(item.id, e.target.value)}
                  className="p-2 rounded border"
                >
                  {(isVideo(item.file) ? VIDEO_CODECS : IMAGE_CODECS).map(
                    (c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ),
                  )}
                </select>

                {/* quality */}
                {!isVideo(item.file) && (
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={item.quality}
                    onChange={(e) =>
                      changeQuality(item.id, Number(e.target.value))
                    }
                  />
                )}
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">
                {item.file.name}
              </h3>

              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {formatSize(item.originalSize)} →
                {item.compressedSize ? formatSize(item.compressedSize) : '-'}{' '}
                {item.compressedSize && (
                  <span className="text-green-600 font-semibold">
                    ({calcReduction(item.originalSize, item.compressedSize)})
                  </span>
                )}
              </p>

              <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-6">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${item.progress}%` }}
                />
              </div>

              {item.compressedUrl ? (
                isVideo(item.file) ? (
                  <VideoCompare
                    before={item.previewUrl}
                    after={item.compressedUrl}
                  />
                ) : (
                  <ImageCompare
                    before={item.previewUrl}
                    after={item.compressedUrl}
                  />
                )
              ) : isVideo(item.file) ? (
                <video
                  src={item.previewUrl}
                  controls
                  className="w-full rounded-xl"
                />
              ) : (
                <img src={item.previewUrl} className="w-full rounded-xl" />
              )}
            </div>
          ))}
        </div>
      </div>
      {modalOpen && modalBefore && modalAfter && (
        <ImageCompareModal
          before={modalBefore}
          after={modalAfter}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}

export default App

function ImageCompare({ before, after }: { before: string; after: string }) {
  const [position, setPosition] = useState(50)

  return (
    <div className="relative w-full max-w-4xl aspect-video mx-auto overflow-hidden rounded-xl border select-none">
      {/* Before */}
      <img
        src={before}
        className="absolute inset-0 w-full h-full object-contain"
      />

      {/* After */}
      <img
        src={after}
        className="absolute w-full h-full object-contain"
        style={{
          clipPath: `inset(0 0 0 ${position}%)`,
        }}
      />

      {/* 中央ライン */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow pointer-events-none"
        style={{ left: `${position}%` }}
      />

      {/* 視覚ハンドル */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-gray-400 rounded-full shadow-lg pointer-events-none"
        style={{ left: `calc(${position}% - 12px)` }}
      />

      {/* 当たり判定拡大エリア */}
      <input
        type="range"
        min="0"
        max="100"
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
        style={{
          touchAction: 'none',
        }}
      />
    </div>
  )
}
function VideoCompare({ before, after }: { before: string; after: string }) {
  const beforeRef = useRef<HTMLVideoElement>(null)
  const afterRef = useRef<HTMLVideoElement>(null)

  const sync = (source: 'before' | 'after') => {
    const src = source === 'before' ? beforeRef.current : afterRef.current
    const target = source === 'before' ? afterRef.current : beforeRef.current

    if (!src || !target) return

    target.currentTime = src.currentTime

    if (!src.paused) target.play()
    else target.pause()
  }

  return (
    <>
      <div className="grid md:grid-cols-2 gap-6">
        <video
          ref={beforeRef}
          src={before}
          controls
          onPlay={() => sync('before')}
          onPause={() => sync('before')}
          onSeeked={() => sync('before')}
          className="w-full rounded-xl"
        />

        <video
          ref={afterRef}
          src={after}
          controls
          onPlay={() => sync('after')}
          onPause={() => sync('after')}
          onSeeked={() => sync('after')}
          className="w-full rounded-xl"
        />
      </div>
    </>
  )
}
