export function compressImageWorker(
  file: File,
  quality: number,
  format: string
): Promise<File> {

  return new Promise((resolve) => {

    const worker = new Worker(
      new URL(
        "../workers/compression.worker.ts",
        import.meta.url
      ),
      { type: "module" }
    )

    worker.postMessage({
      file,
      quality,
      format
    })

    worker.onmessage = (e) => {

      const blob = e.data

      const result = new File(
        [blob],
        file.name,
        { type: blob.type }
      )

      resolve(result)
      worker.terminate()
    }
  })
}
