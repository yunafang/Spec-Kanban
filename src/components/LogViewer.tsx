import { useEffect, useRef, useState } from 'react'

interface LogViewerProps {
  taskId: string
}

interface ParsedBlock {
  type: 'summary' | 'text' | 'error' | 'meta'
  content: string
}

/** Extract human-readable content from Claude Code CLI output */
function parseLog(raw: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = []
  const lines = raw.split('\n')

  for (const line of lines) {
    if (!line.trim()) continue

    // Handle stderr
    if (line.startsWith('[stderr]')) {
      const msg = line.replace('[stderr] ', '').trim()
      if (msg.startsWith('Warning:')) continue // Skip warnings
      blocks.push({ type: 'error', content: msg })
      continue
    }
    if (line.startsWith('[ERROR]')) {
      blocks.push({ type: 'error', content: line })
      continue
    }

    // Try parsing as JSON
    try {
      const json = JSON.parse(line)

      // Claude Code result with embedded content
      if (json.type === 'result' || json.result) {
        const resultText = json.result || ''

        // Extract design/plan from markdown code blocks
        const codeBlockMatch = resultText.match(/```json\s*\n?([\s\S]*?)```/)
        if (codeBlockMatch) {
          try {
            const inner = JSON.parse(codeBlockMatch[1])
            if (inner.design) {
              blocks.push({ type: 'summary', content: inner.design })
            } else if (inner.plan) {
              blocks.push({ type: 'summary', content: inner.plan })
            } else if (inner.subtasks) {
              const taskList = inner.subtasks.map((s: any, i: number) => `${i + 1}. ${s.title}${s.description ? ' — ' + s.description : ''}`).join('\n')
              blocks.push({ type: 'summary', content: `建议拆分为以下子任务：\n${taskList}` })
            }
          } catch {
            // Not valid JSON in code block, show the code block content
            blocks.push({ type: 'summary', content: codeBlockMatch[1].trim() })
          }
          // Also show text outside the code block
          const outsideText = resultText.replace(/```json\s*\n?[\s\S]*?```\s*/g, '').trim()
          if (outsideText) blocks.push({ type: 'text', content: outsideText })
        } else if (resultText) {
          // Plain text result
          blocks.push({ type: 'summary', content: resultText })
        }

        // Show metadata
        const metaParts: string[] = []
        if (json.total_cost_usd) metaParts.push(`费用 $${Number(json.total_cost_usd).toFixed(4)}`)
        if (json.duration_ms) metaParts.push(`耗时 ${(json.duration_ms / 1000).toFixed(1)}s`)
        if (json.num_turns) metaParts.push(`${json.num_turns} 轮对话`)
        if (metaParts.length > 0) {
          blocks.push({ type: 'meta', content: metaParts.join(' · ') })
        }
        continue
      }

      // Direct design/plan JSON (from artifacts)
      if (json.design) {
        blocks.push({ type: 'summary', content: json.design })
        continue
      }
      if (json.plan) {
        blocks.push({ type: 'summary', content: json.plan })
        continue
      }

      // Assistant message (streaming format)
      if (json.type === 'assistant' && json.message?.content) {
        for (const block of json.message.content) {
          if (block.type === 'text') {
            blocks.push({ type: 'summary', content: block.text })
          } else if (block.type === 'tool_use') {
            blocks.push({ type: 'meta', content: `🔧 使用工具: ${block.name}` })
          }
        }
        continue
      }

      // Skip other JSON silently
    } catch {
      // Not JSON — show as plain text
      blocks.push({ type: 'text', content: line })
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
      <div className="flex items-center justify-end mb-2">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-[10px] text-gray-600 hover:text-gray-400 cursor-pointer"
        >
          {showRaw ? '← 可读视图' : '原始日志'}
        </button>
      </div>
      <div
        ref={containerRef}
        className="bg-gray-950 rounded-lg p-4 max-h-72 overflow-y-auto"
      >
        {showRaw ? (
          <pre className="text-xs font-mono text-gray-400 whitespace-pre-wrap">{raw}</pre>
        ) : blocks.length === 0 ? (
          <p className="text-xs text-gray-600">正在处理中...</p>
        ) : (
          <div className="space-y-3">
            {blocks.map((block, i) => (
              <div key={i}>
                {block.type === 'summary' && (
                  <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed bg-gray-900 rounded-lg p-3 border-l-2 border-indigo-500">
                    {block.content}
                  </div>
                )}
                {block.type === 'text' && (
                  <div className="text-xs text-gray-400 whitespace-pre-wrap">{block.content}</div>
                )}
                {block.type === 'error' && (
                  <div className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">{block.content}</div>
                )}
                {block.type === 'meta' && (
                  <div className="text-[10px] text-gray-600 flex items-center gap-1">
                    <span className="w-1 h-1 bg-gray-700 rounded-full" />
                    {block.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
