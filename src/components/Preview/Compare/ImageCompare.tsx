import { useState } from 'react'

export function ImageCompare({ before, after }: { before: string; after: string }) {
  const [position, setPosition] = useState(50)

  return (
    <div className="relative w-full max-w-4xl aspect-video mx-auto overflow-hidden rounded-xl border select-none">
      <img src={before} className="absolute inset-0 w-full h-full object-contain" />
      <img
        src={after}
        className="absolute w-full h-full object-contain"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      />
      <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow pointer-events-none" style={{ left: `${position}%` }} />
      <div className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-gray-400 rounded-full shadow-lg pointer-events-none" style={{ left: `calc(${position}% - 12px)` }} />
      <input
        type="range"
        min="0"
        max="100"
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
        style={{ touchAction: 'none' }}
      />
    </div>
  )
}