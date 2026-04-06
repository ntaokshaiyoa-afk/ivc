import type { Processor } from './types'
import { imageProcessor } from '@/processors/image'
import { videoProcessor } from '@/processors/video'
import { officeProcessor } from '@/processors/office'

export const processors: Processor[] = [
  imageProcessor,
  videoProcessor,
  officeProcessor,
]

export function detectProcessor(file: File): Processor | undefined {
  return processors.find((p) => p.accepts(file))
}

export function getProcessorById(id: string): Processor | undefined {
  return processors.find((p) => p.id === id)
}
