import type { Job } from '@/domain/job/types'
import type {
  OfficeImageFormat,
  OfficeSettings,
} from '@/domain/processor/types'

import { ImageCompare } from '@/components/Preview/Compare/ImageCompare'
import { formatSize } from '@/shared/utils/format'

type Props = {
  job: Job
  onChangeSettings: (jobId: string, patch: Record<string, unknown>) => void
  onRecompress: (jobId: string) => void
}

export function OfficeJobCard({ job, onChangeSettings, onRecompress }: Props) {
  const settings = job.settings as OfficeSettings

  const updateOverride = (
    path: string,
    patch: Partial<{ format: OfficeImageFormat; quality: number }>,
  ) => {
    const current = settings.overrides[path] ?? {
      format: 'jpeg',
      quality: 0.7,
    }

    onChangeSettings(job.id, {
      overrides: {
        ...settings.overrides,
        [path]: {
          ...current,
          ...patch,
          manual: true,
        },
      },
    })
  }

  const totalImageOriginal =
    job.officeImages?.reduce((s, i) => s + i.originalSize, 0) ?? 0

  const totalImageCompressed =
    job.officeImages?.reduce((s, i) => s + (i.compressedSize ?? 0), 0) ?? 0

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h3 className="font-bold mb-2">{job.input.name}</h3>

      <div className="text-xs text-gray-500">
        画像合計: {formatSize(totalImageOriginal)} →{' '}
        {formatSize(totalImageCompressed)}
      </div>

      <div className="space-y-6">
        {job.officeImages?.map((img) => {
          const override = settings.overrides[img.path] ?? {
            format: 'jpeg',
            quality: 0.7,
          }

          const saved =
            (img.compressedSize ?? img.originalSize) - img.originalSize

          return (
            <div key={img.path}>
              <p className="text-xs text-gray-500 mb-1">{img.path}</p>

              <p className="text-xs mt-1 text-gray-500">
                {formatSize(img.originalSize)} →{' '}
                {formatSize(img.compressedSize ?? 0)}(サイズ:{' '}
                {formatSize(saved)})
              </p>
              {img.skipped && (
                <p className="text-xs text-yellow-500">
                  ※ 圧縮するとサイズが増えるためスキップ
                </p>
              )}
              {/* フォーマット選択 */}
              <select
                value={override.format}
                onChange={(e) =>
                  updateOverride(img.path, {
                    format: e.target.value as OfficeImageFormat,
                  })
                }
              >
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>

              {/* 品質 */}
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={override.quality}
                onChange={(e) =>
                  updateOverride(img.path, {
                    quality: Number(e.target.value),
                  })
                }
              />

              <button
                onClick={() => {
                  const next = { ...settings.overrides }
                  delete next[img.path]

                  onChangeSettings(job.id, { overrides: next })

                  // ★ 自動再圧縮
                  onRecompress(job.id)
                }}
                className="ml-2 px-2 py-1 text-xs rounded 
             bg-gray-200 hover:bg-gray-300 
             text-gray-800 
             dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
              >
                AUTOに戻す
              </button>
              {!override?.manual && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                  AUTO
                </span>
              )}
              {/* 再圧縮 */}
              <button
                onClick={() => onRecompress(job.id)}
                disabled={job.status === 'processing'}
                className="ml-2 px-3 py-1 rounded text-white flex items-center gap-2
    bg-blue-500 disabled:bg-gray-400"
              >
                {job.status === 'processing' ? (
                  <>
                    <ProgressDonut progress={job.progress} />
                    処理中
                  </>
                ) : (
                  '再圧縮'
                )}
              </button>

              {img.afterUrl && (
                <ImageCompare before={img.beforeUrl} after={img.afterUrl} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProgressDonut({ progress }: { progress: number }) {
  const radius = 10
  const stroke = 3
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <svg height={radius * 2} width={radius * 2} className="-rotate-90">
      <circle
        stroke="#e5e7eb"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <circle
        stroke="#ffffff"
        fill="transparent"
        strokeWidth={stroke}
        strokeDasharray={circumference + ' ' + circumference}
        style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.2s' }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
    </svg>
  )
}
