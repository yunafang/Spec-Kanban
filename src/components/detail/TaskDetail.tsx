import { useState } from 'react'
import LogViewer from '@/components/LogViewer'
import StageProgress from './StageProgress'
import { useTaskStore } from '@/store/taskStore'

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
  )
}
