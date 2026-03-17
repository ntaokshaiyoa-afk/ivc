import { useEffect, useMemo, useRef } from 'react'
import type { Job } from '@/domain/job/types'
import { formatSize, calcReduction } from '@/shared/utils/format'
import { ImageCompare } from '@/components/Preview/Compare/ImageCompare'

const IMAGE_CODECS = [
  { value: 'jpeg', label: 'JPEG (MozJPEG)' },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'png', label: 'PNG (oxipng)' },
  { value: 'webp-lossless', label: 'WebP Lossless' },
]

type Props = {
  job: Job
  onChangeSettings: (jobId: string, patch: Record<string, any>) => void
  onRecompressLatest: (jobId: string) => void
  onOpenImageModal: (before: string, after: string) => void
}

export function ImageJobCard({
  job,
  onChangeSettings,
  onRecompressLatest,
  onOpenImageModal,
}: Props) {
  const firstOut = job.outputs?.[0]
  const outSize = job.outputs?.reduce((s, o) => s + o.size, 0)
  const beforeUrl = job.previewUrl
  const afterUrl = firstOut?.url

  const codec = (job.settings.codec as string) ?? 'jpeg'
  const quality = (job.settings.quality as number) ?? 0.7

  // settings の “内容” が変わったら debounce で再圧縮要求
  const settingsKey = useMemo(() => JSON.stringify({ codec, quality }), [codec, quality])

  const debounceRef = useRef<number | null>(null)
  useEffect(() => {
    // 初期ロード直後・処理中の無駄撃ちを避けたい場合はここで条件追加可能
    // if (job.status === 'processing') return

    if (debounceRef.current) window.clearTimeout(debounceRef.current)

    debounceRef.current = window.setTimeout(() => {
      onRecompressLatest(job.id) // 最新タスクのみ実行（App側で担保）
    }, 250)

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsKey, job.id])

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg transition-colors">
      <div className="flex justify-end mb-2">
        {afterUrl && (
          <button
            onClick={() => onOpenImageModal(beforeUrl, afterUrl)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg"
          >
            拡大表示
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <select
          value={codec}
          onChange={(e) => onChangeSettings(job.id, { codec: e.target.value })}
          className="p-2 rounded border"
        >
          {IMAGE_CODECS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={quality}
            onChange={(e) => onChangeSettings(job.id, { quality: Number(e.target.value) })}
            className="w-full"
          />
          <span className="text-sm w-12 text-right">{quality.toFixed(2)}</span>
        </div>
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

      {afterUrl ? (
        <ImageCompare before={beforeUrl} after={afterUrl} />
      ) : (
        <img src={beforeUrl} className="w-full rounded-xl" />
      )}

      {job.status === 'error' && <p className="mt-4 text-red-600">{job.error}</p>}
    </div>
  )
}