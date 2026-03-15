import { useState, useRef, useEffect } from 'react'

type Props = {
  before: string
  after: string
  onClose: () => void
}

export default function ImageCompareModal({ before, after, onClose }: Props) {
  const [position, setPosition] = useState(50)

  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })

  const containerRef = useRef<HTMLDivElement>(null)

  /* ESCで閉じる */
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  /* ホイールズーム */
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()

    const delta = -e.deltaY * 0.0015

    setScale((s) => {
      const next = Math.min(10, Math.max(0.2, s + delta))
      return next
    })
  }

  /* パン開始 */
  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    last.current = { x: e.clientX, y: e.clientY }
  }

  /* パン */
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return

    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y

    last.current = { x: e.clientX, y: e.clientY }

    setOffset((o) => ({
      x: o.x + dx,
      y: o.y + dy,
    }))
  }

  const stopDrag = () => {
    dragging.current = false
  }

  /* ダブルクリックズーム */
  const handleDoubleClick = () => {
    if (scale === 1) {
      setScale(2)
    } else {
      setScale(1)
      setOffset({ x: 0, y: 0 })
    }
  }

  /* リセット */
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
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        {/* UIバー */}
        <div className="absolute top-4 left-4 flex gap-3 z-10">

          <button
            onClick={resetView}
            className="bg-white/90 px-3 py-1 rounded text-sm"
          >
            Reset
          </button>

          <div className="bg-black/60 text-white px-3 py-1 rounded text-sm">
            {(scale * 100).toFixed(0)}%
          </div>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/70 text-white w-10 h-10 rounded-full text-xl"
        >
          ✕
        </button>

        {/* 画像レイヤー */}
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
          className="relative transition-transform"
        >
          {/* before */}
          <img
            src={before}
            className="block max-w-none pointer-events-none"
            draggable={false}
          />

          {/* after */}
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
          className="absolute top-0 bottom-0 w-[2px] bg-white"
          style={{ left: `${position}%` }}
        />

        {/* slider */}
        <input
          type="range"
          min="0"
          max="100"
          value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
        />
      </div>
    </div>
  )
}
