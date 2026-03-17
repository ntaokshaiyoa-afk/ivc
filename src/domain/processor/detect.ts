import type { Processor } from './types'
import { imageProcessor } from '@/processors/image'
import { videoProcessor } from '@/processors/video'

const processors: Processor[] = [imageProcessor, videoProcessor]

export function detectProcessor(file: File): Processor | null {
  return processors.find((p) => p.accepts(file)) ?? null
}

export function getProcessorById(id: string): Processor | null {
  return processors.find((p) => p.id === id) ?? null
}

// 必要なら一覧も使えるように（将来用）
export function listProcessors(): Processor[] {
  return processors.slice()
}