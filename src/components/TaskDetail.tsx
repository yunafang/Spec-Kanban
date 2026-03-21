import { useState } from 'react'
import LogViewer from './LogViewer'
import { useTaskStore } from '@/store/taskStore'
import type { Task } from '@/types'

interface TaskDetailProps {
  task: Task
  onClose: () => void
}

const statusLabels: Record<string, string> = {
  inbox: '待处理', brainstorm: 'Brainstorm', planning: 'Planning',
  executing: 'Executing', needs_human: '需人工', done: '完成'
}

const stages = [
  { key: 'inbox', label: '待处理', icon: '📥', artifactKey: null, previewLabel: null },
  { key: 'brainstorm', label: 'Brainstorm', icon: '💡', artifactKey: 'design' as const, previewLabel: '设计方案' },
  { key: 'planning', label: 'Planning', icon: '📝', artifactKey: 'plan' as const, previewLabel: '实施计划' },
  { key: 'executing', label: 'Executing', icon: '🚀', artifactKey: null, previewLabel: '执行日志' },
  { key: 'done', label: '完成', icon: '✅', artifactKey: null, previewLabel: null },
]

function getStageIndex(status: string): number {
  const idx = stages.findIndex((s) => s.key === status)
  return idx >= 0 ? idx : 1
}

function guessStage(task: Task): string {
  if (task.humanAction === 'confirm_design') return 'brainstorm'
  if (task.humanAction === 'confirm_plan') return 'planning'
  if (task.humanAction === 'confirm_merge') return 'executing'
  if (task.humanAction === 'confirm_split') return 'brainstorm'
  if (task.artifacts.plan) return 'planning'
  if (task.artifacts.design) return 'brainstorm'
  return 'inbox'
}

