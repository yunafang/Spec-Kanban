import { execa, type ResultPromise } from 'execa'
import type { Task } from '../src/types/index.js'

interface RunnerCallbacks {
  onOutput: (data: string) => void
  onComplete: (result: { exitCode: number; output: string }) => void
  onError: (error: Error) => void
}

const activeProcesses = new Map<string, ResultPromise>()

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

  activeProcesses.set(task.id, proc)

  let output = ''

  proc.stdout?.on('data', (chunk: Buffer) => {
    const text = chunk.toString()
    output += text
    callbacks.onOutput(text)
  })

  proc.stderr?.on('data', (chunk: Buffer) => {
    callbacks.onOutput(`[stderr] ${chunk.toString()}`)
  })

  proc.then((result) => {
    activeProcesses.delete(task.id)
    callbacks.onComplete({ exitCode: result.exitCode, output })
  }).catch((error) => {
    activeProcesses.delete(task.id)
    callbacks.onError(error as Error)
  })
}

export function killProcess(taskId: string): boolean {
  const proc = activeProcesses.get(taskId)
  if (!proc) return false
  proc.kill('SIGTERM')
  activeProcesses.delete(taskId)
  return true
}

export function getActiveCount(): number {
  return activeProcesses.size
}
