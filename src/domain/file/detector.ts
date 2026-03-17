import type { Processor } from './types'
import { imageProcessor } from '@/processors/image'
import { videoProcessor } from '@/processors/video'

export const processors: Processor[] = [imageProcessor, videoProcessor]

export function detectProcessor(file: File): Processor | undefined {
  return processors.find((p) => p.accepts(file))
}