function StageProgress({ task }: { task: Task }) {
  const currentStatus = task.status === 'needs_human' ? (task.previousStatus || guessStage(task)) : task.status
  const currentIdx = getStageIndex(currentStatus)
  const isBlocked = task.status === 'needs_human'
  const [selectedStage, setSelectedStage] = useState<number | null>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
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
      return
    }

    setSelectedStage(i)
    setPreviewContent(null)

    // Load preview content based on stage
    if (stage.artifactKey && task.artifacts[stage.artifactKey]) {
      setLoadingPreview(true)
      try {
        const res = await fetch(`/api/artifacts/${encodeURIComponent(task.artifacts[stage.artifactKey]!)}`)
        const text = await res.text()
        setPreviewContent(text)
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

  const stageColors: Record<string, { ring: string; bg: string; border: string }> = {
    brainstorm: { ring: 'ring-amber-400', bg: 'bg-amber-600', border: 'border-amber-500/30' },
    planning: { ring: 'ring-indigo-400', bg: 'bg-indigo-600', border: 'border-indigo-500/30' },
    executing: { ring: 'ring-emerald-400', bg: 'bg-emerald-600', border: 'border-emerald-500/30' },
    inbox: { ring: 'ring-slate-400', bg: 'bg-slate-600', border: 'border-slate-500/30' },
    done: { ring: 'ring-cyan-400', bg: 'bg-cyan-600', border: 'border-cyan-500/30' },
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
            <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {previewContent}
            </div>
          ) : (
            <div className="text-xs text-gray-600">该阶段暂无产出</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TaskDetail({ task: initialTask, onClose }: TaskDetailProps) {
  const [feedback, setFeedback] = useState('')
  // Get live task from store
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === initialTask.id)) || initialTask

  const handleAction = async (action: string) => {
    await fetch(`/api/tasks/${task.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, feedback: feedback || undefined })
    })
    setFeedback('')
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-end z-50" onClick={onClose}>
      <div
        className="bg-gray-900 w-full max-w-2xl h-full overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">{task.title}</h2>
            <span className="text-xs text-gray-500">
              {statusLabels[task.status]} {task.version > 1 && `· v${task.version}`}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl cursor-pointer">×</button>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-1">描述</h3>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{task.description}</p>
        </div>

        <StageProgress task={task} />

        {/* Timing info */}
        <div className="mb-4 flex gap-4 text-xs text-gray-500">
          {task.createdAt && (
            <span>创建: {new Date(task.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          )}
          {task.startedAt && (
            <span>开始: {new Date(task.startedAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          )}
          {task.completedAt && (
            <span>完成: {new Date(task.completedAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>

        {task.branch && (
          <div className="mb-4 text-xs text-gray-500">
            分支: <code className="bg-gray-800 px-2 py-0.5 rounded">{task.branch}</code>
            {task.merged && <span className="ml-2 text-emerald-400">已合并</span>}
          </div>
        )}

        {/* Human action buttons */}
        {task.humanAction && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="text-sm font-medium text-red-400 mb-2">
              {task.humanAction === 'confirm_design' && '设计方案已生成，请确认'}
              {task.humanAction === 'confirm_plan' && '实施计划已生成，请确认'}
              {task.humanAction === 'confirm_split' && '建议拆分为子任务，请确认'}
              {task.humanAction === 'confirm_merge' && '编码完成，确认合并到 main？'}
              {task.humanAction === 'error' && '执行出错，请查看日志'}
            </div>
            <textarea
              className="w-full bg-gray-800 rounded-lg px-3 py-2 mb-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500 h-16 resize-none"
              placeholder="修改意见（可选）..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <div className="flex gap-2 flex-wrap">
              {task.humanAction !== 'error' && (
                <button
                  onClick={() => handleAction(task.humanAction!)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-medium cursor-pointer"
                >
                  确认
                </button>
              )}
              <button
                onClick={() => handleAction('reject')}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium cursor-pointer"
              >
                拒绝
              </button>
              <button
                onClick={() => handleAction('rollback_to_brainstorm')}
                className="px-3 py-1.5 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 rounded text-xs font-medium cursor-pointer"
              >
                回退到 Brainstorm
              </button>
              <button
                onClick={() => handleAction('cancel')}
                className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded text-xs font-medium cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Rollback actions — shown when no humanAction pending */}
        {!task.humanAction && task.status !== 'inbox' && (
          <div className="mb-4 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">操作</span>
              <div className="flex gap-2">
                {task.status === 'done' && task.merged && (
                  <button
                    onClick={() => handleAction('rollback_code')}
                    className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded text-xs font-medium cursor-pointer"
                  >
                    回滚代码 (git revert)
                  </button>
                )}
                {task.status === 'done' && !task.merged && task.branch && (
                  <button
                    onClick={() => handleAction('rollback_branch')}
                    className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded text-xs font-medium cursor-pointer"
                  >
                    删除分支
                  </button>
                )}
                <button
                  onClick={() => handleAction('rollback_to_brainstorm')}
                  className="px-3 py-1.5 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 rounded text-xs font-medium cursor-pointer"
                >
                  回退到 Brainstorm
                </button>
                {(task.status === 'brainstorm' || task.status === 'planning' || task.status === 'executing') && (
                  <button
                    onClick={() => handleAction('cancel')}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium cursor-pointer"
                  >
                    停止
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stage outputs — integrated into StageProgress above */}

        {/* Log viewer — collapsible */}
        <details className="mb-4">
          <summary className="text-sm font-semibold text-gray-400 mb-2 cursor-pointer hover:text-gray-300">
            执行日志 ▸
          </summary>
          <LogViewer taskId={task.id} />
        </details>

        {/* History */}
        {task.history.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">历史</h3>
            {task.history.map((h, i) => (
              <div key={i} className="text-xs text-gray-500 mb-1">
                {h.at.slice(0, 16)} — {h.action} (v{h.fromVersion}) {h.reason && `— ${h.reason}`}
              </div>
            ))}
          </div>
        )}

        {/* Children tasks */}
        {task.children.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">子任务</h3>
            <ChildTasks parentId={task.id} />
          </div>
        )}
      </div>
    </div>
  )
}

const accentStyles: Record<string, string> = {
  amber: 'border-amber-500/30 bg-amber-500/5',
  indigo: 'border-indigo-500/30 bg-indigo-500/5',
  emerald: 'border-emerald-500/30 bg-emerald-500/5',
}

function ArtifactViewer({ label, path, defaultExpanded = false, accentColor = 'indigo' }: {
  label: string; path: string; defaultExpanded?: boolean; accentColor?: string
}) {
  const [content, setContent] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [loaded, setLoaded] = useState(false)

  // Auto-load when defaultExpanded
  const loadContent = async () => {
    if (loaded) {
      setExpanded(!expanded)
      return
    }
    try {
      const res = await fetch(`/api/artifacts/${encodeURIComponent(path)}`)
      const text = await res.text()
      setContent(text)
      setLoaded(true)
      setExpanded(true)
    } catch {
      setContent('无法加载')
      setLoaded(true)
      setExpanded(true)
    }
  }

  // Auto-load on mount if defaultExpanded
  useState(() => { if (defaultExpanded) loadContent() })

  const style = accentStyles[accentColor] || accentStyles.indigo

  return (
    <div className={`rounded-lg overflow-hidden border ${style}`}>
      <button
        onClick={loadContent}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left cursor-pointer hover:bg-white/5 transition-colors"
      >
        <span className="font-medium">{label}</span>
        <span className="flex-1" />
        <span className="text-gray-600 text-xs">{expanded ? '收起' : '展开'}</span>
      </button>
      {expanded && content && (
        <div className="px-4 pb-4 text-sm text-gray-200 whitespace-pre-wrap border-t border-gray-800/50 pt-3 max-h-64 overflow-y-auto leading-relaxed">
          {content}
        </div>
      )}
    </div>
  )
}

function ChildTasks({ parentId }: { parentId: string }) {
  const children = useTaskStore((s) => s.tasks.filter((t) => t.parentId === parentId))
  return (
    <div className="space-y-1">
      {children.map((child) => (
        <div key={child.id} className="flex items-center gap-2 text-xs">
          <span className={child.status === 'done' ? 'text-emerald-400' : 'text-gray-500'}>
            {child.status === 'done' ? '✅' : '⏳'}
          </span>
          <span className="text-gray-300">{child.title}</span>
          <span className="text-gray-600">{child.status}</span>
        </div>
      ))}
    </div>
  )
}
