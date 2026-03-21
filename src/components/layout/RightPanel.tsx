import { useUiStore } from '@/store/uiStore'
import { useTaskStore } from '@/store/taskStore'
import TaskDetail from '@/components/detail/TaskDetail'
import FileViewer from '@/components/files/FileViewer'
import IssueList from '@/components/issues/IssueList'
import IssueForm from '@/components/issues/IssueForm'

const tabs = [
  { key: 'detail' as const, label: '📋 任务详情' },
  { key: 'file' as const, label: '📄 文件预览' },
  { key: 'issues' as const, label: '💬 Issues' },
]

function IssuesTab({ taskId }: { taskId: string }) {
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === taskId))
  const issues = task?.issues || []

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <IssueList taskId={taskId} issues={issues} />
      </div>
      <IssueForm taskId={taskId} defaultStage={task?.status === 'brainstorm' ? 'brainstorm' : task?.status === 'planning' ? 'planning' : task?.status === 'executing' ? 'executing' : 'brainstorm'} onSubmit={() => {}} />
    </div>
  )
}

export default function RightPanel() {
  const rightTab = useUiStore((s) => s.rightTab)
  const setRightTab = useUiStore((s) => s.setRightTab)
  const selectedTaskId = useUiStore((s) => s.selectedTaskId)
  const selectedFile = useUiStore((s) => s.selectedFile)

  // Issue count badge for selected task
  const issueCount = useTaskStore((s) => {
    if (!selectedTaskId) return 0
    const task = s.tasks.find((t) => t.id === selectedTaskId)
    return task?.issues?.filter((i) => i.status === 'open').length ?? 0
  })

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-gray-800 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setRightTab(tab.key)}
            className={`flex-1 px-2 py-2 text-xs font-medium transition-colors relative cursor-pointer ${
              rightTab === tab.key
                ? 'text-gray-100 border-b-2 border-indigo-500 bg-gray-800/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/20'
            }`}
          >
            {tab.label}
            {tab.key === 'issues' && issueCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-600 text-white rounded-full">
                {issueCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {rightTab === 'detail' && (
          selectedTaskId ? (
            <TaskDetail taskId={selectedTaskId} />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-600">
              选择一个任务查看详情
            </div>
          )
        )}

        {rightTab === 'file' && (
          selectedFile ? (
            <FileViewer filePath={selectedFile} />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-600">
              选择一个文件查看内容
            </div>
          )
        )}

        {rightTab === 'issues' && (
          selectedTaskId ? (
            <IssuesTab taskId={selectedTaskId} />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-600">
              选择一个任务查看 Issues
            </div>
          )
        )}
      </div>
    </div>
  )
}
