'use client'

import { useRef } from 'react'
import { Camera } from 'lucide-react'

export default function CameraViewfinder({
  label,
  onCapture,
  outline = 'sheet',
}: {
  label: string
  onCapture: (dataUrl: string) => void
  outline?: 'sheet' | 'lines'
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onCapture(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div>
      <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden flex items-center justify-center">
        <span className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-white/80 rounded-tl" />
        <span className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-white/80 rounded-tr" />
        <span className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-white/80 rounded-bl" />
        <span className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-white/80 rounded-br" />

        <div className="w-2/3 h-3/4 bg-white rounded-sm p-3 flex flex-col justify-center gap-2">
          {outline === 'sheet'
            ? Array.from({ length: 6 }).map((_, row) => (
                <div key={row} className="flex gap-2">
                  {Array.from({ length: 4 }).map((_, col) => (
                    <span
                      key={col}
                      className={`w-2.5 h-2.5 rounded-full border border-gray-400 ${
                        (row * 4 + col) % 5 === 0 ? 'bg-black border-black' : ''
                      }`}
                    />
                  ))}
                </div>
              ))
            : Array.from({ length: 6 }).map((_, row) => (
                <span key={row} className="h-px bg-gray-300 w-full" />
              ))}
        </div>

        <button
          onClick={() => inputRef.current?.click()}
          className="absolute bottom-3 inset-x-3 flex items-center justify-center gap-2 py-2.5 rounded-full bg-white text-black text-xs font-bold tracking-wide uppercase hover:bg-white/90"
        >
          <Camera className="w-4 h-4" />
          {label}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
          className="hidden"
        />
      </div>
    </div>
  )
}
