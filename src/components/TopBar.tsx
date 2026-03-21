import { useConfigStore } from '@/store/configStore'
import { useTaskStore } from '@/store/taskStore'

interface TopBarProps {
  onNewTask: () => void
  onSettings: () => void
}

export default function TopBar({ onNewTask, onSettings }: TopBarProps) {
  const config = useConfigStore((s) => s.config)
  const tasks = useTaskStore((s) => s.tasks)
  const activeTasks = tasks.filter((t) =>
    ['brainstorm', 'planning', 'executing'].includes(t.status)
  ).length

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">Spec Kanban</h1>
        {config.activeProject && (
          <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
            {config.activeProject}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">
          并行: {activeTasks}/{config.maxConcurrency}
        </span>
        <button
          onClick={onSettings}
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors cursor-pointer"
        >
          设置
        </button>
        <button
          onClick={onNewTask}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          + 新需求
        </button>
      </div>
    </div>
  )
}
