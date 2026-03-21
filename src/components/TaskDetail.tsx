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

        {/* Artifacts */}
        {(task.artifacts.design || task.artifacts.plan) && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">产出物</h3>
            <div className="space-y-1">
              {task.artifacts.design && (
                <div className="text-xs text-indigo-400">📄 {task.artifacts.design}</div>
              )}
              {task.artifacts.plan && (
                <div className="text-xs text-indigo-400">📋 {task.artifacts.plan}</div>
              )}
            </div>
          </div>
        )}

        {/* Log viewer */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">执行日志</h3>
          <LogViewer taskId={task.id} />
        </div>

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
