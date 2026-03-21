import type { TaskIssue } from '@/types'

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
    return <div className="p-4 text-sm text-gray-600 text-center">暂无 Issue</div>
  }

  return (
    <div className="space-y-2 p-3">
      {issues.map(issue => (
        <div key={issue.id} className={`p-3 rounded-lg border ${issue.status === 'open' ? 'border-red-500/20 bg-red-500/5' : 'border-gray-700 bg-gray-800/30 opacity-60'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${issue.status === 'open' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {issue.status === 'open' ? '开放' : '已解决'}
            </span>
            <span className="text-[10px] text-gray-500">{issue.stage}</span>
            <span className="text-[10px] text-gray-600 ml-auto">{new Date(issue.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="text-sm text-gray-300">{issue.content}</div>
          {issue.status === 'open' && (
            <button onClick={() => handleResolve(issue.id)}
              className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer">
              ✓ 标记已解决
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
