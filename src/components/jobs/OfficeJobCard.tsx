import type { Job } from '@/domain/job/types'
import { ImageCompare } from '@/components/Preview/Compare/ImageCompare'
import { formatSize } from '@/shared/utils/format'

export function OfficeJobCard({ job }: { job: Job }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h3 className="font-bold mb-2">{job.input.name}</h3>

      <p className="text-sm mb-4">
        {formatSize(job.originalSize)} →{' '}
        {formatSize(
          job.outputs?.reduce((s, o) => s + o.size, 0) ?? 0,
        )}
      </p>

      <div className="space-y-6">
        {job.officeImages?.map((img) => (
          <div key={img.path}>
            <p className="text-xs text-gray-500 mb-1">{img.path}</p>

            {img.afterUrl && (
              <ImageCompare
                before={img.beforeUrl}
                after={img.afterUrl}
              />
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
