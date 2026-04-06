import type { Processor, OfficeOverrides } from '@/domain/processor/types'
import { compressOffice } from './officeCompressor'

export const officeProcessor: Processor = {
  id: 'office',
  label: 'Office',
  kind: 'document',

  accepts: (file) => /\.(docx|pptx|xlsx)$/i.test(file.name),

  getDefaultSettings: () => ({}),

  async process(file, settings, ctx) {
    const overrides = settings.officeOverrides as OfficeOverrides | undefined

    const { outBlob, officeImages } = await compressOffice(
      file,
      ctx?.onProgress,
      overrides,
    )

    return {
      outputs: [
        {
          name: file.name,
          blob: outBlob,
          mime: file.type || 'application/octet-stream',
        },
      ],
      officeImages,
    }
  },
}
