import { useCallback, useRef } from 'react'

interface ResizeHandleProps {
  onResize: (delta: number) => void
  direction?: 'horizontal' | 'vertical'
}

export default function ResizeHandle({ onResize, direction = 'horizontal' }: ResizeHandleProps) {
  const startPos = useRef(0)
  const isVertical = direction === 'vertical'

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startPos.current = isVertical ? e.clientY : e.clientX
    const handleMouseMove = (e: MouseEvent) => {
      const current = isVertical ? e.clientY : e.clientX
      const delta = current - startPos.current
      startPos.current = current
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
    document.body.style.cursor = isVertical ? 'row-resize' : 'col-resize'
    document.body.style.userSelect = 'none'
  }, [onResize, isVertical])

  if (isVertical) {
    return (
      <div
        onMouseDown={handleMouseDown}
        className="h-1 cursor-row-resize hover:bg-indigo-500/30 transition-colors flex items-center justify-center group"
      >
        <div className="h-0.5 w-8 bg-gray-700 group-hover:bg-indigo-400 rounded-full transition-colors" />
      </div>
    )
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className="w-1 cursor-col-resize hover:bg-indigo-500/30 transition-colors flex items-center justify-center group"
    >
      <div className="w-0.5 h-8 bg-gray-700 group-hover:bg-indigo-400 rounded-full transition-colors" />
    </div>
  )
}
