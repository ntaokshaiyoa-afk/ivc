import { useRef } from 'react'

export function VideoCompare({ before, after }: { before: string; after: string }) {
  const beforeRef = useRef<HTMLVideoElement>(null)
  const afterRef = useRef<HTMLVideoElement>(null)

  const sync = (source: 'before' | 'after') => {
    const src = source === 'before' ? beforeRef.current : afterRef.current
    const target = source === 'before' ? afterRef.current : beforeRef.current
    if (!src || !target) return
    target.currentTime = src.currentTime
    if (!src.paused) target.play()
    else target.pause()
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <video ref={beforeRef} src={before} controls onPlay={() => sync('before')} onPause={() => sync('before')} onSeeked={() => sync('before')} className="w-full rounded-xl" />
      <video ref={afterRef} src={after} controls onPlay={() => sync('after')} onPause={() => sync('after')} onSeeked={() => sync('after')} className="w-full rounded-xl" />
    </div>
  )
}