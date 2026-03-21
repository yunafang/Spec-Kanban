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

const humanActionLabels: Record<string, string> = {
  confirm_design: '审批设计',
  confirm_plan: '审批计划',
  confirm_split: '确认拆分',
  confirm_merge: '确认合并',
  error: '处理错误'
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-gray-800/60 rounded-lg p-3 border-l-[3px] ${statusColors[task.status]} cursor-pointer hover:bg-gray-800 transition-colors`}
    >
      <div className="font-medium text-sm mb-1">{task.title}</div>
      {task.description && (
        <div className="text-xs text-gray-500 line-clamp-2">{task.description}</div>
      )}
      {task.progress.total > 0 && (
        <div className="mt-2 bg-gray-700 rounded-full h-1">
          <div
            className="bg-emerald-500 rounded-full h-1 transition-all"
            style={{ width: `${(task.progress.current / task.progress.total) * 100}%` }}
          />
        </div>
      )}
      {task.humanAction && (
        <span className="inline-block mt-2 px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
          {humanActionLabels[task.humanAction] || task.humanAction}
        </span>
      )}
      {task.children.length > 0 && (
        <div className="text-xs text-gray-500 mt-1">
          子任务: {task.children.length}
        </div>
      )}
      {task.version > 1 && (
        <span className="text-xs text-gray-600 mt-1 block">v{task.version}</span>
      )}
    </div>
  )
}
