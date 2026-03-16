import { useState, useRef, useEffect } from "react"

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

  const draggingImage = useRef(false)
  const draggingSlider = useRef(false)

  const last = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    window.addEventListener("keydown", esc)
    return () => window.removeEventListener("keydown", esc)
  }, [onClose])

  /* zoom */

  const handleWheel = (e: React.WheelEvent) => {

    e.preventDefault()

    const delta = -e.deltaY * 0.0015

    setScale(s => Math.min(10, Math.max(0.2, s + delta)))
  }

  /* image drag */

  const startImageDrag = (e: React.MouseEvent) => {

    if (draggingSlider.current) return

    draggingImage.current = true
    last.current = { x: e.clientX, y: e.clientY }
  }

  const move = (e: React.MouseEvent) => {

    if (draggingSlider.current) {

      const rect = containerRef.current!.getBoundingClientRect()

      const percent =
        ((e.clientX - rect.left) / rect.width) * 100

      setPosition(Math.min(100, Math.max(0, percent)))

      return
    }

    if (!draggingImage.current) return

    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y

    last.current = { x: e.clientX, y: e.clientY }

    setOffset(o => ({
      x: o.x + dx,
      y: o.y + dy
    }))
  }

  const stopDrag = () => {

    draggingImage.current = false
    draggingSlider.current = false
  }

  const startSlider = (e: React.MouseEvent) => {

    e.stopPropagation()

    draggingSlider.current = true
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
        className="relative w-[90vw] h-[90vh] overflow-hidden select-none flex items-center justify-center cursor-grab"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={startImageDrag}
        onMouseMove={move}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onWheel={handleWheel}
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

        {/* image layer */}

        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
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
              clipPath: `inset(0 0 0 ${position}%)`
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
          onMouseDown={startSlider}
          className="absolute z-20 cursor-ew-resize"
          style={{
            left: `${position}%`,
            top: "50%",
            transform: "translate(-50%, -50%)"
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
