import FileTree from './FileTree'
import SkillBar from './SkillBar'
import { useUiStore } from '@/store/uiStore'
import { useTaskStore } from '@/store/taskStore'

function TaskArtifacts() {
  const selectedTaskId = useUiStore((s) => s.selectedTaskId)
  const selectFile = useUiStore((s) => s.selectFile)
  const selectedFile = useUiStore((s) => s.selectedFile)
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === selectedTaskId))

  if (!task) return null

  const artifacts: { label: string; icon: string; path: string }[] = []
  if (task.artifacts?.design) artifacts.push({ label: '设计方案', icon: '💡', path: task.artifacts.design })
  if (task.artifacts?.plan) artifacts.push({ label: '实施计划', icon: '📝', path: task.artifacts.plan })

  if (artifacts.length === 0) return null

  return (
    <div className="border-b border-gray-200">
      <div className="px-3 py-1.5 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
        Task Artifacts
      </div>
      <div className="pb-1.5">
        {artifacts.map((art) => {
          const isActive = selectedFile === art.path
          return (
            <button
              key={art.path}
              onClick={() => selectFile(art.path)}
              className={`flex items-center w-full text-left px-3 py-1 text-xs transition-colors group cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="mr-1.5 text-sm">{art.icon}</span>
              <span className="truncate">{art.label}</span>
              <span className="ml-auto text-[10px] text-gray-400 opacity-0 group-hover:opacity-100">MD</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Sidebar() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 text-xs text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-200">
        {'\u{1F4C1}'} Project Files
      </div>
      {/* Task artifacts — shown when a task is selected */}
      <TaskArtifacts />
      {/* File tree - scrollable */}
      <div className="flex-1 overflow-y-auto">
        <FileTree />
      </div>
      {/* Skills section - fixed at bottom */}
      <div className="border-t border-gray-200">
        <div className="px-3 py-2 text-xs text-gray-500 font-semibold">
          {'\u26A1'} Skills
        </div>
        <SkillBar />
      </div>
    </div>
  )
}
