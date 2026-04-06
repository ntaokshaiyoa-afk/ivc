import type { Processor } from '@/domain/processor/types'
import type { OfficeSettings } from '@/domain/processor/types'
import { compressOffice } from './officeCompressor'

export const officeProcessor: Processor = {
  id: 'office',
  label: 'Office',
  kind: 'document',

  accepts: (file) => /\.(docx|pptx|xlsx)$/i.test(file.name),

  getDefaultSettings: () => ({
    overrides: {},
  }),

  async process(file, settings, ctx) {
    const s = settings as OfficeSettings

    const { outBlob, officeImages } = await compressOffice(
      file,
      ctx?.onProgress,
      s.overrides,
    )

    return {
      outputs: [
        {
          name: file.name,
          blob: outBlob,
          mime: file.type,
        },
      ],
      officeImages,
    }
  },
}
