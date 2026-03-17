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

  const mode = useRef<'image' | 'slider' | null>(null)
  const last = useRef({ x: 0, y: 0 })
  const velocity = useRef({ x: 0, y: 0 })

  const pointers = useRef<Map<number, PointerEvent>>(new Map())
  const pinchStart = useRef(0)
  const lastTap = useRef(0)

  /* ---------- lifecycle ---------- */

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  /* ホイールスクロールを止めて、ズームにする */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()

      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left - rect.width / 2
      const cy = e.clientY - rect.top - rect.height / 2

      // ホイールでズーム（中心はマウス位置）
      const zoomIntensity = 0.0015
      setScale((s) => {
        const next = Math.min(10, Math.max(0.2, s * Math.exp(-e.deltaY * zoomIntensity)))

        setOffset((o) => ({
          x: o.x - cx * (next / s - 1),
          y: o.y - cy * (next / s - 1),
        }))

        return next
      })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])
  /* ついでに（任意）モーダル表示中の背景スクロールも止めたい場合 */
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  /* ---------- inertia（修正済） ---------- */

  useEffect(() => {
    let raf: number

    const loop = () => {
      // 操作中は慣性停止
      if (mode.current !== null) {
        raf = requestAnimationFrame(loop)
        return
      }

      velocity.current.x *= 0.95
      velocity.current.y *= 0.95

      if (
        Math.abs(velocity.current.x) < 0.1 &&
        Math.abs(velocity.current.y) < 0.1
      ) {
        return
      }

      setOffset((o) => ({
        x: o.x + velocity.current.x,
        y: o.y + velocity.current.y,
      }))

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, []) // ← ★完全に空

  /* ---------- helpers ---------- */

  const getRelativePoint = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect()
    return {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    }
  }

  /* ---------- pointer ---------- */

  const onPointerDown = (e: React.PointerEvent) => {
    const now = Date.now()

    // ダブルタップ
    if (now - lastTap.current < 300) {
      const p = getRelativePoint(e.clientX, e.clientY)

      setScale((s) => {
        const next = s > 1 ? 1 : 2

        setOffset((o) => ({
          x: o.x - p.x * (next / s - 1),
          y: o.y - p.y * (next / s - 1),
        }))

        return next
      })
    }

    lastTap.current = now

    const target = e.target as HTMLElement
    mode.current = target.dataset.slider ? 'slider' : 'image'

    containerRef.current?.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, e.nativeEvent)

    last.current = { x: e.clientX, y: e.clientY }
    velocity.current = { x: 0, y: 0 }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!mode.current) return

    pointers.current.set(e.pointerId, e.nativeEvent)

    // pinch
    if (pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()]

      const dx = p1.clientX - p2.clientX
      const dy = p1.clientY - p2.clientY
      const dist = Math.sqrt(dx * dx + dy * dy)

      const center = {
        x: (p1.clientX + p2.clientX) / 2,
        y: (p1.clientY + p2.clientY) / 2,
      }

      const p = getRelativePoint(center.x, center.y)

      if (pinchStart.current === 0) {
        pinchStart.current = dist
        return
      }

      const ratio = dist / pinchStart.current

      setScale((s) => {
        const next = Math.min(10, Math.max(0.2, s * ratio))

        setOffset((o) => ({
          x: o.x - p.x * (next / s - 1),
          y: o.y - p.y * (next / s - 1),
        }))

        return next
      })

      pinchStart.current = dist
      return
    }

    // slider
    if (mode.current === 'slider') {
      const rect = containerRef.current!.getBoundingClientRect()
      const percent = ((e.clientX - rect.left) / rect.width) * 100
      setPosition(Math.min(100, Math.max(0, percent)))
      return
    }

    // pan
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y

    last.current = { x: e.clientX, y: e.clientY }
    velocity.current = { x: dx, y: dy }

    setOffset((o) => ({
      x: o.x + dx,
      y: o.y + dy,
    }))
  }

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)

    if (pointers.current.size < 2) pinchStart.current = 0
    if (pointers.current.size === 0) mode.current = null
  }

  /* ---------- render ---------- */

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="relative w-[90vw] h-[90vh] overflow-hidden select-none"
        style={{ touchAction: 'none' }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* close button */}
        <button
          type="button"
          aria-label="閉じる"
          className="absolute top-3 right-3 z-50 bg-black/60 text-white border border-white/20
                    rounded-md px-3 py-2 hover:bg-black/80"
          onPointerDownCapture={(e) => {
            e.stopPropagation()
          }}
          onPointerMoveCapture={(e) => {
            e.stopPropagation()
          }}
          onPointerUpCapture={(e) => {
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          ×
        </button>
                
        {/* BEFORE（左） */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <div className="flex items-center justify-center h-full w-full">
            <div
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              }}
            >
              <img
                src={before}
                className="block max-w-none"
                draggable={false}
              />
            </div>
          </div>
        </div>

        {/* AFTER（右） */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          // position より左を隠して「右側だけ after」を表示
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        >
          <div className="flex items-center justify-center h-full w-full">
            <div
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              }}
            >
              <img src={after} className="block max-w-none" draggable={false} />
            </div>
          </div>
        </div>

        {/* divider */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white z-20"
          style={{ left: `${position}%` }}
        />

        {/* slider */}
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
