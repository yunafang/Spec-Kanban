import { useState, useRef, useEffect } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { useConfigStore } from '@/store/configStore'
import { useUiStore } from '@/store/uiStore'
import type { Task } from '@/types'

const humanLabels: Record<string, string> = {
  confirm_design: '审批设计',
  confirm_plan: '审批计划',
  confirm_split: '确认拆分',
  confirm_merge: '确认合并',
  error: '出错',
}

const humanColors: Record<string, string> = {
  confirm_design: 'bg-amber-100 text-amber-600',
  confirm_plan: 'bg-blue-100 text-blue-600',
  confirm_split: 'bg-purple-100 text-purple-600',
  confirm_merge: 'bg-green-100 text-green-600',
  error: 'bg-red-100 text-red-600',
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}小时前`
  return `${Math.floor(hrs / 24)}天前`
}

interface GroupedTasks {
  projectName: string
  tasks: Task[]
}

export default function HumanTodoPanel() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const allTasks = useTaskStore((s) => s.tasks)
  const { config, setConfig } = useConfigStore()
  const selectTask = useUiStore((s) => s.selectTask)

  // All needs_human tasks across ALL projects (exclude children)
  const humanTasks = allTasks.filter(
    (t) => t.status === 'needs_human' && !t.parentId
  )

  // Group by project
  const grouped: GroupedTasks[] = []
  const projectMap = new Map<string, Task[]>()
  for (const t of humanTasks) {
    const pName = t.projectName || '未知项目'
    if (!projectMap.has(pName)) projectMap.set(pName, [])
    projectMap.get(pName)!.push(t)
  }
  // Active project first, then others
  const activeFirst = config.activeProject
  const sortedKeys = [...projectMap.keys()].sort((a, b) => {
    if (a === activeFirst) return -1
    if (b === activeFirst) return 1
    return a.localeCompare(b)
  })
  for (const key of sortedKeys) {
    grouped.push({ projectName: key, tasks: projectMap.get(key)! })
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleTaskClick = async (task: Task) => {
    const isCurrentProject = task.projectName === config.activeProject

    if (isCurrentProject) {
      selectTask(task.id)
      setOpen(false)
    } else {
      // Switch project, store target task ID, then reload
      sessionStorage.setItem('spec-kanban:pendingSelectTask', task.id)
      await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeProject: task.projectName }),
      })
        .then((r) => r.json())
        .then(setConfig)
      setOpen(false)
      window.location.reload()
    }
  }

  const totalCount = humanTasks.length

  return (
    <div ref={ref} className="relative">
      {/* Bell button with badge */}
      <button
        onClick={() => setOpen(!open)}
        className="relative text-xs px-2 py-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
        title="待处理人工确认"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-red-600 text-white rounded-full animate-pulse">
            {totalCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full right-0 mt-1 w-96 bg-white border border-gray-300 rounded-lg shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-800">
              🖐️ 待处理确认
            </span>
            <span className="text-[10px] text-gray-500">
              {totalCount} 项待处理
            </span>
          </div>

          {/* Content */}
          <div className="max-h-[420px] overflow-y-auto">
            {totalCount === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-gray-400">
                暂无需要人工确认的任务
              </div>
            ) : (
              grouped.map((group) => (
                <div key={group.projectName}>
                  {/* Project header */}
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">📂</span>
                    <span className="text-[10px] font-medium text-gray-500">
                      {group.projectName}
                    </span>
                    {group.projectName !== config.activeProject && (
                      <span className="text-[9px] px-1 py-0.5 bg-gray-200 text-gray-500 rounded">
                        其他项目
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 ml-auto">
                      {group.tasks.length}
                    </span>
                  </div>

                  {/* Task items */}
                  {group.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-100 transition-colors cursor-pointer border-b border-gray-200 group"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-800 truncate group-hover:text-gray-900">
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                              {task.description}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {task.humanAction && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                humanColors[task.humanAction] ||
                                'bg-gray-200 text-gray-500'
                              }`}
                            >
                              {humanLabels[task.humanAction] ||
                                task.humanAction}
                            </span>
                          )}
                          <span className="text-[9px] text-gray-400">
                            {timeAgo(task.startedAt || task.createdAt)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
