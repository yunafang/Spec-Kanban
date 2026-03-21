import { useEffect, useRef, useState } from 'react'

interface LogViewerProps {
  taskId: string
}

export default function LogViewer({ taskId }: LogViewerProps) {
  const [logs, setLogs] = useState('')
  const containerRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    fetch(`/api/tasks/${taskId}/log`)
      .then((r) => r.text())
      .then(setLogs)
      .catch(() => {})
  }, [taskId])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail.taskId === taskId) {
        setLogs((prev) => prev + detail.text)
      }
    }
    window.addEventListener('log:stream', handler)
    return () => window.removeEventListener('log:stream', handler)
  }, [taskId])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  return (
    <pre
      ref={containerRef}
      className="bg-gray-950 rounded-lg p-3 text-xs font-mono text-gray-400 max-h-64 overflow-y-auto whitespace-pre-wrap"
    >
      {logs || '暂无日志'}
    </pre>
  )
}
