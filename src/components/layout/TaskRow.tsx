import type { Task } from '@/types'
import { getSkill } from '@/skills'

// Helper: time ago
function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '-'
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}时`
  return `${Math.floor(hrs / 24)}天`
}

// Status badge colors
const statusConfig: Record<string, { label: string; classes: string }> = {
  inbox: { label: '排队', classes: 'bg-gray-700 text-gray-300' },
  brainstorm: { label: '设计中', classes: 'bg-amber-500/20 text-amber-400' },
  planning: { label: '规划中', classes: 'bg-indigo-500/20 text-indigo-400' },
  executing: { label: '执行中', classes: 'bg-emerald-500/20 text-emerald-400' },
  needs_human: { label: '需人工', classes: 'bg-red-500/20 text-red-400' },
  done: { label: '已完成', classes: 'bg-cyan-500/20 text-cyan-400' },
}

interface TaskRowProps {
  task: Task
  isSelected: boolean
  onSelect: () => void
}

export default function TaskRow({ task, isSelected, onSelect }: TaskRowProps) {
  const skill = getSkill(task.skillId)
  const stages = skill.stages
  const status = statusConfig[task.status] || statusConfig.inbox

  // Determine current stage index for dot rendering
  const currentStageIndex = (() => {
    if (task.status === 'done') return stages.length // all completed
    if (task.status === 'inbox') return -1 // none started

    if (task.status === 'needs_human') {
      // For needs_human, use previousStatus to find which stage needs attention
      const prevStatus = task.previousStatus
      if (prevStatus) {
        const idx = stages.findIndex((s) => s.key === prevStatus)
        if (idx !== -1) return idx
      }
      // Fallback: find first stage that needs human confirm
      const idx = stages.findIndex((s) => s.needsHumanConfirm)
      return idx !== -1 ? idx : 0
    }

    // Normal status: find matching stage
    const idx = stages.findIndex((s) => s.key === task.status)
    return idx !== -1 ? idx : 0
  })()

  const isNeedsHuman = task.status === 'needs_human'

  return (
    <div
      onClick={onSelect}
      className={`grid grid-cols-[1fr_100px_120px_60px_70px] gap-2 px-4 py-2.5 border-b border-gray-800/50 cursor-pointer transition-colors ${
        isSelected ? 'bg-indigo-500/10' : 'hover:bg-gray-800/50'
      } ${task.status === 'done' ? 'opacity-50' : ''}`}
    >
      {/* Task column */}
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-200 truncate">
          {task.title}
        </div>
        <div className="text-xs text-gray-500 truncate">{task.description}</div>
      </div>

      {/* Skill column */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <span>{skill.icon}</span>
        <span className="truncate">{skill.name}</span>
      </div>

      {/* Stage column: dots */}
      <div className="flex items-center gap-1">
        {stages.map((stage, i) => {
          let dotColor = 'bg-gray-600' // future
          if (i < currentStageIndex) {
            dotColor = 'bg-emerald-400' // completed
          } else if (i === currentStageIndex) {
            dotColor = isNeedsHuman ? 'bg-amber-400' : 'bg-indigo-400' // current
          }
          return (
            <span
              key={stage.key}
              title={stage.label}
              className={`w-2.5 h-2.5 rounded-full ${dotColor}`}
            />
          )
        })}
      </div>

      {/* Time column */}
      <div className="flex items-center text-xs text-gray-500">
        {timeAgo(task.startedAt || task.createdAt)}
      </div>

      {/* Status column */}
      <div className="flex items-center">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${status.classes}`}
        >
          {status.label}
        </span>
      </div>
    </div>
  )
}
