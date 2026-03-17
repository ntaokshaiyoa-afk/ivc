export type JobStatus = 'waiting' | 'processing' | 'done' | 'error'

export type OutputAsset = {
  name: string
  blob: Blob
  mime?: string
  size: number
  url?: string // ObjectURL（必要時に作る）
}

export type Job = {
  id: string
  input: File
  previewUrl: string
  originalSize: number

  status: JobStatus
  progress: number

  processorId: string
  settings: Record<string, unknown>

  outputs?: OutputAsset[]
  error?: string
}