import type { Processor } from './types'
import { imageProcessor } from '@/processors/image'
import { videoProcessor } from '@/processors/video'
import { officeProcessor } from '@/processors/office'

const processors: Processor[] = [
  officeProcessor,
  imageProcessor,
  videoProcessor,
]

export function detectProcessor(file: File): Processor | null {
  return processors.find((p) => p.accepts(file)) ?? null
}

export function getProcessorById(id: string): Processor | null {
  return processors.find((p) => p.id === id) ?? null
}
