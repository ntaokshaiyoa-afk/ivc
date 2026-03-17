export const zipProcessor: Processor = {
  id: 'zip',
  label: 'ZIP (repack)',
  accepts: (f) => f.name.toLowerCase().endsWith('.zip') || f.type === 'application/zip',
  getDefaultSettings: () => ({
    recurse: true,
    // 例: zip内で画像はwebp化、音声はopus化…などプロファイル
    profile: 'default',
  }),
  async process(file, settings, ctx) {
    ctx.onProgress(0)
    const zip = await loadZip(file)
    const entries = await unzipToVirtualFiles(zip)

    const outputs: { name: string; blob: Blob; mime?: string }[] = []
    let done = 0

    for (const vf of entries) {
      const childFile = new File([vf.data], vf.name, { type: vf.mime ?? '' })
      const p = detectProcessor(childFile)

      if (!p || p.id === 'zip') {
        // そのまま
        outputs.push({ name: vf.name, blob: vf.data, mime: vf.mime })
      } else {
        // 子に適用（設定は profile で決める or UIで詳細指定）
        const childSettings = p.getDefaultSettings(childFile)
        const res = await p.process(childFile, childSettings, {
          onProgress: () => {}, // zip全体の進捗に合成してもOK
        })

        // 置き換え（複数出力なら命名ルールが必要）
        for (const o of res.outputs) outputs.push({ name: o.name, blob: o.blob, mime: o.mime })
      }

      done++
      ctx.onProgress((done / entries.length) * 100)
    }

    const repacked = await repackZip(outputs)
    return { outputs: [{ name: `repacked_${file.name}`, blob: repacked, mime: 'application/zip' }] }
  },
}