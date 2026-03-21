import { useEffect, useState } from 'react'

interface StageCardProps {
  label: string
  artifactPath?: string
  isActive: boolean
  isCompleted: boolean
  onAction?: (action: string) => void
}

export default function StageCard({ label, artifactPath, isActive, isCompleted, onAction }: StageCardProps) {
  const [expanded, setExpanded] = useState(isActive)
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-expand active cards
  useEffect(() => {
    if (isActive) setExpanded(true)
  }, [isActive])

  // Fetch artifact content when expanded
  useEffect(() => {
    if (!expanded || !artifactPath || content !== null) return
    setLoading(true)
    setError(null)
    fetch(`/api/artifacts/${encodeURIComponent(artifactPath)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((text) => {
        setContent(text)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || '无法加载')
        setLoading(false)
      })
  }, [expanded, artifactPath, content])

  // Border color based on state
  const borderColor = isCompleted
    ? 'border-l-emerald-500'
    : isActive
      ? 'border-l-amber-500'
      : 'border-l-gray-700'

  const bgColor = isActive ? 'bg-amber-500/5' : 'bg-gray-800/30'

  return (
    <div className={`rounded-lg border border-gray-700/50 ${borderColor} border-l-2 ${bgColor} overflow-hidden`}>
      {/* Header — click to toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left cursor-pointer hover:bg-white/5 transition-colors"
      >
        <span className="font-medium text-gray-200">{label}</span>
        <span className="flex-1" />
        {isCompleted && (
          <span className="text-xs text-emerald-400 font-medium">✓ 已确认</span>
        )}
        {isActive && (
          <span className="text-xs text-amber-400 animate-pulse">等待确认</span>
        )}
        <span className="text-gray-600 text-xs">{expanded ? '▾' : '▸'}</span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-700/50 px-4 pb-4 pt-3">
          {loading && (
            <div className="text-xs text-gray-500 animate-pulse">加载中...</div>
          )}
          {error && (
            <div className="text-xs text-red-400">加载失败: {error}</div>
          )}
          {content && (
            <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {content}
            </div>
          )}
          {!artifactPath && !loading && (
            <div className="text-xs text-gray-600">该阶段暂无产出</div>
          )}

          {/* Action buttons for active stage */}
          {isActive && onAction && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700/50">
              <button
                onClick={() => onAction('confirm')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-medium cursor-pointer transition-colors"
              >
                确认
              </button>
              <button
                onClick={() => onAction('create_issue')}
                className="px-3 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 rounded text-xs font-medium cursor-pointer transition-colors"
              >
                提 Issue
              </button>
              <button
                onClick={() => onAction('rollback_to_brainstorm')}
                className="px-3 py-1.5 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 rounded text-xs font-medium cursor-pointer transition-colors"
              >
                回退
              </button>
              <button
                onClick={() => onAction('cancel')}
                className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded text-xs font-medium cursor-pointer transition-colors"
              >
                取消
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
