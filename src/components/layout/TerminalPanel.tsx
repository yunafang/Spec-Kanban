import { useEffect, useRef, useState } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { useUiStore } from '@/store/uiStore'

export default function TerminalPanel() {
  const selectedTaskId = useUiStore((s) => s.selectedTaskId)
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === selectedTaskId))
  const [logs, setLogs] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch log when task changes
  useEffect(() => {
    if (!selectedTaskId) { setLogs(''); return }
    fetch(`/api/tasks/${selectedTaskId}/log`)
      .then((r) => r.text())
      .then(setLogs)
      .catch(() => setLogs(''))
  }, [selectedTaskId])

  // Listen for streaming log updates
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail.taskId === selectedTaskId) {
        setLogs((prev) => prev + detail.text)
      }
    }
    window.addEventListener('log:stream', handler)
    return () => window.removeEventListener('log:stream', handler)
  }, [selectedTaskId])

  // Auto-scroll
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-gray-600">
        选择一个任务查看终端输出
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    inbox: 'text-gray-500',
    brainstorm: 'text-amber-400',
    planning: 'text-indigo-400',
    executing: 'text-emerald-400',
    needs_human: 'text-amber-400',
    done: 'text-cyan-400',
  }

  // Parse logs for display — extract readable parts
  /** Ensure value is always a string */
  const toStr = (v: unknown): string =>
    typeof v === 'string' ? v : JSON.stringify(v, null, 2)

  const displayLines = logs.split('\n').map((line) => {
    if (!line.trim()) return null
    try {
      const json = JSON.parse(line)
      if (json.result) {
        let text = toStr(json.result)
        const codeMatch = text.match(/```json\s*\n?([\s\S]*?)```/)
        if (codeMatch) {
          try {
            const inner = JSON.parse(codeMatch[1])
            if (inner.design) return { type: 'output', text: toStr(inner.design) }
            if (inner.plan) return { type: 'output', text: toStr(inner.plan) }
          } catch {}
          text = text.replace(/```json\s*\n?[\s\S]*?```\s*/g, '').trim()
        }
        if (text) return { type: 'output', text }
        return null
      }
      if (json.type === 'assistant') return null
      return null
    } catch {
      if (line.startsWith('[stderr]')) {
        const msg = line.replace('[stderr] ', '')
        if (msg.startsWith('Warning:')) return null
        return { type: 'error', text: msg }
      }
      if (line.startsWith('[ERROR]')) return { type: 'error', text: line }
      return { type: 'text', text: line }
    }
  }).filter(Boolean) as { type: string; text: string }[]

  return (
    <div className="h-full flex flex-col">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-800 bg-gray-900/60 shrink-0">
        <span className={`text-xs font-mono ${statusColors[task.status] || 'text-gray-400'}`}>▶</span>
        <span className="text-xs font-semibold text-gray-300">{task.title}</span>
        <span className="text-[10px] text-gray-600">
          {task.status === 'executing' && '执行中...'}
          {task.status === 'brainstorm' && '设计中...'}
          {task.status === 'planning' && '规划中...'}
          {task.status === 'needs_human' && '等待操作'}
          {task.status === 'done' && '已完成'}
          {task.status === 'inbox' && '排队中'}
        </span>
        {task.status === 'executing' && (
          <span className="ml-auto text-[10px] text-emerald-400 animate-pulse">● LIVE</span>
        )}
      </div>

      {/* Terminal content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs bg-gray-950">
        {displayLines.length === 0 ? (
          <div className="text-gray-600">
            {task.status === 'inbox' ? '任务排队中，等待调度...' :
             task.status === 'executing' ? '等待输出...' :
             '暂无日志'}
          </div>
        ) : (
          displayLines.map((line, i) => (
            <div key={i} className="mb-1 leading-relaxed">
              {line.type === 'output' && (
                <span className="text-green-400/90 whitespace-pre-wrap">{line.text}</span>
              )}
              {line.type === 'error' && (
                <span className="text-red-400">{line.text}</span>
              )}
              {line.type === 'text' && (
                <span className="text-gray-500">{line.text}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
