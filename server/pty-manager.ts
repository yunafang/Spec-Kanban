import os from 'os'
import path from 'path'
import { spawn, execSync, type ChildProcess } from 'child_process'
import { fileURLToPath } from 'url'
import { readConfig, readTasks } from './store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PTY_BRIDGE = path.resolve(__dirname, 'pty-bridge.py')

// Resolve full path to claude binary once
let claudePath: string | null = null
function getClaudePath(): string {
  if (!claudePath) {
    try {
      claudePath = execSync('which claude', { encoding: 'utf-8' }).trim()
    } catch {
      claudePath = 'claude'
    }
  }
  return claudePath
}

interface PtySession {
  proc: ChildProcess
  taskId: string | null
  projectDir: string
}

const sessions = new Map<string, PtySession>()

/** Spawn an interactive Claude CLI session using Python pty-bridge */
export async function spawnPtySession(
  sessionKey: string,
  options: {
    taskId?: string
    cols?: number
    rows?: number
  } = {}
): Promise<{ sessionKey: string }> {
  killPtySession(sessionKey)

  const config = readConfig()
  const project = config.projects.find(p => p.name === config.activeProject)
  const projectDir = project?.path || os.homedir()

  const claudeArgs: string[] = []

  if (options.taskId) {
    const tasks = readTasks()
    const task = tasks.find(t => t.id === options.taskId)
    if (task?.sessionId) {
      claudeArgs.push('--resume', task.sessionId)
    }
  }

  const claudeBin = getClaudePath()
  const cols = options.cols || 120
  const rows = options.rows || 30

  // Spawn via Python pty-bridge for real PTY support
  const proc = spawn('python3', [PTY_BRIDGE, claudeBin, ...claudeArgs], {
    cwd: projectDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      COLUMNS: String(cols),
      LINES: String(rows),
    },
  })

  // Auto-confirm the folder trust prompt if it appears
  let trustHandled = false
  const trustHandler = (chunk: Buffer) => {
    if (trustHandled) return
    const text = chunk.toString()
    if (text.includes('trust this folder') || text.includes('Yes, I trust')) {
      trustHandled = true
      // Send Enter to confirm trust
      setTimeout(() => {
        if (proc.stdin && !proc.stdin.destroyed) {
          proc.stdin.write('\r')
        }
      }, 300)
    }
  }
  proc.stdout?.on('data', trustHandler)
  // Stop checking after 10s (trust prompt only appears at startup)
  setTimeout(() => { proc.stdout?.removeListener('data', trustHandler) }, 10000)

  sessions.set(sessionKey, {
    proc,
    taskId: options.taskId || null,
    projectDir,
  })

  return { sessionKey }
}

/** Write data to a PTY session */
export function writePty(sessionKey: string, data: string): boolean {
  const session = sessions.get(sessionKey)
  if (!session?.proc.stdin || session.proc.stdin.destroyed) return false
  session.proc.stdin.write(data)
  return true
}

/** Resize a PTY session */
export function resizePty(sessionKey: string, cols: number, rows: number): boolean {
  const session = sessions.get(sessionKey)
  if (!session?.proc.stdin || session.proc.stdin.destroyed) return false
  // Send resize command to pty-bridge
  session.proc.stdin.write(`$$RESIZE:${cols}:${rows}\n`)
  return true
}

/** Kill a PTY session */
export function killPtySession(sessionKey: string): boolean {
  const session = sessions.get(sessionKey)
  if (!session) return false
  try {
    session.proc.kill('SIGTERM')
  } catch {}
  sessions.delete(sessionKey)
  return true
}

/** Get the PTY session */
export function getPtySession(sessionKey: string) {
  return sessions.get(sessionKey)
}

/** List active PTY sessions */
export function listPtySessions() {
  return [...sessions.entries()].map(([key, s]) => ({
    key,
    taskId: s.taskId,
    projectDir: s.projectDir,
  }))
}

/** Kill all PTY sessions */
export function killAllPtySessions() {
  for (const [key] of sessions) {
    killPtySession(key)
  }
}
