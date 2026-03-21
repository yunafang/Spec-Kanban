import { useEffect, useState } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { useConfigStore } from '@/store/configStore'
import { useUiStore } from '@/store/uiStore'
import TaskRow from './TaskRow'


export default function TaskTable() {
  const tasks = useTaskStore((s) => s.tasks)
  const activeProject = useConfigStore((s) => s.config.activeProject)
  const selectedTaskId = useUiStore((s) => s.selectedTaskId)
  const selectTask = useUiStore((s) => s.selectTask)
  const selectFile = useUiStore((s) => s.selectFile)

  // Filter tasks by active project, hide child tasks
  const projectTasks = tasks.filter((t) =>
    !t.parentId && (!t.projectName || t.projectName === activeProject)
  )

  // Auto-import superpowers docs as tasks when project changes
  const [scanned, setScanned] = useState(false)
  useEffect(() => {
    if (!activeProject || scanned) return
    fetch('/api/project/scan', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        if (data.imported > 0) {
          // Refresh task list
          fetch('/api/tasks').then(r => r.json()).then(useTaskStore.getState().setTasks)
        }
        setScanned(true)
      })
      .catch(() => setScanned(true))
    // Also load doc badges
    fetch(`/api/project/scan-docs`)
      .catch(() => {})
  }, [activeProject, scanned])

  return (
    <div className="flex flex-col h-full">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_100px_120px_60px_70px] gap-2 px-4 py-2 border-b border-gray-800 text-xs text-gray-500 font-semibold shrink-0">
        <span>任务</span>
        <span>Skill</span>
        <span>阶段</span>
        <span>耗时</span>
        <span>状态</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {projectTasks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-600">
            暂无任务，在底部输入框创建
          </div>
        ) : (
          projectTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isSelected={selectedTaskId === task.id}
              onSelect={() => selectTask(task.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
