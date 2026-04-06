import type { Processor } from '@/domain/processor/types'
import { compressOffice } from './officeCompressor'

export const officeProcessor: Processor = {
  id: 'office',
  label: 'Office',
  kind: 'document',

  accepts: (file) => /\.(docx|pptx|xlsx)$/i.test(file.name),

  getDefaultSettings: () => ({}),

async process(file, settings, ctx) {
  const { outBlob, officeImages } = await compressOffice(
    file,
    ctx?.onProgress,
    (settings as any).officeOverrides,
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
