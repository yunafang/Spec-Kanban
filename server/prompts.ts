import type { Task } from '../src/types/index.js'

export function issueContext(task: Task): string {
  const openIssues = (task.issues || []).filter(i => i.status === 'open')
  if (openIssues.length === 0) return ''
  const issueList = openIssues.map((i, idx) => `${idx + 1}. [${i.stage}] ${i.content}`).join('\n')
  return `\n\n用户反馈，请针对以下问题修改方案：\n${issueList}`
}

export function brainstormPrompt(description: string, task?: Task): string {
  const issues = task ? issueContext(task) : ''
  return `针对以下需求进行 brainstorming。先评估复杂度（预估实施步骤数），
如果超过 8 步，输出 JSON 格式的子任务拆分方案：{"type":"split","subtasks":[{"title":"...","description":"..."},...]}.
如果 8 步以内，输出 JSON 格式的设计方案：{"type":"design","design":"设计方案内容..."}.

需求：${description}${issues}`
}

export function planningPrompt(task?: Task): string {
  const issues = task ? issueContext(task) : ''
  return `用户已确认设计方案，请制定详细实施计划。
输出 JSON 格式：{"type":"plan","plan":"计划内容...","steps":8}${issues}`
}

export function executingPrompt(task?: Task): string {
  const issues = task ? issueContext(task) : ''
  return `用户已确认计划，开始执行实施。按计划逐步编码。${issues}`
}
