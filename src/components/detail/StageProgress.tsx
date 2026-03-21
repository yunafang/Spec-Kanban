import { useState, useMemo } from 'react'
import { marked } from 'marked'
import type { Task } from '@/types'

const stages = [
  { key: 'inbox', label: '待处理', icon: '📥', artifactKey: null, previewLabel: null },
  { key: 'brainstorm', label: 'Brainstorm', icon: '💡', artifactKey: 'design' as const, previewLabel: '设计方案' },
  { key: 'planning', label: 'Planning', icon: '📝', artifactKey: 'plan' as const, previewLabel: '实施计划' },
  { key: 'executing', label: 'Executing', icon: '🚀', artifactKey: null, previewLabel: '执行日志' },
  { key: 'done', label: '完成', icon: '✅', artifactKey: null, previewLabel: null },
]

export function getStageIndex(status: string): number {
  const idx = stages.findIndex((s) => s.key === status)
  return idx >= 0 ? idx : 1
}

export function guessStage(task: Task): string {
  if (task.humanAction === 'confirm_design') return 'brainstorm'
  if (task.humanAction === 'confirm_plan') return 'planning'
  if (task.humanAction === 'confirm_merge') return 'executing'
  if (task.humanAction === 'confirm_split') return 'brainstorm'
  if (task.artifacts?.plan) return 'planning'
  if (task.artifacts?.design) return 'brainstorm'
  return 'inbox'
}

const stageColors: Record<string, { ring: string; bg: string; border: string }> = {
  brainstorm: { ring: 'ring-amber-400', bg: 'bg-amber-600', border: 'border-amber-500/30' },
  planning: { ring: 'ring-indigo-400', bg: 'bg-indigo-600', border: 'border-indigo-500/30' },
  executing: { ring: 'ring-emerald-400', bg: 'bg-emerald-600', border: 'border-emerald-500/30' },
  inbox: { ring: 'ring-slate-400', bg: 'bg-slate-600', border: 'border-slate-500/30' },
  done: { ring: 'ring-cyan-400', bg: 'bg-cyan-600', border: 'border-cyan-500/30' },
}

