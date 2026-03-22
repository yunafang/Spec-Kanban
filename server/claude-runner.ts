import { execa, type ResultPromise } from 'execa'
import type { Task } from '../src/types/index.js'

interface RunnerCallbacks {
  onOutput: (data: string) => void
  onComplete: (result: { exitCode: number; output: string }) => void
  onError: (error: Error) => void
}

interface ActiveProcess {
  proc: ResultPromise
  taskId: string
  subscribers: Set<(data: string) => void>
}

const activeProcesses = new Map<string, ActiveProcess>()

export function spawnClaude(
  task: Task,
  prompt: string,
  projectDir: string,
  callbacks: RunnerCallbacks,
  options?: { resume?: boolean; stream?: boolean; timeoutMs?: number }
): void {
  const args: string[] = []

  if (options?.stream) {
    args.push('--print', '--verbose', '--output-format', 'stream-json')
  } else {
    args.push('--print', '--output-format', 'json')
  }

  if (options?.resume && task.sessionId) {
    args.push('--resume', task.sessionId)
  }

  args.push(prompt)

  const proc = execa('claude', args, {
    cwd: projectDir,
    reject: false,
    timeout: options?.timeoutMs ?? 10 * 60 * 1000,
    stdin: 'ignore'
  })

  const active: ActiveProcess = {
    proc,
    taskId: task.id,
    subscribers: new Set(),
  }

  activeProcesses.set(task.id, active)

  let output = ''

  proc.stdout?.on('data', (chunk: Buffer) => {
    const text = chunk.toString()
    output += text
    callbacks.onOutput(text)
    // Notify subscribers (WebSocket clients watching this task)
    for (const sub of active.subscribers) {
      sub(text)
    }
  })

  proc.stderr?.on('data', (chunk: Buffer) => {
    const text = `[stderr] ${chunk.toString()}`
    callbacks.onOutput(text)
    for (const sub of active.subscribers) {
      sub(text)
    }
  })

  proc.then((result) => {
    activeProcesses.delete(task.id)
    callbacks.onComplete({ exitCode: result.exitCode ?? 0, output })
  }).catch((error) => {
    activeProcesses.delete(task.id)
    callbacks.onError(error as Error)
  })
}

/** Subscribe to a running task's output. Returns unsubscribe function, or null if no active process. */
export function subscribeToPty(taskId: string, listener: (data: string) => void): (() => void) | null {
  const active = activeProcesses.get(taskId)
  if (!active) return null
  active.subscribers.add(listener)
  return () => { active.subscribers.delete(listener) }
}

/** Check if a task has an active running process */
export function hasActivePty(taskId: string): boolean {
  return activeProcesses.has(taskId)
}

export function killProcess(taskId: string): boolean {
  const active = activeProcesses.get(taskId)
  if (!active) return false
  active.proc.kill('SIGTERM')
  activeProcesses.delete(taskId)
  return true
}

export function getActiveCount(): number {
  return activeProcesses.size
}
