import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import JSZip from 'jszip'

import type { Job } from '@/domain/job/types'
import { detectProcessor, getProcessorById } from '@/domain/processor/detect'
import { formatSize } from '@/shared/utils/format'

import ImageCompareModal from '@/components/Preview/Compare/ImageCompareModal'
import { JobCard } from '@/components/jobs/JobCard'

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

  /**
   * 最新タスクのみ実行:
   * jobIdごとに token を持ち、enqueue される度に token を更新。
   * compressOne は開始前/終了後に token を確認し、古ければ反映しない。
   */
  const latestTokenRef = useRef<Map<string, string>>(new Map())
  const runningRef = useRef<Map<string, boolean>>(new Map())

  const enqueueLatest = useCallback((jobId: string) => {
    const token = crypto.randomUUID()
    latestTokenRef.current.set(jobId, token)
    return token
  }, [])

  const compressOne = useCallback(
    async (jobId: string, token?: string) => {
      const job = jobs.find((j) => j.id === jobId)
      if (!job) return

      const currentToken = latestTokenRef.current.get(jobId)
      if (token && currentToken && token !== currentToken) return

      // 既に走っているなら「最新tokenが残る」だけ。完了時に再実行される。
      if (runningRef.current.get(jobId)) return
      runningRef.current.set(jobId, true)

      const processor = getProcessorById(job.processorId)
      if (!processor) {
        runningRef.current.set(jobId, false)
        return
      }

      updateJob(jobId, { status: 'processing', progress: 0, error: undefined })

      try {
        const res = await processor.process(job.input, job.settings, {
          onProgress: (p) => {
            // 古いtokenなら進捗も反映しない
            const t = latestTokenRef.current.get(jobId)
            if (token && t && token !== t) return
            updateJob(jobId, { progress: p, status: 'processing' })
          },
        })

        const tAfter = latestTokenRef.current.get(jobId)
        if (token && tAfter && token !== tAfter) {
          // 古い結果は捨てる
          return
        }

        const outputs = res.outputs.map((o) => ({
          name: o.name,
          blob: o.blob,
          mime: o.mime,
          size: o.blob.size,
          url: URL.createObjectURL(o.blob),
        }))

        updateJob(jobId, { outputs, status: 'done', progress: 100 })
      } catch (e) {
        const tAfter = latestTokenRef.current.get(jobId)
        if (token && tAfter && token !== tAfter) return

        updateJob(jobId, {
          status: 'error',
          error: e instanceof Error ? e.message : String(e),
        })
      } finally {
        runningRef.current.set(jobId, false)

        // 実行中にさらに enqueueLatest されて token が変わっていたら、最新でもう一回
        const latest = latestTokenRef.current.get(jobId)
        if (latest && token && latest !== token) {
          // 最新で再実行
          compressOne(jobId, latest)
        }
      }
    },
    [jobs, updateJob],
  )

  // 画像カードから呼ぶ（debounce済）。常に「最新token」で再圧縮依頼。
  const onRecompressLatest = useCallback(
    (jobId: string) => {
      const token = enqueueLatest(jobId)
      compressOne(jobId, token)
    },
    [enqueueLatest, compressOne],
  )

  // 動画（ボタン）など、明示的に即実行したい時
  const onRecompress = useCallback(
    (jobId: string) => {
      const token = enqueueLatest(jobId)
      compressOne(jobId, token)
    },
    [enqueueLatest, compressOne],
  )

  const onChangeSettings = useCallback((jobId: string, patch: Record<string, unknown>) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, settings: { ...j.settings, ...patch }, status: 'waiting' }
          : j,
      ),
    )
  }, [])

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
          // compressAll は逐次でも「最新token」を入れて実行
          const token = enqueueLatest(job.id)
          await compressOne(job.id, token)
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
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onChangeSettings={onChangeSettings}
              onRecompress={onRecompress}
              onRecompressLatest={onRecompressLatest}
              onOpenImageModal={openModal}
            />
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