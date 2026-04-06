import type { Job } from '@/domain/job/types'
import { ImageCompare } from '@/components/Preview/Compare/ImageCompare'
import { formatSize } from '@/shared/utils/format'
import type { OfficeImageFormat } from '@/domain/processor/types'
import type { OfficeOverrides } from '@/domain/processor/types'

type Props = {
  job: Job
  onChangeSettings: (jobId: string, patch: Record<string, unknown>) => void
  onRecompress: (jobId: string) => void
}

export function OfficeJobCard({ job, onChangeSettings, onRecompress }: Props) {
  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h3 className="font-bold mb-2">{job.input.name}</h3>

      <p className="text-sm mb-4">
        {formatSize(job.originalSize)} →{' '}
        {formatSize(job.outputs?.reduce((s, o) => s + o.size, 0) ?? 0)}
      </p>

      <div className="space-y-6">
        {job.officeImages?.map((img) => (
          <div key={img.path}>
            <p className="text-xs text-gray-500 mb-1">{img.path}</p>

            {/* ★ フォーマット選択 */}
            <select
              value={img.format ?? 'jpeg'}
              onChange={(e) => {
                const format = e.target.value as OfficeImageFormat

                onChangeSettings(job.id, {
                  officeOverrides: {
                    ...((job.settings.officeOverrides as
                      | OfficeOverrides
                      | undefined) ?? {}),
                    [img.path]: {
                      format,
                      quality: img.quality ?? 0.7,
                    },
                  },
                })
              }}
            >
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>

            {/* ★ 品質 */}
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={img.quality ?? 0.7}
              onChange={(e) => {
                const quality = Number(e.target.value)

                onChangeSettings(job.id, {
                  officeOverrides: {
                    ...((job.settings.officeOverrides as
                      | OfficeOverrides
                      | undefined) ?? {}),
                    [img.path]: {
                      format: img.format ?? 'jpeg',
                      quality,
                    },
                  },
                })
              }}
            />

            {/* ★ 再圧縮 */}
            <button
              onClick={() => onRecompress(job.id)}
              className="ml-2 px-3 py-1 bg-blue-500 text-white rounded"
            >
              再圧縮
            </button>

            {img.afterUrl && (
              <ImageCompare before={img.beforeUrl} after={img.afterUrl} />
            )}

            <p className="text-xs mt-1">
              {formatSize(img.originalSize)} →{' '}
              {formatSize(img.compressedSize ?? 0)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
