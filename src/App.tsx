import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import JSZip from 'jszip'

import type { Job } from '@/domain/job/types'
import { detectProcessor, getProcessorById } from '@/domain/processor/detect'
import { calcReduction, formatSize } from '@/shared/utils/format'

import ImageCompareModal from '@/components/Preview/Compare/ImageCompareModal'
import { ImageCompare } from '@/components/Preview/Compare/ImageCompare'
import { VideoCompare } from '@/components/Preview/Compare/VideoCompare'

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

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([])
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
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') return true
    if (saved === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const updateJob = useCallback((id: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)))
  }, [])

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return

    const next: Job[] = []
    for (const file of Array.from(selected)) {
      const p = detectProcessor(file)
      if (!p) continue

      // handleFiles 内
      console.log('input file', file, file instanceof Blob, file.type, file.size)
      const previewUrl = URL.createObjectURL(file) // ここで落ちるなら file が壊れてる
      console.log(previewUrl)
      next.push({
        id: crypto.randomUUID(),
        input: file,
        previewUrl: URL.createObjectURL(file),
        originalSize: file.size,
        status: 'waiting',
        progress: 0,
        processorId: p.id,
        settings: p.getDefaultSettings(file),
      })
    }

    setJobs((prev) => [...prev, ...next])
  }

  const compressOne = useCallback(
    async (job: Job) => {
      const processor = getProcessorById(job.processorId)
      if (!processor) return

      updateJob(job.id, { status: 'processing', progress: 0, error: undefined })

      try {
        const res = await processor.process(job.input, job.settings, {
          onProgress: (p) => updateJob(job.id, { progress: p, status: 'processing' }),
        })
        console.log('process result', res)
        console.log('first output blob', res.outputs?.[0]?.blob, res.outputs?.[0]?.blob instanceof Blob)
        const outputs = res.outputs.map((o) => ({
          name: o.name,
          blob: o.blob,
          mime: o.mime,
          size: o.blob.size,
          url: URL.createObjectURL(o.blob),
        }))

        updateJob(job.id, { outputs, status: 'done', progress: 100 })
      } catch (e) {
        updateJob(job.id, {
          status: 'error',
          error: e instanceof Error ? e.message : String(e),
        })
      }
    },
    [updateJob],
  )

  const compressAll = async () => {
    setIsProcessing(true)

    const pending = jobs.filter((j) => j.status !== 'done')
    const concurrency = 2
    const queue = [...pending]

    const workers = Array(concurrency)
      .fill(null)
      .map(async () => {
        while (queue.length > 0) {
          const job = queue.shift()
          if (!job) break
          await compressOne(job)
        }
      })

    await Promise.all(workers)
    setIsProcessing(false)
  }

  const downloadZip = async () => {
    const zip = new JSZip()
    const completed = jobs.filter((j) => j.outputs?.length)

    for (const job of completed) {
      for (const out of job.outputs!) {
        zip.file(out.name, out.blob)
      }
    }

    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = 'compressed_files.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ダークモード反映
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
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('theme')
      if (!saved) setDarkMode(e.matches)
    }
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  // totals（outputs配列前提）
  const totalOriginal = useMemo(
    () => jobs.reduce((sum, j) => sum + j.originalSize, 0),
    [jobs],
  )
  const totalCompressed = useMemo(
    () =>
      jobs.reduce((sum, j) => {
        const outSize = j.outputs?.reduce((s, o) => s + o.size, 0) ?? 0
        return sum + outSize
      }, 0),
    [jobs],
  )
  const totalSaved = totalOriginal - totalCompressed

  const isImageJob = (j: Job) => j.processorId === 'image'
  const isVideoJob = (j: Job) => j.processorId === 'video'

  const changeQuality = (id: string, value: number) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? { ...j, settings: { ...j.settings, quality: value }, status: 'waiting' }
          : j,
      ),
    )
  }

  const changeCodec = (id: string, codec: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? { ...j, settings: { ...j.settings, codec }, status: 'waiting' }
          : j,
      ),
    )
  }

  // 画像は「設定変更で自動再圧縮」だけ維持（動画は重い想定で手動）
  useEffect(() => {
    jobs.forEach((j) => {
      if (isImageJob(j) && j.status === 'waiting') compressOne(j)
    })
  }, [jobs, compressOne])

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-8 py-10">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
            Compressor
          </h1>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-4 py-2 rounded-xl bg-gray-800 text-white dark:bg-yellow-400 dark:text-black font-semibold"
          >
            {darkMode ? '☀ Light' : '🌙 Dark'}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg mb-10 transition-colors">
          <div className="grid md:grid-cols-3 gap-6 items-end">
            <div className="md:col-span-2">
              <input
                type="file"
                multiple
                // いったん従来通り。後で accept を processor から組み立ててもOK
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
          </div>

          <div className="flex gap-6 mt-6">
            <button
              onClick={compressAll}
              disabled={isProcessing || jobs.length === 0}
              className="px-8 py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50"
            >
              圧縮開始
            </button>

            <button
              onClick={downloadZip}
              disabled={jobs.filter((j) => j.outputs?.length).length === 0}
              className="px-8 py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50"
            >
              ZIPダウンロード
            </button>
          </div>

          <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
            総サイズ：{formatSize(totalOriginal)} → {formatSize(totalCompressed)}
            <span className="font-semibold text-green-600">
              -{formatSize(totalSaved)}
            </span>
          </div>
        </div>

        <div className="space-y-8">
          {jobs.map((job) => {
            const firstOut = job.outputs?.[0]
            const outSize = job.outputs?.reduce((s, o) => s + o.size, 0)
            const beforeUrl = job.previewUrl
            const afterUrl = firstOut?.url

            return (
              <div
                key={job.id}
                className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg transition-colors"
              >
                <div className="flex justify-end mb-2">
                  {afterUrl && isImageJob(job) && (
                    <button
                      onClick={() => openModal(beforeUrl, afterUrl)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg"
                    >
                      拡大表示
                    </button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {/* codec */}
                  <select
                    value={(job.settings.codec as string) ?? ''}
                    onChange={(e) => changeCodec(job.id, e.target.value)}
                    className="p-2 rounded border"
                  >
                    {(isVideoJob(job) ? VIDEO_CODECS : IMAGE_CODECS).map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  {/* quality */}
                  {isImageJob(job) && (
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={(job.settings.quality as number) ?? 0.7}
                      onChange={(e) => changeQuality(job.id, Number(e.target.value))}
                    />
                  )}
                </div>

                <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">
                  {job.input.name}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {formatSize(job.originalSize)} → {outSize ? formatSize(outSize) : '-'}{' '}
                  {outSize && (
                    <span className="text-green-600 font-semibold">
                      ({calcReduction(job.originalSize, outSize)})
                    </span>
                  )}
                </p>

                <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-6">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>

                {/* preview */}
                {afterUrl ? (
                  isVideoJob(job) ? (
                    <VideoCompare before={beforeUrl} after={afterUrl} />
                  ) : (
                    <ImageCompare before={beforeUrl} after={afterUrl} />
                  )
                ) : isVideoJob(job) ? (
                  <video src={beforeUrl} controls className="w-full rounded-xl" />
                ) : (
                  <img src={beforeUrl} className="w-full rounded-xl" />
                )}

                {job.status === 'error' && (
                  <p className="mt-4 text-red-600">{job.error}</p>
                )}
              </div>
            )
          })}
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