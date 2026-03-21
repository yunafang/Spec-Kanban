import { useState, useEffect, useMemo } from 'react'
import { marked } from 'marked'
import LogViewer from '@/components/LogViewer'
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

function HumanActionPanel({ task, feedback, setFeedback, onAction }: {
  task: Task
  feedback: string
  setFeedback: (v: string) => void
  onAction: (action: string) => void
}) {
  const [artifactContent, setArtifactContent] = useState<string | null>(null)
  const selectFile = useUiStore((s) => s.selectFile)

  // Determine which artifact to show
  const artifactPath =
    task.humanAction === 'confirm_design' ? task.artifacts?.design :
    task.humanAction === 'confirm_plan' ? task.artifacts?.plan :
    null

  const actionLabel =
    task.humanAction === 'confirm_design' ? '设计方案' :
    task.humanAction === 'confirm_plan' ? '实施计划' :
    task.humanAction === 'confirm_split' ? '拆分方案' :
    task.humanAction === 'confirm_merge' ? '代码合并' :
    task.humanAction === 'error' ? '错误' : ''

  // Auto-load artifact content
  useEffect(() => {
    if (!artifactPath) return
    fetch(`/api/files/content?path=${encodeURIComponent(artifactPath)}`)
      .then(r => r.json())
      .then(data => setArtifactContent(data.content || null))
      .catch(() => setArtifactContent(null))
  }, [artifactPath])

  const borderColor =
    task.humanAction === 'confirm_design' ? 'border-amber-500/30' :
    task.humanAction === 'confirm_plan' ? 'border-indigo-500/30' :
    task.humanAction === 'confirm_merge' ? 'border-emerald-500/30' :
    'border-red-500/30'

  const bgColor =
    task.humanAction === 'confirm_design' ? 'bg-amber-500/5' :
    task.humanAction === 'confirm_plan' ? 'bg-indigo-500/5' :
    task.humanAction === 'confirm_merge' ? 'bg-emerald-500/5' :
    'bg-red-500/5'

  return (
    <div className={`mb-4 border ${borderColor} ${bgColor} rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-800/50">
        <div className="text-sm font-semibold text-gray-200">
          📋 {actionLabel}待确认
        </div>
        {artifactPath && (
          <button
            onClick={() => selectFile(artifactPath)}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
          >
            在编辑器中打开 →
          </button>
        )}
      </div>

      {/* Artifact content preview */}
      {artifactContent && (
        <div className="max-h-80 overflow-y-auto px-4 py-3 border-b border-gray-800/50">
          {artifactPath?.endsWith('.md') ? (
            <MarkdownInline content={artifactContent} />
          ) : (
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">{artifactContent}</pre>
          )}
        </div>
      )}

      {task.humanAction === 'error' && !artifactContent && (
        <div className="px-4 py-3 text-sm text-red-400 border-b border-gray-800/50">
          执行出错，请查看下方执行日志了解详情
        </div>
      )}

      {/* Feedback + actions */}
      <div className="px-4 py-3">
        <textarea
          className="w-full bg-gray-800/80 rounded-lg px-3 py-2 mb-3 text-xs outline-none focus:ring-1 focus:ring-indigo-500 h-14 resize-none"
          placeholder="修改意见（可选）..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
        <div className="flex gap-2 flex-wrap">
          {task.humanAction !== 'error' && (
            <button
              onClick={() => onAction(task.humanAction!)}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-medium cursor-pointer"
            >
              ✓ 确认通过
            </button>
          )}
          <button
            onClick={() => onAction('reject')}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-medium cursor-pointer"
          >
            拒绝
          </button>
          <button
            onClick={() => onAction('rollback_to_brainstorm')}
            className="px-3 py-1.5 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 rounded-lg text-xs font-medium cursor-pointer"
          >
            ↩ 回退
          </button>
          <button
            onClick={() => onAction('cancel')}
            className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-xs font-medium cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={() => {
              const uiStore = useUiStore.getState()
              uiStore.setRightTab('issues')
            }}
            className="px-3 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 rounded-lg text-xs font-medium cursor-pointer"
          >
            💬 提 Issue
          </button>
        </div>
      </div>
    </div>
  )
}

/** Inline markdown renderer for artifact preview */
function MarkdownInline({ content }: { content: string }) {
  const html = useMemo(() => {
    marked.setOptions({ breaks: true, gfm: true })
    return marked.parse(content) as string
  }, [content])

  return (
    <div
      className="prose prose-invert prose-sm max-w-none
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
      <h3 className="text-sm font-semibold text-gray-400 mb-2">代码变更</h3>
      <pre className="text-xs font-mono text-gray-300 bg-gray-950 rounded-lg p-3 whitespace-pre-wrap max-h-48 overflow-y-auto">{diff}</pre>
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
    <div className="mb-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
      <div className="text-xs font-semibold text-emerald-400 mb-2">📦 产出文件 ({files.length})</div>
      <div className="space-y-1">
        {files.map((file) => (
          <button
            key={file}
            onClick={() => selectFile(file)}
            className="w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-emerald-500/10 rounded cursor-pointer truncate"
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
      <div className="flex items-center justify-center h-full text-sm text-gray-600">
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
        <h2 className="text-lg font-bold text-gray-100">{task.title}</h2>
        <span className="text-xs text-gray-500">
          {statusLabels[task.status]} {task.version > 1 && `· v${task.version}`}
        </span>
      </div>

      {/* Description */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-1">描述</h3>
        <p className="text-sm text-gray-300 whitespace-pre-wrap">{task.description}</p>
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
          分支: <code className="bg-gray-800 px-2 py-0.5 rounded">{task.branch}</code>
          {task.merged && <span className="ml-2 text-emerald-400">已合并</span>}
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

      {/* Log viewer -- collapsible */}
      <details className="mb-4">
        <summary className="text-sm font-semibold text-gray-400 mb-2 cursor-pointer hover:text-gray-300">
          执行日志 ▸
        </summary>
        <LogViewer taskId={task.id} />
      </details>

      {/* History */}
      {(task.history?.length || 0) > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">历史</h3>
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
          <h3 className="text-sm font-semibold text-gray-400 mb-2">子任务</h3>
          <ChildTasks parentId={task.id} />
        </div>
      )}
    </div>
  )
}
