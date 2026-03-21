import { useTaskStore } from '@/store/taskStore'
import { useConfigStore } from '@/store/configStore'
import { useUiStore } from '@/store/uiStore'
import KanbanCard from './KanbanCard'
import type { Task, TaskStatus } from '@/types'
import { useEffect, useState } from 'react'

const columns: { key: TaskStatus | 'waiting'; label: string; icon: string; color: string; statuses: TaskStatus[] }[] = [
  { key: 'inbox', label: '队列', icon: '📥', color: 'border-slate-500', statuses: ['inbox'] },
  { key: 'brainstorm', label: 'Brainstorm', icon: '💡', color: 'border-amber-500', statuses: ['brainstorm'] },
  { key: 'planning', label: 'Planning', icon: '📝', color: 'border-indigo-500', statuses: ['planning'] },
  { key: 'waiting', label: '需人工', icon: '🖐️', color: 'border-red-500', statuses: ['needs_human'] },
  { key: 'executing', label: 'Executing', icon: '🚀', color: 'border-emerald-500', statuses: ['executing'] },
  { key: 'done' as TaskStatus, label: '完成', icon: '✅', color: 'border-cyan-500', statuses: ['done'] },
]

export default function StageKanban() {
  const tasks = useTaskStore((s) => s.tasks)
  const activeProject = useConfigStore((s) => s.config.activeProject)
  const selectedTaskId = useUiStore((s) => s.selectedTaskId)
  const selectTask = useUiStore((s) => s.selectTask)
  const [scanned, setScanned] = useState(false)

  // Auto-import superpowers docs
  useEffect(() => {
    if (!activeProject || scanned) return
    fetch('/api/project/scan', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        if (data.imported > 0) {
          fetch('/api/tasks').then(r => r.json()).then(useTaskStore.getState().setTasks)
        }
        setScanned(true)
      })
      .catch(() => setScanned(true))
  }, [activeProject, scanned])

  // Filter by project, exclude children
  const projectTasks = tasks.filter((t) =>
    !t.parentId && (!t.projectName || t.projectName === activeProject)
  )

  const getTasksForColumn = (statuses: TaskStatus[]) =>
    projectTasks.filter((t) => statuses.includes(t.status))

  return (
    <div className="flex gap-2 h-full p-2 overflow-x-auto">
      {columns.map((col) => {
        const colTasks = getTasksForColumn(col.statuses)
        return (
          <div key={col.key} className="flex-1 min-w-[160px] flex flex-col">
            {/* Column header */}
            <div className={`text-xs font-semibold mb-2 pb-1.5 border-b-2 ${col.color} flex items-center gap-1.5 px-1 shrink-0`}>
              <span>{col.icon}</span>
              <span className="text-gray-300">{col.label}</span>
              {colTasks.length > 0 && (
                <span className="text-gray-600 font-normal ml-auto">{colTasks.length}</span>
              )}
            </div>
            {/* Cards */}
            <div className="flex-1 space-y-2 overflow-y-auto px-0.5">
              {colTasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  isSelected={selectedTaskId === task.id}
                  onSelect={() => selectTask(task.id)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
