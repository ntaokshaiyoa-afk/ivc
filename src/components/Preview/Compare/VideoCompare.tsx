import { useEffect, useRef } from 'react'

export function VideoCompare({
  before,
  after,
}: {
  before: string
  after: string
}) {
  const beforeRef = useRef<HTMLVideoElement>(null)
  const afterRef = useRef<HTMLVideoElement>(null)

  const syncingRef = useRef(false)

  const withGuard = (fn: () => void) => {
    if (syncingRef.current) return
    syncingRef.current = true
    try {
      fn()
    } finally {
      // 同期起因のイベント連鎖を1tick抑制
      queueMicrotask(() => {
        syncingRef.current = false
      })
    }
  }

  const syncTimeFromTo = (src: HTMLVideoElement, dst: HTMLVideoElement) => {
    // 小差分だけ詰める（ガタつき防止）
    const diff = Math.abs(dst.currentTime - src.currentTime)
    if (diff > 0.08) dst.currentTime = src.currentTime
  }

  useEffect(() => {
    const a = beforeRef.current
    const b = afterRef.current
    if (!a || !b) return

    const onPlayA = () =>
      withGuard(() => {
        if (b.paused) b.play()
      })
    const onPauseA = () =>
      withGuard(() => {
        if (!b.paused) b.pause()
      })
    const onSeekA = () => withGuard(() => syncTimeFromTo(a, b))
    const onTimeA = () => {
      if (!a.paused) syncTimeFromTo(a, b)
    }

    const onPlayB = () =>
      withGuard(() => {
        if (a.paused) a.play()
      })
    const onPauseB = () =>
      withGuard(() => {
        if (!a.paused) a.pause()
      })
    const onSeekB = () => withGuard(() => syncTimeFromTo(b, a))
    const onTimeB = () => {
      if (!b.paused) syncTimeFromTo(b, a)
    }

    a.addEventListener('play', onPlayA)
    a.addEventListener('pause', onPauseA)
    a.addEventListener('seeking', onSeekA)
    a.addEventListener('timeupdate', onTimeA)

    b.addEventListener('play', onPlayB)
    b.addEventListener('pause', onPauseB)
    b.addEventListener('seeking', onSeekB)
    b.addEventListener('timeupdate', onTimeB)

    return () => {
      a.removeEventListener('play', onPlayA)
      a.removeEventListener('pause', onPauseA)
      a.removeEventListener('seeking', onSeekA)
      a.removeEventListener('timeupdate', onTimeA)

      b.removeEventListener('play', onPlayB)
      b.removeEventListener('pause', onPauseB)
      b.removeEventListener('seeking', onSeekB)
      b.removeEventListener('timeupdate', onTimeB)
    }
  }, [before, after])

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <video
        ref={beforeRef}
        src={before}
        controls
        className="w-full rounded-xl"
        playsInline
      />
      <video
        ref={afterRef}
        src={after}
        controls
        className="w-full rounded-xl"
        playsInline
      />
    </div>
  )
}
