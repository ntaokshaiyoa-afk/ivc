import CompressionWorker from './compression.worker?worker'

type WorkerOk = { ok: true; blob: Blob }
type WorkerErr = { ok: false; error: string }
type WorkerMsg = WorkerOk | WorkerErr

let activeWorker: Worker | null = null
let activeReject: ((reason?: unknown) => void) | null = null
let seq = 0

export async function compressImageInWorker(file: File, quality: number, codec: string) {
  // 前回が走っていたら止める（= 並列を作らない）
  if (activeWorker) {
    try {
    activeWorker.terminate()
    } catch (err) {
    console.debug('worker terminate ignored', err)
    }
    activeWorker = null
    activeReject?.(new DOMException('Cancelled', 'AbortError'))
    activeReject = null
  }

  const mySeq = ++seq
  const worker = new CompressionWorker()
  activeWorker = worker

  return await new Promise<Blob>((resolve, reject) => {
    activeReject = reject

    worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
      const msg = e.data

      // 自分が最新でなければ結果を捨てる
      if (mySeq !== seq) return

      cleanup()
      if (msg && msg.ok) resolve(msg.blob)
      else reject(new Error(msg?.error ?? 'Image worker failed'))
    }

    worker.onerror = (err) => {
      if (mySeq !== seq) return
      cleanup()
      reject(err)
    }

    worker.postMessage({ file, quality, codec })
  })

    function cleanup() {
    try {
        worker.terminate()
    } catch (err) {
        console.debug('worker terminate ignored', err)
    }
    if (activeWorker === worker) activeWorker = null
    if (activeReject) activeReject = null
    }
}