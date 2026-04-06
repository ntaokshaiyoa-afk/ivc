export type ProcessCtx = {
  onProgress?: (progress: number) => void
}

export type ProcessOutput = {
  name: string
  blob: Blob
  mime: string
}

export type OfficeImageFormat = 'jpeg' | 'png' | 'webp'

export type OfficeImageOverride = {
  format: OfficeImageFormat
  quality: number
}

export type OfficeSettings = {
  overrides: Record<string, OfficeImageOverride>
}

export type OfficeOverrides = Record<string, OfficeImageOverride>

export type OfficeImage = {
  path: string
  beforeUrl: string
  afterUrl: string
  originalSize: number
  compressedSize: number
  format?: 'jpeg' | 'png' | 'webp'
  quality?: number
}

export type ProcessResult = {
  outputs: ProcessOutput[]
  officeImages?: OfficeImage[]
}

export type ProcessorSettings = {
  officeOverrides?: OfficeOverrides
} & Record<string, unknown>

export type Processor = {
  id: string
  label: string
  kind: 'image' | 'video' | 'audio' | 'document' | 'archive' | 'unknown'
  accepts: (file: File) => boolean
  getDefaultSettings: () => ProcessorSettings
  process: (
    file: File,
    settings: ProcessorSettings,
    ctx: ProcessCtx,
  ) => Promise<ProcessResult>
}
