import type { Job } from '@/domain/job/types'
import { formatSize, calcReduction } from '@/shared/utils/format'
import { VideoCompare } from '@/components/Preview/Compare/VideoCompare'

const VIDEO_CODECS = [
  { value: 'h264', label: 'H264' },
  { value: 'vp9', label: 'VP9' },
  { value: 'av1', label: 'AV1' },
]

export function VideoJobCard({
  job,
  onChangeSettings,
  onRecompress,
}: {
  job: Job
  onChangeSettings: (jobId: string, patch: Record<string, unknown>) => void
  onRecompress: (job: Job) => void
}) {
  const firstOut = job.outputs?.[0]
  const outSize = job.outputs?.reduce((s, o) => s + o.size, 0)
  const beforeUrl = job.previewUrl
  const afterUrl = firstOut?.url

  const codec = (job.settings.codec as string) ?? 'h264'
  const quality = (job.settings.quality as number) ?? 28

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg transition-colors">
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <select
          value={codec}
          onChange={(e) => onChangeSettings(job.id, { codec: e.target.value })}
          className="p-2 rounded border"
        >
          {VIDEO_CODECS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min={18}
            max={40}
            step={1}
            value={quality}
            onChange={(e) =>
              onChangeSettings(job.id, { quality: Number(e.target.value) })
            }
            className="w-full"
          />
          <span className="text-sm w-12 text-right">{quality}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-2">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          {job.input.name}
        </h3>

        <button
          onClick={() => onRecompress(job)}
          disabled={job.status === 'processing'}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50"
        >
          再圧縮
        </button>
      </div>

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
        <VideoCompare before={beforeUrl} after={afterUrl} />
      ) : (
        <video src={beforeUrl} controls className="w-full rounded-xl" />
      )}

      {job.status === 'error' && (
        <p className="mt-4 text-red-600">{job.error}</p>
      )}
    </div>
  )
}
