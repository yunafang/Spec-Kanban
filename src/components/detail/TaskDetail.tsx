import { useState, useEffect } from 'react'
import StageProgress from './StageProgress'
import { useTaskStore } from '@/store/taskStore'
import { useUiStore } from '@/store/uiStore'
import type { Task } from '@/types'

interface TaskDetailProps {
  taskId: string
}

const statusLabels: Record<string, string> = {
  inbox: '待处理', brainstorm: 'Brainstorm', planning: 'Planning',
  executing: 'Executing', needs_human: '需人工', done: '完成'
}

function ChildTasks({ parentId }: { parentId: string }) {
  const children = useTaskStore((s) => s.tasks.filter((t) => t.parentId === parentId))
  return (
    <div className="space-y-1">
      {children.map((child) => (
        <div key={child.id} className="flex items-center gap-2 text-xs">
          <span className={child.status === 'done' ? 'text-green-600' : 'text-gray-500'}>
            {child.status === 'done' ? '✅' : '⏳'}
          </span>
          <span className="text-gray-700">{child.title}</span>
          <span className="text-gray-400">{child.status}</span>
        </div>
      ))}
    </div>
  )
}

function HumanActionPanel({ task, feedback, setFeedback, onAction }: {
  task: Task
  feedback: string
  setFeedback: (v: string) => void
  onAction: (action: string) => void
}) {
  const [artifactContent, setArtifactContent] = useState<string | null>(null)
  const selectFile = useUiStore((s) => s.selectFile)
  const setPreviewArtifact = useUiStore((s) => s.setPreviewArtifact)

  // Determine which artifact to show
  const artifactPath =
    task.humanAction === 'confirm_design' ? task.artifacts?.design :
    task.humanAction === 'confirm_plan' ? task.artifacts?.plan :
    null

  const artifactStage =
    task.humanAction === 'confirm_design' ? 'design' :
    task.humanAction === 'confirm_plan' ? 'plan' : 'design'

  const actionLabel =
    task.humanAction === 'confirm_design' ? '设计方案' :
    task.humanAction === 'confirm_plan' ? '实施计划' :
    task.humanAction === 'confirm_split' ? '拆分方案' :
    task.humanAction === 'confirm_merge' ? '代码合并' :
    task.humanAction === 'error' ? '错误' : ''

  // Auto-load artifact content — try artifact file first, fallback to log
  useEffect(() => {
    if (artifactPath) {
      fetch(`/api/files/content?path=${encodeURIComponent(artifactPath)}`)
        .then(r => r.json())
        .then(data => setArtifactContent(data.content || null))
        .catch(() => loadFromLog())
    } else {
      loadFromLog()
    }

    function loadFromLog() {
      fetch(`/api/tasks/${task.id}/log`)
        .then(r => r.text())
        .then(logText => {
          if (!logText.trim()) { setArtifactContent(null); return }
          for (const line of logText.split('\n')) {
            try {
              const json = JSON.parse(line)
              const result = json.result || ''
              if (!result) continue
              const codeMatch = result.match(/```json\s*\n?([\s\S]*?)```/)
              if (codeMatch) {
                try {
                  const inner = JSON.parse(codeMatch[1])
                  if (inner.design) { setArtifactContent(typeof inner.design === 'string' ? inner.design : JSON.stringify(inner.design, null, 2)); return }
                  if (inner.plan) { setArtifactContent(typeof inner.plan === 'string' ? inner.plan : JSON.stringify(inner.plan, null, 2)); return }
                } catch {}
              }
              if (result.length > 20) { setArtifactContent(result); return }
            } catch {}
          }
          setArtifactContent(null)
        })
        .catch(() => setArtifactContent(null))
    }
  }, [artifactPath, task.id])

  const openInCenter = () => {
    if (artifactPath) {
      selectFile(artifactPath)
    } else if (artifactContent) {
      setPreviewArtifact({ content: artifactContent, title: task.title, taskId: task.id, stage: artifactStage })
    }
  }

  const borderColor =
    task.humanAction === 'confirm_design' ? 'border-amber-200' :
    task.humanAction === 'confirm_plan' ? 'border-blue-200' :
    task.humanAction === 'confirm_merge' ? 'border-green-200' :
    'border-red-200'

  const bgColor =
    task.humanAction === 'confirm_design' ? 'bg-amber-50' :
    task.humanAction === 'confirm_plan' ? 'bg-blue-50' :
    task.humanAction === 'confirm_merge' ? 'bg-green-50' :
    'bg-red-50'

  // Truncate content for right panel summary
  const summaryContent = artifactContent
    ? artifactContent.length > 200 ? artifactContent.slice(0, 200) + '...' : artifactContent
    : null

  return (
    <div className={`mb-4 border ${borderColor} ${bgColor} rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-200">
        <div className="text-sm font-semibold text-gray-800">
          📋 {actionLabel}待确认
        </div>
        {artifactContent && (
          <button
            onClick={openInCenter}
            className="text-[10px] text-blue-600 hover:text-blue-500 cursor-pointer"
          >
            在中间面板查看全文 →
          </button>
        )}
      </div>

      {/* Truncated preview — click to open full in center */}
      {summaryContent && (
        <div
          className="px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-white/50 transition-colors"
          onClick={openInCenter}
        >
          <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap leading-relaxed line-clamp-4">{summaryContent}</pre>
          <div className="mt-1.5 text-[10px] text-blue-600">点击查看全文 →</div>
        </div>
      )}

      {task.humanAction === 'error' && !artifactContent && (
        <div className="px-4 py-3 text-sm text-red-600 border-b border-gray-200">
          执行出错，请查看下方执行日志了解详情
        </div>
      )}

      {/* Feedback + actions */}
      <div className="px-4 py-3">
        <textarea
          className="w-full bg-gray-100 rounded-lg px-3 py-2 mb-3 text-xs outline-none focus:ring-1 focus:ring-blue-500 h-14 resize-none"
          placeholder="修改意见（可选）..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
        <div className="flex gap-2 flex-wrap">
          {task.humanAction !== 'error' && (
            <button
              onClick={() => onAction(task.humanAction!)}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-medium cursor-pointer"
            >
              ✓ 确认通过
            </button>
          )}
          <button
            onClick={() => onAction('reject')}
            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-xs font-medium cursor-pointer"
          >
            拒绝
          </button>
          <button
            onClick={() => onAction('rollback_to_brainstorm')}
            className="px-3 py-1.5 bg-amber-100 text-amber-600 hover:bg-amber-100 rounded-lg text-xs font-medium cursor-pointer"
          >
            ↩ 回退
          </button>
          <button
            onClick={() => onAction('cancel')}
            className="px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-100 rounded-lg text-xs font-medium cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={() => {
              const uiStore = useUiStore.getState()
              uiStore.setRightTab('issues')
            }}
            className="px-3 py-1.5 bg-blue-100 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium cursor-pointer"
          >
            💬 提 Issue
          </button>
        </div>
      </div>
    </div>
  )
}

function CodeDiff({ taskId, branch }: { taskId: string; branch: string }) {
  const [diff, setDiff] = useState('')

  useEffect(() => {
    fetch(`/api/tasks/${taskId}/diff`)
      .then((r) => r.json())
      .then((d) => setDiff(d.diff || ''))
      .catch(() => {})
  }, [taskId])

  if (!diff) return null

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-600 mb-2">代码变更</h3>
      <pre className="text-xs font-mono text-gray-700 bg-white rounded-lg p-3 whitespace-pre-wrap max-h-48 overflow-y-auto">{diff}</pre>
    </div>
  )
}

function OutputFiles({ taskId }: { taskId: string }) {
  const [files, setFiles] = useState<string[]>([])
  const selectFile = useUiStore((s) => s.selectFile)

  useEffect(() => {
    fetch(`/api/tasks/${taskId}/files`)
      .then((r) => r.json())
      .then((data) => setFiles(data.files || []))
      .catch(() => {})
  }, [taskId])

  if (files.length === 0) return null

  return (
    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
      <div className="text-xs font-semibold text-green-600 mb-2">📦 产出文件 ({files.length})</div>
      <div className="space-y-1">
        {files.map((file) => (
          <button
            key={file}
            onClick={() => selectFile(file)}
            className="w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-green-50 rounded cursor-pointer truncate"
          >
            📄 {file}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function TaskDetail({ taskId }: TaskDetailProps) {
  const [feedback, setFeedback] = useState('')
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === taskId))

  if (!task) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        选择一个任务查看详情
      </div>
    )
  }

  const handleAction = async (action: string) => {
    await fetch(`/api/tasks/${task.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, feedback: feedback || undefined })
    })
    setFeedback('')
  }

  return (
    <div className="h-full overflow-y-auto p-5">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">{task.title}</h2>
        <span className="text-xs text-gray-500">
          {statusLabels[task.status]} {task.version > 1 && `· v${task.version}`}
        </span>
      </div>

      {/* Description */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-600 mb-1">描述</h3>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
      </div>

      {/* Stage progress pipeline */}
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

      {/* Branch info */}
      {task.branch && (
        <div className="mb-4 text-xs text-gray-500">
          分支: <code className="bg-gray-100 px-2 py-0.5 rounded">{task.branch}</code>
          {task.merged && <span className="ml-2 text-green-600">已合并</span>}
        </div>
      )}

      {/* Output files — for completed/executing tasks */}
      {task.status === 'done' && (
        <OutputFiles taskId={task.id} />
      )}

      {/* Code diff — for completed tasks with a branch */}
      {task.status === 'done' && task.branch && (
        <CodeDiff taskId={task.id} branch={task.branch} />
      )}

      {/* Human action — with artifact preview */}
      {task.humanAction && (
        <HumanActionPanel task={task} feedback={feedback} setFeedback={setFeedback} onAction={handleAction} />
      )}

      {/* Rollback actions -- shown when no humanAction pending */}
      {!task.humanAction && task.status !== 'inbox' && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-300 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 font-medium">操作</span>
            <div className="flex gap-2">
              {task.status === 'done' && task.merged && (
                <button
                  onClick={() => handleAction('rollback_code')}
                  className="px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-100 rounded text-xs font-medium cursor-pointer"
                >
                  回滚代码 (git revert)
                </button>
              )}
              {task.status === 'done' && !task.merged && task.branch && (
                <button
                  onClick={() => handleAction('rollback_branch')}
                  className="px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-100 rounded text-xs font-medium cursor-pointer"
                >
                  删除分支
                </button>
              )}
              <button
                onClick={() => handleAction('rollback_to_brainstorm')}
                className="px-3 py-1.5 bg-amber-100 text-amber-600 hover:bg-amber-100 rounded text-xs font-medium cursor-pointer"
              >
                回退到 Brainstorm
              </button>
              {(task.status === 'brainstorm' || task.status === 'planning' || task.status === 'executing') && (
                <button
                  onClick={() => handleAction('cancel')}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-xs font-medium cursor-pointer"
                >
                  停止
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {(task.history?.length || 0) > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">历史</h3>
          {(task.history || []).map((h, i) => (
            <div key={i} className="text-xs text-gray-500 mb-1">
              {h.at.slice(0, 16)} — {h.action} (v{h.fromVersion}) {h.reason && `— ${h.reason}`}
            </div>
          ))}
        </div>
      )}

      {/* Children tasks */}
      {(task.children?.length || 0) > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">子任务</h3>
          <ChildTasks parentId={task.id} />
        </div>
      )}
    </div>
  )
}
