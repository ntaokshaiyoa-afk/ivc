import { useState, useRef, useEffect } from 'react'

type Props = {
  before: string
  after: string
  onClose: () => void
}

export default function ImageCompareModal({ before, after, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  const [position, setPosition] = useState(50)

  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const pointerMode = useRef<'image' | 'slider' | null>(null)

  const last = useRef({ x: 0, y: 0 })

  const pointers = useRef<Map<number, PointerEvent>>(new Map())

  const lastTap = useRef<number>(0)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  /* pointer down */

  const onPointerDown = (e: React.PointerEvent) => {
    containerRef.current?.setPointerCapture(e.pointerId)

    pointers.current.set(e.pointerId, e.nativeEvent)

    const target = e.target as HTMLElement

    if (target.dataset.slider === 'true') {
      pointerMode.current = 'slider'
    } else {
      pointerMode.current = 'image'
    }

    last.current = { x: e.clientX, y: e.clientY }

    /* double tap */

    const now = Date.now()

    if (now - lastTap.current < 300) {
      setScale((s) => (s === 1 ? 2 : 1))

      if (scale !== 1) {
        setOffset({ x: 0, y: 0 })
      }
    }

    lastTap.current = now
  }

  /* pointer move */

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointerMode.current) return

    pointers.current.set(e.pointerId, e.nativeEvent)

    /* pinch zoom */

    if (pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()]

      const dx = p1.clientX - p2.clientX
      const dy = p1.clientY - p2.clientY

      const dist = Math.sqrt(dx * dx + dy * dy)

      const prev = last.current.x

      if (prev !== 0) {
        const delta = dist - prev

        setScale((s) => Math.min(10, Math.max(0.2, s + delta * 0.005)))
      }

      last.current.x = dist

      return
    }

    if (pointerMode.current === 'slider') {
      const rect = containerRef.current!.getBoundingClientRect()

      const percent = ((e.clientX - rect.left) / rect.width) * 100

      setPosition(Math.min(100, Math.max(0, percent)))

      return
    }

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

    if (pointers.current.size === 0) {
      pointerMode.current = null
      last.current.x = 0
    }
  }

  const resetView = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  return (
    <div
      className="fixed inset-0 bg-black/85 flex items-center justify-center z-50"
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
            className="bg-gray-800 text-white px-3 py-1 rounded text-sm shadow"
          >
            Reset
          </button>

          <div className="bg-black/60 text-white px-3 py-1 rounded text-sm">
            {(scale * 100).toFixed(0)}%
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/70 text-white w-10 h-10 rounded-full text-xl z-20"
        >
          ✕
        </button>

        {/* image */}

        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
          className="relative"
        >
          <img
            src={before}
            className="block max-w-none pointer-events-none"
            draggable={false}
          />

          <img
            src={after}
            className="absolute inset-0 max-w-none pointer-events-none"
            style={{
              clipPath: `inset(0 0 0 ${position}%)`,
            }}
            draggable={false}
          />
        </div>

        {/* divider */}

        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white z-10"
          style={{ left: `${position}%` }}
        />

        {/* slider handle */}

        <div
          data-slider="true"
          className="absolute z-20 cursor-ew-resize"
          style={{
            left: `${position}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="bg-white text-black rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
            ⇆
          </div>
        </div>
      </div>
    </div>
  )
}