export default function StageProgress({ task }: { task: Task }) {
  const currentStatus = task.status === 'needs_human' ? (task.previousStatus || guessStage(task)) : task.status
  const currentIdx = getStageIndex(currentStatus)
  const isBlocked = task.status === 'needs_human'
  const [selectedStage, setSelectedStage] = useState<number | null>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [artifactPath, setArtifactPath] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const handleStageClick = async (i: number) => {
    const stage = stages[i]
    const isPast = i < currentIdx
    const isCurrent = i === currentIdx

    // Only allow clicking completed or current stages
    if (!isPast && !isCurrent) return

    // Toggle off if already selected
    if (selectedStage === i) {
      setSelectedStage(null)
      setPreviewContent(null)
      setArtifactPath(null)
      return
    }

    setSelectedStage(i)
    setPreviewContent(null)
    setArtifactPath(null)

    // Load preview content based on stage
    if (stage.artifactKey && task.artifacts[stage.artifactKey]) {
      const artPath = task.artifacts[stage.artifactKey]!
      setArtifactPath(artPath)
      setLoadingPreview(true)
      try {
        const res = await fetch(`/api/files/content?path=${encodeURIComponent(artPath)}`)
        const data = await res.json()
        setPreviewContent(data.content || '无法加载预览')
      } catch {
        setPreviewContent('无法加载预览')
      }
      setLoadingPreview(false)
    } else if (stage.key === 'executing') {
      // Show log summary for executing stage
      setLoadingPreview(true)
      try {
        const res = await fetch(`/api/tasks/${task.id}/log`)
        const text = await res.text()
        setPreviewContent(text ? '查看下方执行日志获取详情' : '暂无执行记录')
      } catch {
        setPreviewContent('暂无执行记录')
      }
      setLoadingPreview(false)
    } else if (stage.key === 'inbox') {
      setPreviewContent('需求已提交，等待调度')
    } else if (stage.key === 'done') {
      setPreviewContent(task.merged ? '✅ 任务已完成并合并到 main' : '✅ 任务已完成')
    }
  }

  return (
    <div className="mb-5 bg-gray-800/50 rounded-lg overflow-hidden">
      {/* Progress bar */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-400">流程进度 <span className="text-gray-600 font-normal">（点击查看每步产出）</span></span>
          {isBlocked && (
            <span className="text-xs text-amber-400 animate-pulse">⏸ 等待人工处理</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {stages.map((stage, i) => {
            const isPast = i < currentIdx
            const isCurrent = i === currentIdx
            const isFuture = i > currentIdx
            const isSelected = selectedStage === i
            const clickable = isPast || isCurrent
            const colors = stageColors[stage.key] || stageColors.inbox

            return (
              <div key={stage.key} className="flex items-center flex-1">
                <div
                  className={`flex flex-col items-center flex-1 ${isFuture ? 'opacity-30' : ''} ${clickable ? 'cursor-pointer' : ''}`}
                  onClick={() => clickable && handleStageClick(i)}
                >
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all
                    ${isPast && !isSelected ? 'bg-emerald-600' : ''}
                    ${isPast && isSelected ? `${colors.bg} ring-2 ${colors.ring} ring-offset-1 ring-offset-gray-900 scale-110` : ''}
                    ${isCurrent && !isBlocked ? `bg-indigo-600 ring-2 ring-indigo-400 ring-offset-1 ring-offset-gray-900 ${isSelected ? 'scale-110' : ''}` : ''}
                    ${isCurrent && isBlocked ? `bg-amber-600 ring-2 ring-amber-400 ring-offset-1 ring-offset-gray-900 ${isSelected ? 'scale-110' : ''}` : ''}
                    ${isFuture ? 'bg-gray-700' : ''}
                  `}>
                    {isPast ? '✓' : stage.icon}
                  </div>
                  <span className={`text-[10px] mt-1 transition-colors ${
                    isSelected ? 'text-white font-bold' :
                    isCurrent ? 'text-white font-semibold' : 'text-gray-500'
                  }`}>
                    {stage.label}
                  </span>
                </div>
                {i < stages.length - 1 && (
                  <div className={`h-0.5 w-full -mt-4 ${i < currentIdx ? 'bg-emerald-600' : 'bg-gray-700'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Stage preview panel */}
      {selectedStage !== null && (
        <div className={`border-t ${stageColors[stages[selectedStage].key]?.border || 'border-gray-700'} bg-gray-900/50 p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">{stages[selectedStage].icon}</span>
            <span className="text-sm font-semibold text-gray-200">
              {stages[selectedStage].previewLabel || stages[selectedStage].label}
            </span>
            <button
              onClick={() => { setSelectedStage(null); setPreviewContent(null) }}
              className="ml-auto text-xs text-gray-500 hover:text-gray-300 cursor-pointer"
            >
              收起 ×
            </button>
          </div>
          {loadingPreview ? (
            <div className="text-xs text-gray-500 animate-pulse">加载中...</div>
          ) : previewContent ? (
            artifactPath?.endsWith('.md') ? (
              <StageMarkdown content={previewContent} />
            ) : (
              <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {previewContent}
              </div>
            )
          ) : (
            <div className="text-xs text-gray-600">该阶段暂无产出</div>
          )}
        </div>
      )}
    </div>
  )
}

/** Markdown renderer for stage artifact preview */
function StageMarkdown({ content }: { content: string }) {
  const html = useMemo(() => {
    marked.setOptions({ breaks: true, gfm: true })
    return marked.parse(content) as string
  }, [content])

  return (
    <div
      className="prose prose-invert prose-sm max-w-none max-h-64 overflow-y-auto
        prose-headings:text-gray-100 prose-headings:border-b prose-headings:border-gray-800/30 prose-headings:pb-1
        prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
        prose-p:text-gray-300 prose-p:leading-relaxed prose-p:text-xs
        prose-a:text-indigo-400
        prose-strong:text-gray-200
        prose-code:text-indigo-300 prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[11px]
        prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800 prose-pre:text-[11px]
        prose-blockquote:border-indigo-500 prose-blockquote:text-gray-400
        prose-li:text-gray-300 prose-li:text-xs
        prose-table:text-[11px]
        prose-th:text-gray-400 prose-th:border-gray-700 prose-th:px-2 prose-th:py-1
        prose-td:border-gray-800 prose-td:px-2 prose-td:py-1"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
