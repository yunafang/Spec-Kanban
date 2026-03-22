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
        className="h-2 cursor-row-resize hover:bg-blue-100 active:bg-blue-200 transition-colors flex items-center justify-center group relative"
      >
        <div className="absolute inset-x-0 -top-1 -bottom-1" />
        <div className="h-0.5 w-10 bg-gray-300 group-hover:bg-blue-400 rounded-full transition-colors" />
      </div>
    )
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className="w-2 cursor-col-resize hover:bg-blue-100 active:bg-blue-200 transition-colors flex items-center justify-center group relative"
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
      <div className="w-0.5 h-10 bg-gray-300 group-hover:bg-blue-400 rounded-full transition-colors" />
    </div>
  )
}
