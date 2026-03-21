import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import Column from './Column'
import { useTaskStore } from '@/store/taskStore'
import type { Task, TaskStatus } from '@/types'

const columns: TaskStatus[] = ['inbox', 'brainstorm', 'planning', 'executing', 'needs_human', 'done']

interface BoardProps {
  onTaskClick: (task: Task) => void
}

export default function Board({ onTaskClick }: BoardProps) {
  const tasks = useTaskStore((s) => s.tasks)

  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status && !t.parentId)

  const handleDragEnd = (_event: DragEndEvent) => {
    // Drag-and-drop is visual only — stage transitions are controlled by scheduler
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-6 gap-3 p-4 h-[calc(100vh-60px)] overflow-x-auto">
        {columns.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={tasksByStatus(status)}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </DndContext>
  )
}
