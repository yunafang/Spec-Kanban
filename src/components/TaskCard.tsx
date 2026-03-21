import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '@/types'

const statusColors: Record<string, string> = {
  inbox: 'border-l-slate-500',
  brainstorm: 'border-l-amber-500',
  planning: 'border-l-indigo-500',
  executing: 'border-l-emerald-500',
  needs_human: 'border-l-red-500',
  done: 'border-l-cyan-500'
}

const statusIcons: Record<string, string> = {
  inbox: '📥', brainstorm: '💡', planning: '📝',
  executing: '🚀', needs_human: '🖐️', done: '✅'
}

const humanActionLabels: Record<string, string> = {
  confirm_design: '审批设计',
  confirm_plan: '审批计划',
  confirm_split: '确认拆分',
  confirm_merge: '确认合并',
  error: '处理错误'
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}小时`
  return `${Math.floor(hrs / 24)}天`
}

interface TaskCardProps {
  task: Task
  onClick: () => void
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const elapsed = timeAgo(task.startedAt || task.createdAt)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-gray-800/60 rounded-lg p-3 border-l-[3px] ${statusColors[task.status]} cursor-pointer hover:bg-gray-700/60 transition-colors group`}
    >
      {/* Header: title + status icon */}
      <div className="flex items-start gap-2">
        <span className="text-xs mt-0.5 opacity-60">{statusIcons[task.status]}</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm leading-tight">{task.title}</div>
          {task.description && (
            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {task.progress.total > 0 && (
        <div className="mt-2 bg-gray-700 rounded-full h-1">
          <div
            className="bg-emerald-500 rounded-full h-1 transition-all"
            style={{ width: `${(task.progress.current / task.progress.total) * 100}%` }}
          />
        </div>
      )}

      {/* Footer: tags + time */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {task.humanAction && (
          <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px] font-medium">
            {humanActionLabels[task.humanAction] || task.humanAction}
          </span>
        )}
        {task.children.length > 0 && (
          <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[10px]">
            子任务 {task.children.length}
          </span>
        )}
        {task.version > 1 && (
          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px]">
            v{task.version}
          </span>
        )}
        {task.branch && (
          <span className="px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded text-[10px]">
            🔀
          </span>
        )}
        {elapsed && (
          <span className="text-[10px] text-gray-600 ml-auto">
            {elapsed}
          </span>
        )}
      </div>
    </div>
  )
}
