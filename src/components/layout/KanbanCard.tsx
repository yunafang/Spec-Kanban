import type { Task } from '@/types'
import { getSkill } from '@/skills'

const humanLabels: Record<string, string> = {
  confirm_design: '审批设计',
  confirm_plan: '审批计划',
  confirm_split: '确认拆分',
  confirm_merge: '确认合并',
  error: '出错',
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}时`
  return `${Math.floor(hrs / 24)}天`
}

interface KanbanCardProps {
  task: Task
  isSelected: boolean
  onSelect: () => void
}

export default function KanbanCard({ task, isSelected, onSelect }: KanbanCardProps) {
  const skill = getSkill(task.skillId || 'superpowers')
  const elapsed = timeAgo(task.startedAt || task.createdAt)

  return (
    <div
      onClick={onSelect}
      className={`rounded-lg p-2.5 cursor-pointer transition-all border ${
        isSelected
          ? 'border-blue-300 bg-blue-50 shadow-lg shadow-blue-500/10'
          : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-gray-800 truncate">{task.title}</div>
          {task.description && (
            <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{task.description}</div>
          )}
        </div>
      </div>

      {/* Progress bar for executing tasks */}
      {task.progress.total > 0 && task.status === 'executing' && (
        <div className="mt-2 bg-gray-200 rounded-full h-1">
          <div
            className="bg-emerald-500 rounded-full h-1 transition-all"
            style={{ width: `${(task.progress.current / task.progress.total) * 100}%` }}
          />
        </div>
      )}

      {/* Footer: skill + time + human action */}
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <span className="text-[9px] text-gray-400">{skill.icon}</span>
        {task.humanAction && (
          <span className="text-[9px] px-1 py-0.5 bg-amber-100 text-amber-600 rounded">
            {humanLabels[task.humanAction] || task.humanAction}
          </span>
        )}
        {task.version > 1 && (
          <span className="text-[9px] text-gray-400">v{task.version}</span>
        )}
        {elapsed && (
          <span className="text-[9px] text-gray-400 ml-auto">{elapsed}</span>
        )}
      </div>
    </div>
  )
}
