export type FileStatus = 'waiting' | 'processing' | 'done' | 'error'

export type FileItem = {
  id: string
  file: File
  previewUrl: string
  outputUrl?: string
  originalSize: number
  outputSize?: number
  status: FileStatus
  progress: number

  // processorごとの設定を入れられるように汎用化
  settings: Record<string, unknown>
  processorId: string
}

export type CompressionContext = {
  onProgress: (p: number) => void
}

export type ProcessResult = {
  file: File
}

export type Processor = {
  id: string
  label: string
  accepts: (file: File) => boolean

  // UIに出す選択肢（codec/quality等）を定義
  getDefaultSettings: (file: File) => Record<string, unknown>

  // 圧縮/変換本体
  process: (
    file: File,
    settings: Record<string, unknown>,
    ctx: CompressionContext,
  ) => Promise<ProcessResult>

  // プレビュー/比較UIのヒント（任意）
  kind: 'image' | 'video' | 'other'
}