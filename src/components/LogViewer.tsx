import { useEffect, useRef, useState } from 'react'

interface LogViewerProps {
  taskId: string
}

interface ParsedBlock {
  type: 'text' | 'result' | 'error' | 'meta'
  content: string
}

function parseLog(raw: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = []
  const lines = raw.split('\n')

  for (const line of lines) {
    if (!line.trim()) continue

    // Try parsing as Claude Code JSON output
    try {
      const json = JSON.parse(line)

      // Result message from Claude
      if (json.type === 'result' && json.result) {
        blocks.push({ type: 'result', content: json.result })
        continue
      }

      // Assistant message
      if (json.type === 'assistant' && json.message?.content) {
        for (const block of json.message.content) {
          if (block.type === 'text') {
            blocks.push({ type: 'result', content: block.text })
          } else if (block.type === 'tool_use') {
            blocks.push({ type: 'meta', content: `🔧 ${block.name}` })
          }
        }
        continue
      }

      // Usage/metadata — show compact summary
      if (json.session_id || json.total_cost_usd !== undefined) {
        const parts: string[] = []
        if (json.total_cost_usd) parts.push(`费用: $${Number(json.total_cost_usd).toFixed(4)}`)
        if (json.duration_ms) parts.push(`耗时: ${(json.duration_ms / 1000).toFixed(1)}s`)
        if (json.session_id) parts.push(`Session: ${json.session_id.slice(0, 12)}...`)
        if (parts.length > 0) {
          blocks.push({ type: 'meta', content: parts.join(' · ') })
        }
        continue
      }

      // Generic JSON with result field
      if (json.result) {
        blocks.push({ type: 'result', content: typeof json.result === 'string' ? json.result : JSON.stringify(json.result, null, 2) })
        continue
      }

      // Other JSON — show compact
      blocks.push({ type: 'text', content: line })
    } catch {
      // Not JSON — check for stderr
      if (line.startsWith('[stderr]')) {
        blocks.push({ type: 'error', content: line.replace('[stderr] ', '') })
      } else if (line.startsWith('[ERROR]')) {
        blocks.push({ type: 'error', content: line })
      } else {
        blocks.push({ type: 'text', content: line })
      }
    }
  }

  return blocks
}

export default function LogViewer({ taskId }: LogViewerProps) {
  const [raw, setRaw] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/tasks/${taskId}/log`)
      .then((r) => r.text())
      .then(setRaw)
      .catch(() => {})
  }, [taskId])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail.taskId === taskId) {
        setRaw((prev) => prev + detail.text)
      }
    }
    window.addEventListener('log:stream', handler)
    return () => window.removeEventListener('log:stream', handler)
  }, [taskId])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [raw, showRaw])

  if (!raw) return <p className="text-xs text-gray-600">暂无日志</p>

  const blocks = parseLog(raw)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-[10px] text-gray-600 hover:text-gray-400 cursor-pointer"
        >
          {showRaw ? '← 解析视图' : '查看原始日志'}
        </button>
      </div>
      <div
        ref={containerRef}
        className="bg-gray-950 rounded-lg p-3 max-h-72 overflow-y-auto"
      >
        {showRaw ? (
          <pre className="text-xs font-mono text-gray-400 whitespace-pre-wrap">{raw}</pre>
        ) : (
          <div className="space-y-2">
            {blocks.map((block, i) => (
              <div key={i}>
                {block.type === 'result' && (
                  <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{block.content}</div>
                )}
                {block.type === 'text' && (
                  <div className="text-xs text-gray-500 font-mono whitespace-pre-wrap">{block.content}</div>
                )}
                {block.type === 'error' && (
                  <div className="text-xs text-red-400 font-mono">{block.content}</div>
                )}
                {block.type === 'meta' && (
                  <div className="text-[10px] text-gray-600 border-t border-gray-800 pt-1 mt-1">{block.content}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
