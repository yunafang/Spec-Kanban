import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from './TaskCard'
import type { Task, TaskStatus } from '@/types'

const columnConfig: Record<TaskStatus, { label: string; icon: string; color: string }> = {
  inbox: { label: '待处理', icon: '📥', color: 'border-slate-500' },
  brainstorm: { label: 'Brainstorm', icon: '💡', color: 'border-amber-500' },
  planning: { label: 'Planning', icon: '📝', color: 'border-indigo-500' },
  executing: { label: 'Executing', icon: '🚀', color: 'border-emerald-500' },
  needs_human: { label: '需人工', icon: '🖐️', color: 'border-red-500' },
  done: { label: '完成', icon: '✅', color: 'border-cyan-500' }
}

interface ColumnProps {
  status: TaskStatus
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

export default function Column({ status, tasks, onTaskClick }: ColumnProps) {
  const { setNodeRef } = useDroppable({ id: status })
  const config = columnConfig[status]

  return (
    <div className="bg-gray-900/50 rounded-xl p-3 min-h-[70vh] flex flex-col">
      <div className={`font-semibold text-sm mb-3 pb-2 border-b-2 ${config.color} flex items-center gap-2`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
        <span className="text-gray-600 font-normal">{tasks.length}</span>
      </div>
      <div ref={setNodeRef} className="flex-1 space-y-2">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
