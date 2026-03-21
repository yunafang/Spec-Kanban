import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { readTasks, writeTasks, readConfig } from './store.js'
import { spawnClaude, killProcess, getActiveCount } from './claude-runner.js'
import { createBranch, mergeBranch } from './git-ops.js'
import { brainstormPrompt, planningPrompt, executingPrompt } from './prompts.js'
import { broadcast } from './ws.js'
import type { Task } from '../src/types/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Extract readable content from Claude Code CLI JSON output */
function extractClaudeOutput(raw: string): { sessionId: string | null; content: string; isSplit: boolean } {
  try {
    const json = JSON.parse(raw)
    const sessionId = json.session_id || json.sessionId || null

    // The actual output is in json.result (string)
    let text = json.result || ''

    // Try to extract JSON from markdown code blocks in the result
    const codeBlockMatch = text.match(/```json\s*\n?([\s\S]*?)```/)
    if (codeBlockMatch) {
      try {
        const inner = JSON.parse(codeBlockMatch[1])
        if (inner.type === 'split' && inner.subtasks) {
          return { sessionId, content: JSON.stringify(inner, null, 2), isSplit: true }
        }
        if (inner.type === 'design' && inner.design) {
          return { sessionId, content: inner.design, isSplit: false }
        }
        if (inner.type === 'plan' && inner.plan) {
          return { sessionId, content: inner.plan, isSplit: false }
        }
      } catch { /* not valid JSON inside code block */ }
    }

    // Clean up: remove trailing questions like "需要我直接开始实施吗？"
    text = text.replace(/```json\s*\n?[\s\S]*?```\s*/g, '').trim()

    // If there's still useful text after removing code blocks
    if (text.length > 10) {
      return { sessionId, content: text, isSplit: false }
    }

    // Fallback: return the result as-is
    return { sessionId, content: json.result || raw, isSplit: false }
  } catch {
    // Not JSON at all — return raw
    return { sessionId: null, content: raw, isSplit: false }
  }
}

function getProjectDir(): string | null {
  const config = readConfig()
  if (!config.activeProject) return null
  const project = config.projects.find((p) => p.name === config.activeProject)
  return project?.path ?? null
}

function updateTask(taskId: string, updates: Partial<Task>) {
  const tasks = readTasks()
  const idx = tasks.findIndex((t) => t.id === taskId)
  if (idx === -1) return
  Object.assign(tasks[idx], updates)
  writeTasks(tasks)
  broadcast({ type: 'task:updated', payload: tasks[idx] })
}

function appendLog(taskId: string, text: string) {
  const logDir = path.resolve(__dirname, '../data/logs')
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
  fs.appendFileSync(path.join(logDir, `${taskId}.log`), text)
  broadcast({ type: 'log:stream', payload: { taskId, text } })
}

function saveArtifact(taskId: string, name: string, content: string, version: number) {
  const dir = path.resolve(__dirname, `../data/artifacts/${taskId}`)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `${name}-v${version}.md`), content)
}

export function processQueue() {
  const config = readConfig()
  const tasks = readTasks()
  const projectDir = getProjectDir()
  if (!projectDir) return

  const runningCount = getActiveCount()
  const available = config.maxConcurrency - runningCount

  if (available <= 0) return

  const pending = tasks.filter((t) => t.status === 'inbox' && !t.parentId)
  const toStart = pending.slice(0, available)

  for (const task of toStart) {
    startBrainstorm(task, projectDir)
  }
}

function startBrainstorm(task: Task, projectDir: string) {
  const config = readConfig()
  updateTask(task.id, {
    status: 'brainstorm',
    startedAt: new Date().toISOString()
  })

  const prompt = brainstormPrompt(task.description, task)

  spawnClaude(task, prompt, projectDir, {
    onOutput: (data) => appendLog(task.id, data),
    onComplete: (result) => {
      if (result.exitCode !== 0) {
        updateTask(task.id, { status: 'needs_human', humanAction: 'error' })
        return
      }
      const { sessionId, content, isSplit } = extractClaudeOutput(result.output)
      if (isSplit) {
        updateTask(task.id, {
          status: 'needs_human',
          humanAction: 'confirm_split',
          sessionId
        })
        saveArtifact(task.id, 'split-proposal', content, task.version)
      } else {
        updateTask(task.id, {
          status: 'needs_human',
          humanAction: 'confirm_design',
          sessionId
        })
        saveArtifact(task.id, 'design', content, task.version)
      }
      processQueue()
    },
    onError: (error) => {
      appendLog(task.id, `\n[ERROR] ${error.message}`)
      updateTask(task.id, { status: 'needs_human', humanAction: 'error' })
      processQueue()
    }
  }, { timeoutMs: config.timeoutMinutes * 60 * 1000 })
}

