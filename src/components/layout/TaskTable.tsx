import { useEffect, useState } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { useConfigStore } from '@/store/configStore'
import { useUiStore } from '@/store/uiStore'
import TaskRow from './TaskRow'

interface ProjectDoc {
  name: string
  path: string
  date: string
}

export default function TaskTable() {
  const tasks = useTaskStore((s) => s.tasks)
  const activeProject = useConfigStore((s) => s.config.activeProject)
  const selectedTaskId = useUiStore((s) => s.selectedTaskId)
  const selectTask = useUiStore((s) => s.selectTask)
  const selectFile = useUiStore((s) => s.selectFile)
  const [specs, setSpecs] = useState<ProjectDoc[]>([])
  const [plans, setPlans] = useState<ProjectDoc[]>([])

  // Filter tasks by active project, hide child tasks
  const projectTasks = tasks.filter((t) =>
    !t.parentId && (!t.projectName || t.projectName === activeProject)
  )

  // Scan for existing superpowers docs
  useEffect(() => {
    if (!activeProject) return
    fetch('/api/project/scan')
      .then(r => r.json())
      .then(data => {
        setSpecs(data.specs || [])
        setPlans(data.plans || [])
      })
      .catch(() => {})
  }, [activeProject])

  const hasDocs = specs.length > 0 || plans.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Project docs banner */}
      {hasDocs && (
        <div className="px-4 py-2 border-b border-gray-800 bg-indigo-500/5 shrink-0">
          <div className="text-xs text-gray-400 font-semibold mb-1.5">📋 项目文档</div>
          <div className="flex gap-2 flex-wrap">
            {specs.map(s => (
              <button
                key={s.path}
                onClick={() => selectFile(s.path)}
                className="px-2 py-1 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded cursor-pointer hover:bg-amber-500/20 transition-colors"
              >
                📄 {s.name}
              </button>
            ))}
            {plans.map(p => (
              <button
                key={p.path}
                onClick={() => selectFile(p.path)}
                className="px-2 py-1 text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded cursor-pointer hover:bg-indigo-500/20 transition-colors"
              >
                📝 {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

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
