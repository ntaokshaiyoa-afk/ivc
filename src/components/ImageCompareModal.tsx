import { useState, useRef } from 'react'

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

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()

    const delta = -e.deltaY * 0.001
    setScale((s) => Math.min(10, Math.max(0.2, s + delta)))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    last.current = { x: e.clientX, y: e.clientY }
  }

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

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onMouseMove={handleMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onWheel={handleWheel}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white text-3xl"
      >
        ✕
      </button>

      <div
        className="relative w-[90vw] h-[90vh] overflow-hidden select-none"
        onMouseDown={handleMouseDown}
      >
        {/* before */}
        <img
          src={before}
          className="absolute"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
        />

        {/* after */}
        <img
          src={after}
          className="absolute"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            clipPath: `inset(0 0 0 ${position}%)`,
          }}
        />

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