export async function advanceTask(taskId: string, action: string, feedback?: string) {
  const tasks = readTasks()
  const task = tasks.find((t) => t.id === taskId)
  if (!task) return
  const projectDir = getProjectDir()
  if (!projectDir) return
  const config = readConfig()

  switch (action) {
    case 'confirm_design':
      updateTask(taskId, { status: 'planning', humanAction: null })
      spawnClaude(task, planningPrompt(task), projectDir, {
        onOutput: (data) => appendLog(taskId, data),
        onComplete: (result) => {
          const { content } = extractClaudeOutput(result.output)
          saveArtifact(taskId, 'plan', content, task.version)
          updateTask(taskId, { status: 'needs_human', humanAction: 'confirm_plan' })
          processQueue()
        },
        onError: (error) => {
          appendLog(taskId, `\n[ERROR] ${error.message}`)
          updateTask(taskId, { status: 'needs_human', humanAction: 'error' })
        }
      }, { resume: true, timeoutMs: config.timeoutMinutes * 60 * 1000 })
      break

    case 'confirm_plan': {
      const branchName = `task/${taskId}`
      await createBranch(projectDir, branchName)
      updateTask(taskId, { status: 'executing', humanAction: null, branch: branchName })
      spawnClaude(task, executingPrompt(task), projectDir, {
        onOutput: (data) => appendLog(taskId, data),
        onComplete: () => {
          updateTask(taskId, {
            status: 'needs_human',
            humanAction: 'confirm_merge',
            completedAt: new Date().toISOString()
          })
          processQueue()
        },
        onError: (error) => {
          appendLog(taskId, `\n[ERROR] ${error.message}`)
          updateTask(taskId, { status: 'needs_human', humanAction: 'error' })
        }
      }, { resume: true, stream: true, timeoutMs: config.timeoutMinutes * 60 * 1000 })
      break
    }

    case 'confirm_merge': {
      if (task.branch) {
        await mergeBranch(projectDir, task.branch)
      }
      updateTask(taskId, {
        status: 'done',
        humanAction: null,
        merged: true,
        completedAt: new Date().toISOString()
      })
      if (task.parentId) checkParentCompletion(task.parentId)
      processQueue()
      break
    }

    case 'confirm_split': {
      const artifactPath = path.resolve(
        __dirname, `../data/artifacts/${taskId}/split-proposal-v${task.version}.md`
      )
      try {
        const artifact = fs.readFileSync(artifactPath, 'utf-8')
        const parsed = JSON.parse(artifact)
        const childIds: string[] = []
        const allTasks = readTasks()
        for (const sub of parsed.subtasks) {
          const childId = `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
          childIds.push(childId)
          const childTask: Task = {
            id: childId,
            parentId: taskId,
            children: [],
            title: sub.title,
            description: sub.description,
            skillId: task.skillId || 'superpowers',
            status: 'inbox',
            humanAction: null,
            sessionId: null,
            branch: null,
            merged: false,
            version: 1,
            progress: { current: 0, total: 0 },
            artifacts: {},
            history: [],
            issues: [],
            createdAt: new Date().toISOString(),
            startedAt: null,
            completedAt: null
          }
          allTasks.push(childTask)
          broadcast({ type: 'task:created', payload: childTask })
        }
        writeTasks(allTasks)
        updateTask(taskId, { children: childIds, status: 'inbox', humanAction: null })
      } catch {
        updateTask(taskId, { status: 'needs_human', humanAction: 'error' })
      }
      processQueue()
      break
    }

    case 'reject':
      updateTask(taskId, { status: 'inbox', humanAction: null })
      processQueue()
      break

    case 'cancel':
      killProcess(taskId)
      updateTask(taskId, { status: 'done', humanAction: null, completedAt: new Date().toISOString() })
      processQueue()
      break

    case 'rollback_to_brainstorm':
      killProcess(taskId)
      updateTask(taskId, {
        status: 'inbox',
        humanAction: null,
        version: task.version + 1,
        sessionId: null,
        history: [...task.history, {
          action: 'rollback_to_brainstorm',
          fromVersion: task.version,
          reason: feedback || '',
          at: new Date().toISOString()
        }]
      })
      processQueue()
      break

    case 'rollback_code': {
      // Git revert merged code
      if (task.branch && task.merged) {
        try {
          const { revertMerge } = await import('./git-ops.js')
          await revertMerge(projectDir, task.branch)
          updateTask(taskId, {
            status: 'inbox',
            humanAction: null,
            merged: false,
            version: task.version + 1,
            sessionId: null,
            completedAt: null,
            history: [...task.history, {
              action: 'rollback_code',
              fromVersion: task.version,
              reason: feedback || 'git revert',
              at: new Date().toISOString()
            }]
          })
        } catch (e) {
          appendLog(taskId, `\n[ERROR] rollback failed: ${(e as Error).message}`)
          updateTask(taskId, { status: 'needs_human', humanAction: 'error' })
        }
      }
      processQueue()
      break
    }

    case 'rollback_branch': {
      // Delete unmerged task branch
      if (task.branch && !task.merged) {
        try {
          const { deleteBranch } = await import('./git-ops.js')
          await deleteBranch(projectDir, task.branch)
          updateTask(taskId, {
            status: 'inbox',
            humanAction: null,
            branch: null,
            version: task.version + 1,
            sessionId: null,
            completedAt: null,
            history: [...task.history, {
              action: 'rollback_branch',
              fromVersion: task.version,
              reason: feedback || 'delete branch',
              at: new Date().toISOString()
            }]
          })
        } catch (e) {
          appendLog(taskId, `\n[ERROR] branch delete failed: ${(e as Error).message}`)
          updateTask(taskId, { status: 'needs_human', humanAction: 'error' })
        }
      }
      processQueue()
      break
    }
  }
}

function checkParentCompletion(parentId: string) {
  const tasks = readTasks()
  const parent = tasks.find((t) => t.id === parentId)
  if (!parent) return
  const children = tasks.filter((t) => t.parentId === parentId)
  const allDone = children.every((c) => c.status === 'done')
  if (allDone) {
    updateTask(parentId, { status: 'done', completedAt: new Date().toISOString() })
  }
}
