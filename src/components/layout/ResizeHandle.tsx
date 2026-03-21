import { useCallback, useRef } from 'react'

interface ResizeHandleProps {
  onResize: (delta: number) => void
}

export default function ResizeHandle({ onResize }: ResizeHandleProps) {
  const startX = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startX.current = e.clientX
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX.current
      startX.current = e.clientX
      onResize(delta)
    }
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [onResize])

  return (
    <div
      onMouseDown={handleMouseDown}
      className="w-1 cursor-col-resize hover:bg-indigo-500/30 transition-colors flex items-center justify-center group"
    >
      <div className="w-0.5 h-8 bg-gray-700 group-hover:bg-indigo-400 rounded-full transition-colors" />
    </div>
  )
}
