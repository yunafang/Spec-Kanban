import { useTaskStore } from '@/store/taskStore'
import { useUiStore } from '@/store/uiStore'
import TaskRow from './TaskRow'

export default function TaskTable() {
  const tasks = useTaskStore((s) => s.tasks)
  const selectedTaskId = useUiStore((s) => s.selectedTaskId)
  const selectTask = useUiStore((s) => s.selectTask)

  // Filter: hide child tasks (parentId != null)
  const topLevelTasks = tasks.filter((t) => !t.parentId)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="grid grid-cols-[1fr_100px_120px_60px_70px] gap-2 px-4 py-2 border-b border-gray-800 text-xs text-gray-500 font-semibold shrink-0">
        <span>任务</span>
        <span>Skill</span>
        <span>阶段</span>
        <span>耗时</span>
        <span>状态</span>
      </div>
      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {topLevelTasks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-600">
            暂无任务，在底部输入框创建
          </div>
        ) : (
          topLevelTasks.map((task) => (
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
