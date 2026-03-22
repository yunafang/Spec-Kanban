import { useState } from 'react'
import { useUiStore } from '@/store/uiStore'
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
  brainstorm: { ring: 'ring-amber-400', bg: 'bg-amber-500', border: 'border-amber-200' },
  planning: { ring: 'ring-blue-400', bg: 'bg-blue-600', border: 'border-blue-200' },
  executing: { ring: 'ring-green-400', bg: 'bg-green-600', border: 'border-green-200' },
  inbox: { ring: 'ring-gray-400', bg: 'bg-gray-400', border: 'border-gray-300' },
  done: { ring: 'ring-purple-400', bg: 'bg-purple-600', border: 'border-purple-200' },
}

export default function StageProgress({ task }: { task: Task }) {
  const currentStatus = task.status === 'needs_human' ? (task.previousStatus || guessStage(task)) : task.status
  const currentIdx = getStageIndex(currentStatus)
  const isBlocked = task.status === 'needs_human'
  const selectFile = useUiStore((s) => s.selectFile)
  const setPreviewArtifact = useUiStore((s) => s.setPreviewArtifact)
  const [selectedStage, setSelectedStage] = useState<number | null>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)

  const handleStageClick = async (i: number) => {
    const stage = stages[i]
    const isPast = i < currentIdx
    const isCurrent = i === currentIdx

    // Only allow clicking completed or current stages
    if (!isPast && !isCurrent) return

    // For stages with artifact files → open in center FileViewer for full preview
    if (stage.artifactKey && task.artifacts[stage.artifactKey]) {
      const artPath = task.artifacts[stage.artifactKey]!
      selectFile(artPath)
      setSelectedStage(null)
      setPreviewContent(null)
      return
    }

    // For artifact stages without a file path → try loading from log
    if (stage.artifactKey && !task.artifacts[stage.artifactKey]) {
      try {
        const res = await fetch(`/api/tasks/${task.id}/log`)
        const logText = await res.text()
        if (logText.trim()) {
          for (const line of logText.split('\n')) {
            try {
              const json = JSON.parse(line)
              const result = json.result || ''
              if (!result) continue
              const codeMatch = result.match(/```json\s*\n?([\s\S]*?)```/)
              if (codeMatch) {
                try {
                  const inner = JSON.parse(codeMatch[1])
                  const content = inner.design || inner.plan
                  if (content) {
                    const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
                    setPreviewArtifact({ content: text, title: task.title, taskId: task.id, stage: stage.artifactKey })
                    setSelectedStage(null)
                    setPreviewContent(null)
                    return
                  }
                } catch {}
              }
              if (result.length > 20) {
                setPreviewArtifact({ content: result, title: task.title, taskId: task.id, stage: stage.artifactKey })
                setSelectedStage(null)
                setPreviewContent(null)
                return
              }
            } catch {}
          }
        }
      } catch {}
      // If nothing found from log, show hint
      setSelectedStage(i)
      setPreviewContent('该阶段暂无产出')
      return
    }

    // Toggle off if already selected (for non-artifact stages)
    if (selectedStage === i) {
      setSelectedStage(null)
      setPreviewContent(null)
      return
    }

    setSelectedStage(i)
    setPreviewContent(null)

    // Inline hints for stages without artifact files
    if (stage.key === 'executing') {
      setPreviewContent('查看下方执行日志获取详情')
    } else if (stage.key === 'inbox') {
      setPreviewContent('需求已提交，等待调度')
    } else if (stage.key === 'done') {
      setPreviewContent(task.merged ? '✅ 任务已完成并合并到 main' : '✅ 任务已完成')
    } else {
      setPreviewContent('该阶段暂无产出')
    }
  }

  return (
    <div className="mb-5 bg-gray-50 rounded-lg overflow-hidden">
      {/* Progress bar */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-700">流程进度 <span className="text-gray-400 font-normal">（点击查看每步产出）</span></span>
          {isBlocked && (
            <span className="text-xs text-amber-600 animate-pulse">⏸ 等待人工处理</span>
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
                    ${isPast && !isSelected ? 'bg-green-600' : ''}
                    ${isPast && isSelected ? `${colors.bg} ring-2 ${colors.ring} ring-offset-1 ring-offset-white scale-110` : ''}
                    ${isCurrent && !isBlocked ? `bg-blue-600 ring-2 ring-blue-400 ring-offset-1 ring-offset-white ${isSelected ? 'scale-110' : ''}` : ''}
                    ${isCurrent && isBlocked ? `bg-amber-500 ring-2 ring-amber-400 ring-offset-1 ring-offset-white ${isSelected ? 'scale-110' : ''}` : ''}
                    ${isFuture ? 'bg-gray-200' : ''}
                  `}>
                    {isPast ? '✓' : stage.icon}
                  </div>
                  <span className={`text-[10px] mt-1 transition-colors ${
                    isSelected ? 'text-gray-900 font-bold' :
                    isCurrent ? 'text-gray-800 font-semibold' : 'text-gray-500'
                  }`}>
                    {stage.label}
                  </span>
                </div>
                {i < stages.length - 1 && (
                  <div className={`h-0.5 w-full -mt-4 ${i < currentIdx ? 'bg-green-600' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Stage hint panel — only for non-artifact stages (inbox/executing/done) */}
      {selectedStage !== null && previewContent && (
        <div className={`border-t ${stageColors[stages[selectedStage].key]?.border || 'border-gray-300'} bg-[#f6f8fa] px-4 py-2.5`}>
          <div className="flex items-center gap-2">
            <span className="text-sm">{stages[selectedStage].icon}</span>
            <span className="text-xs text-gray-600">{previewContent}</span>
            <button
              onClick={() => { setSelectedStage(null); setPreviewContent(null) }}
              className="ml-auto text-xs text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

