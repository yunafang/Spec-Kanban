import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { useUiStore } from '@/store/uiStore'

const XTerminal = lazy(() => import('./XTerminal'))

type TerminalMode = 'log' | 'terminal'

export default function TerminalPanel() {
  const selectedTaskId = useUiStore((s) => s.selectedTaskId)
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === selectedTaskId))
  const [logs, setLogs] = useState('')
  const [mode, setMode] = useState<TerminalMode>('log')
  const isTaskRunning = task ? ['brainstorm', 'planning', 'executing'].includes(task.status) : false
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
    if (containerRef.current && mode === 'log') {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, mode])

  const statusColors: Record<string, string> = {
    inbox: 'text-gray-500',
    brainstorm: 'text-amber-600',
    planning: 'text-blue-600',
    executing: 'text-green-600',
    needs_human: 'text-amber-600',
    done: 'text-purple-600',
  }

  // Parse stream-json logs: extract all JSON objects from raw output (handles chunked/concatenated JSON)
  const toStr = (v: unknown): string =>
    typeof v === 'string' ? v : JSON.stringify(v, null, 2)

  const parseJsonObjects = (raw: string): any[] => {
    const objects: any[] = []
    // Match top-level JSON objects by tracking brace depth
    let depth = 0
    let start = -1
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i]
      if (ch === '{' && depth === 0) { start = i }
      if (ch === '{') depth++
      if (ch === '}') {
        depth--
        if (depth === 0 && start >= 0) {
          try {
            objects.push(JSON.parse(raw.slice(start, i + 1)))
          } catch { /* partial or invalid JSON, skip */ }
          start = -1
        }
      }
    }
    return objects
  }

  const displayLines: { type: string; text: string }[] = []

  // Handle non-JSON lines (stderr, errors)
  for (const line of logs.split('\n')) {
    if (!line.trim()) continue
    if (line.startsWith('[stderr]')) {
      const msg = line.replace('[stderr] ', '')
      if (!msg.startsWith('Warning:')) displayLines.push({ type: 'error', text: msg })
    } else if (line.startsWith('[ERROR]')) {
      displayLines.push({ type: 'error', text: line })
    }
  }

  // Parse all JSON objects from the raw log
  for (const json of parseJsonObjects(logs)) {
    // Final result
    if (json.type === 'result' || json.result) {
      let text = toStr(json.result || '')
      const codeMatch = text.match(/```json\s*\n?([\s\S]*?)```/)
      if (codeMatch) {
        try {
          const inner = JSON.parse(codeMatch[1])
          if (inner.design) { displayLines.push({ type: 'output', text: toStr(inner.design) }); continue }
          if (inner.plan) { displayLines.push({ type: 'output', text: toStr(inner.plan) }); continue }
        } catch {}
        text = text.replace(/```json\s*\n?[\s\S]*?```\s*/g, '').trim()
      }
      const meta: string[] = []
      if (json.total_cost_usd) meta.push(`$${Number(json.total_cost_usd).toFixed(4)}`)
      if (json.duration_ms) meta.push(`${(json.duration_ms / 1000).toFixed(1)}s`)
      if (json.num_turns) meta.push(`${json.num_turns} 轮`)
      if (meta.length > 0) displayLines.push({ type: 'meta', text: `✦ ${meta.join(' · ')}` })
      else if (text) displayLines.push({ type: 'output', text })
      continue
    }

    // Assistant messages — the main content
    if (json.type === 'assistant' && json.message?.content) {
      for (const block of json.message.content) {
        if (block.type === 'text' && block.text?.trim()) {
          displayLines.push({ type: 'output', text: block.text })
        } else if (block.type === 'tool_use') {
          const input = block.input
          let detail = ''
          if (input?.command) detail = ` → ${input.command}`
          else if (input?.file_path) detail = ` → ${input.file_path}`
          else if (input?.pattern) detail = ` → ${input.pattern}`
          displayLines.push({ type: 'tool', text: `🔧 ${block.name}${detail}` })
        }
      }
      continue
    }

    // Tool results
    if (json.type === 'tool' && json.tool) {
      displayLines.push({ type: 'tool', text: `🔧 ${json.tool}` })
      continue
    }

    // Skip: system, rate_limit_event, user, content_block_start/stop, etc.
  }

  return (
    <div className="h-full flex flex-col">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 bg-[#f6f8fa] shrink-0">
        {task ? (
          <>
            <span className={`text-xs font-mono ${statusColors[task.status] || 'text-gray-500'}`}>▶</span>
            <span className="text-xs font-semibold text-gray-700 truncate">{task.title}</span>
            <span className="text-[10px] text-gray-400">
              {task.status === 'executing' && '执行中...'}
              {task.status === 'brainstorm' && '设计中...'}
              {task.status === 'planning' && '规划中...'}
              {task.status === 'needs_human' && '等待操作'}
              {task.status === 'done' && '已完成'}
              {task.status === 'inbox' && '排队中'}
            </span>
          </>
        ) : (
          <span className="text-xs text-gray-500">终端</span>
        )}

        {/* Live indicator */}
        {isTaskRunning && (
          <span className="text-[10px] text-green-600 animate-pulse">● LIVE</span>
        )}

        {/* Mode tabs */}
        <div className="ml-auto flex items-center bg-gray-100 rounded p-0.5 gap-0.5">
          <button
            onClick={() => setMode('log')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors ${
              mode === 'log' ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 日志
          </button>
          <button
            onClick={() => setMode('terminal')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors ${
              mode === 'terminal'
                ? 'bg-blue-600 text-white'
                : isTaskRunning
                  ? 'text-gray-400 cursor-default'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ⌨️ 终端{isTaskRunning ? '' : task?.sessionId ? ' (恢复)' : ''}
          </button>
        </div>
      </div>

      {/* Content area */}
      {mode === 'log' ? (
        <div ref={containerRef} className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs bg-[#f6f8fa]">
          {!task ? (
            <div className="text-gray-400">选择一个任务查看终端输出</div>
          ) : displayLines.length === 0 ? (
            <div className="text-gray-400">
              {task.status === 'inbox' ? '任务排队中，等待调度...' :
               task.status === 'executing' ? '等待输出...' :
               '暂无日志'}
            </div>
          ) : (
            displayLines.map((line, i) => (
              <div key={i} className="mb-1 leading-relaxed">
                {line.type === 'output' && (
                  <span className="text-gray-800 whitespace-pre-wrap">{line.text}</span>
                )}
                {line.type === 'tool' && (
                  <span className="text-blue-600 text-[10px]">{line.text}</span>
                )}
                {line.type === 'meta' && (
                  <span className="text-gray-400 text-[10px]">{line.text}</span>
                )}
                {line.type === 'error' && (
                  <span className="text-red-600">{line.text}</span>
                )}
                {line.type === 'text' && (
                  <span className="text-gray-500">{line.text}</span>
                )}
              </div>
            ))
          )}
        </div>
      ) : isTaskRunning ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#f6f8fa] text-center px-4">
          <div className="text-2xl mb-2">⏳</div>
          <div className="text-xs text-gray-600 mb-1">任务正在自动执行中...</div>
          <div className="text-[10px] text-gray-400 mb-3">自动化使用 JSON 模式运行，交互终端在任务完成后可用</div>
          <button
            onClick={() => setMode('log')}
            className="text-[10px] px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 cursor-pointer"
          >
            📋 查看实时日志
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden bg-[#f6f8fa]">
          <Suspense fallback={<div className="flex items-center justify-center h-full text-xs text-gray-400">加载终端...</div>}>
            <XTerminal
              taskId={selectedTaskId}
              active={mode === 'terminal' && !isTaskRunning}
              mode="interactive"
            />
          </Suspense>
        </div>
      )}
    </div>
  )
}
