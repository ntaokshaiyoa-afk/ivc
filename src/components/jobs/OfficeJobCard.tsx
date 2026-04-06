import type { Job } from '@/domain/job/types'
import { ImageCompare } from '@/components/Preview/Compare/ImageCompare'
import { formatSize } from '@/shared/utils/format'

export function OfficeJobCard({ job }: { job: Job }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h3 className="font-bold mb-2">{job.input.name}</h3>
      <select
        value={img.format}
        onChange={(e) => {
          img.format = e.target.value as any
        }}
      >
        <option value="jpeg">JPEG</option>
        <option value="png">PNG</option>
        <option value="webp">WebP</option>
      </select>

      <input
        type="range"
        min={0.1}
        max={1}
        step={0.05}
        value={img.quality}
        onChange={(e) => {
          img.quality = Number(e.target.value)
        }}
      />

      <button
        onClick={() => {
          onRecompress(job.id)
        }}
      >
        再圧縮
      </button>
      <p className="text-sm mb-4">
        {formatSize(job.originalSize)} →{' '}
        {formatSize(job.outputs?.reduce((s, o) => s + o.size, 0) ?? 0)}
      </p>

      <div className="space-y-6">
        {job.officeImages?.map((img) => (
          <div key={img.path}>
            <p className="text-xs text-gray-500 mb-1">{img.path}</p>

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
