export type ProcessCtx = {
  onProgress?: (progress: number) => void
}

export type ProcessOutput = {
  name: string
  blob: Blob
  mime: string
}

export type OfficeImage = {
  path: string
  beforeUrl: string
  afterUrl: string
  originalSize: number
  compressedSize: number
}

export type ProcessResult = {
  outputs: ProcessOutput[]
  officeImages?: OfficeImage[]
}

export type ProcessorSettings = Record<string, unknown>

export type Processor = {
  id: string
  label: string
  kind: 'image' | 'video' | 'audio' | 'document' | 'archive' | 'unknown'
  accepts: (file: File) => boolean
  getDefaultSettings: () => ProcessorSettings
  process: (file: File, settings: ProcessorSettings, ctx: ProcessCtx) => Promise<ProcessResult>
}
