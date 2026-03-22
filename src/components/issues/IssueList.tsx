import type { TaskIssue } from '@/types'

const stageIcons: Record<string, string> = {
  brainstorm: '💡',
  planning: '📝',
  executing: '🚀',
}

const stageColors: Record<string, string> = {
  brainstorm: 'bg-amber-100 text-amber-700',
  planning: 'bg-blue-100 text-blue-700',
  executing: 'bg-green-100 text-green-700',
}

const stageLabels: Record<string, string> = {
  brainstorm: 'Brainstorm',
  planning: 'Planning',
  executing: 'Executing',
}

interface IssueListProps {
  taskId: string
  issues: TaskIssue[]
}

export default function IssueList({ taskId, issues }: IssueListProps) {
  const handleResolve = async (issueId: string) => {
    await fetch(`/api/tasks/${taskId}/issues/${issueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' })
    })
  }

  if (issues.length === 0) {
    return <div className="p-4 text-sm text-gray-400 text-center">暂无 Issue</div>
  }

  return (
    <div className="space-y-2 p-3">
      {issues.map(issue => (
        <div key={issue.id} className={`p-3 rounded-lg border ${issue.status === 'open' ? 'border-red-200 bg-red-50' : 'border-gray-300 bg-gray-50 opacity-60'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${issue.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {issue.status === 'open' ? '开放' : '已解决'}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${stageColors[issue.stage] || 'bg-gray-100 text-gray-500'}`}>
              {stageIcons[issue.stage] || '📌'} {stageLabels[issue.stage] || issue.stage}
            </span>
            <span className="text-[10px] text-gray-400 ml-auto">{new Date(issue.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="text-sm text-gray-700">{issue.content}</div>
          {issue.status === 'open' && (
            <button onClick={() => handleResolve(issue.id)}
              className="mt-2 text-xs text-green-600 hover:text-green-500 cursor-pointer">
              ✓ 标记已解决
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
