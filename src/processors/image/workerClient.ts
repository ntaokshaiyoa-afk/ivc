// src/processors/image/workerClient.ts
import CompressionWorker from './compression.worker?worker'

type WorkerOk = { ok: true; blob: Blob }
type WorkerErr = { ok: false; error: string }
type WorkerMsg = WorkerOk | WorkerErr

export async function compressImageInWorker(file: File, quality: number, codec: string) {
  const worker = new CompressionWorker()

  return await new Promise<Blob>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
      const msg = e.data
      worker.terminate()

      if (msg && msg.ok) resolve(msg.blob)
      else reject(new Error(msg?.error ?? 'Image worker failed'))
    }

    worker.onerror = (err) => {
      worker.terminate()
      reject(err)
    }

    worker.postMessage({ file, quality, codec })
  })
}