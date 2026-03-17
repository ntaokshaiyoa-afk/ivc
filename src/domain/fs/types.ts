export type VirtualFile = {
  name: string               // "a/b/c.png"
  mime?: string              // 不明なら undefined
  data: Blob                 // File でも Blob でもOK
  sourceId?: string          // 元の親（zipのエントリ等）
}