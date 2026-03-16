import { useState, useRef, useEffect } from 'react'

type Props = {
  before: string
  after: string
  onClose: () => void
}

export default function ImageCompareModal({ before, after, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  const [position, setPosition] = useState(50)
  /* const clipX = (position / 100) * (containerRef.current?.clientWidth || 0)

  const correctedClip = (clipX - offset.x) / scale */

  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const mode = useRef<'image' | 'slider' | null>(null)
  const last = useRef({ x: 0, y: 0 })

  const pointers = useRef<Map<number, PointerEvent>>(new Map())
  const pinchStart = useRef(0)

  /* ESC close */

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  /* pointer down */

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement

    if (target.dataset.slider) {
      mode.current = 'slider'
    } else {
      mode.current = 'image'
    }

    containerRef.current?.setPointerCapture(e.pointerId)

    pointers.current.set(e.pointerId, e.nativeEvent)

    last.current = { x: e.clientX, y: e.clientY }
  }

  /* pointer move */

  const onPointerMove = (e: React.PointerEvent) => {
    if (!mode.current) return

    pointers.current.set(e.pointerId, e.nativeEvent)

    /* pinch zoom */

    if (pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()]

      const dx = p1.clientX - p2.clientX
      const dy = p1.clientY - p2.clientY

      const dist = Math.sqrt(dx * dx + dy * dy)

      if (pinchStart.current === 0) {
        pinchStart.current = dist
        return
      }

      const delta = dist - pinchStart.current

      setScale((s) => Math.min(10, Math.max(0.2, s + delta * 0.005)))

      pinchStart.current = dist

      return
    }

    /* slider move */

    if (mode.current === 'slider') {
      const rect = containerRef.current!.getBoundingClientRect()

      const percent = ((e.clientX - rect.left) / rect.width) * 100

      setPosition(Math.min(100, Math.max(0, percent)))

      return
    }

    /* image pan */

    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y

    last.current = { x: e.clientX, y: e.clientY }

    setOffset((o) => ({
      x: o.x + dx,
      y: o.y + dy,
    }))
  }

  /* pointer up */

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)

    if (pointers.current.size < 2) {
      pinchStart.current = 0
    }

    if (pointers.current.size === 0) {
      mode.current = null
    }
  }

  const resetView = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="relative w-[90vw] h-[90vh] overflow-hidden select-none flex items-center justify-center"
        style={{ touchAction: 'none' }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* UI */}

        <div className="absolute top-4 left-4 flex gap-3 z-20">
          <button
            onClick={resetView}
            className="bg-gray-800 text-white px-3 py-1 rounded text-sm"
          >
            Reset
          </button>

          <div className="bg-black/60 text-white px-3 py-1 rounded text-sm">
            {(scale * 100).toFixed(0)}%
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/70 text-white w-10 h-10 rounded-full text-xl z-30"
        >
          ✕
        </button>

{/* image area */}

<div className="absolute inset-0 flex items-center justify-center">

  <div
    className="relative will-change-transform"
    style={{
      transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
    }}
  >

    {/* before */}

    <img
      src={before}
      className="block max-w-none object-contain pointer-events-none"
      draggable={false}
    />

    {/* after */}

    <div
      className="absolute top-0 left-0 h-full overflow-hidden pointer-events-none"
      style={{
        width: `${position}%`,
      }}
    >
      <img
        src={after}
        className="block max-w-none object-contain"
        draggable={false}
      />
    </div>

  </div>

</div>
        
        {/* divider */}

        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white z-20"
          style={{ left: `${position}%` }}
        />

        {/* slider hit area */}

        <div
          className="absolute z-30"
          style={{
            left: `${position}%`,
            top: 0,
            bottom: 0,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              data-slider="true"
              className="bg-white text-black rounded-full w-10 h-10 flex items-center justify-center shadow-lg cursor-ew-resize"
            >
              ⇆
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
