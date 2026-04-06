import type { Processor } from '@/domain/processor/types'
import { compressOffice } from './officeCompressor'

export const officeProcessor: Processor = {
  id: 'office',
  label: 'Office',
  kind: 'document',

  accepts: (file) => /\.(docx|pptx|xlsx)$/i.test(file.name),

  getDefaultSettings: () => ({}),

  async process(file, _settings, ctx) {
    const { outBlob, officeImages } = await compressOffice(
      file,
      ctx?.onProgress,
    )

    return {
      outputs: [
        {
          name: file.name,
          blob: outBlob,
          mime: file.type,
        },
      ],
      officeImages, // ★型安全
    }
  },
}
