import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import type { IncomingMessage } from 'http'
import type { Duplex } from 'stream'
import type { WsMessage } from '../src/types/index.js'
import { subscribeToPty, hasActivePty } from './claude-runner.js'
import { spawnPtySession, writePty, resizePty, killPtySession, getPtySession } from './pty-manager.js'

let wss: WebSocketServer
let ptyWss: WebSocketServer

export function setupWebSocket(server: Server) {
  // Main WebSocket for task/config updates
  wss = new WebSocketServer({ noServer: true })

  wss.on('connection', (ws) => {
    console.log('[ws] client connected')
    ws.on('close', () => console.log('[ws] client disconnected'))
  })

  // PTY WebSocket for interactive terminal
  ptyWss = new WebSocketServer({ noServer: true })

  ptyWss.on('connection', (ws) => {
    console.log('[ws/pty] terminal client connected')

    let currentSessionKey: string | null = null
    let detachFromTask: (() => void) | null = null

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString())

        switch (msg.type) {
          // Attach to a running automated task's PTY output (read-only)
          case 'pty:attach': {
            const taskId = msg.taskId
            if (!taskId || !hasActivePty(taskId)) {
              ws.send(JSON.stringify({ type: 'pty:error', error: 'no_active_process' }))
              break
            }

            // Clean up previous attachment
            if (detachFromTask) { detachFromTask(); detachFromTask = null }

            detachFromTask = subscribeToPty(taskId, (data) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'pty:output', data }))
              }
            })

            if (detachFromTask) {
              ws.send(JSON.stringify({ type: 'pty:attached', taskId }))
            } else {
              ws.send(JSON.stringify({ type: 'pty:error', error: 'attach_failed' }))
            }
            break
          }

          // Detach from a task (stop receiving output)
          case 'pty:detach': {
            if (detachFromTask) { detachFromTask(); detachFromTask = null }
            break
          }

          // Spawn a fresh interactive Claude CLI session
          case 'pty:spawn': {
            // Clean up previous
            if (detachFromTask) { detachFromTask(); detachFromTask = null }
            if (currentSessionKey) { killPtySession(currentSessionKey); currentSessionKey = null }

            const sessionKey = msg.sessionKey || `pty_${Date.now()}`
            await spawnPtySession(sessionKey, {
              taskId: msg.taskId,
              cols: msg.cols,
              rows: msg.rows,
            })

            currentSessionKey = sessionKey
            const session = getPtySession(sessionKey)
            if (!session) break

            session.proc.stdout?.on('data', (chunk: Buffer) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'pty:output', data: chunk.toString() }))
              }
            })

            session.proc.stderr?.on('data', (chunk: Buffer) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'pty:output', data: chunk.toString() }))
              }
            })

            session.proc.on('exit', (exitCode) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'pty:exit', exitCode: exitCode ?? 0 }))
              }
              currentSessionKey = null
            })

            ws.send(JSON.stringify({ type: 'pty:spawned', sessionKey }))
            break
          }

          case 'pty:input': {
            if (currentSessionKey) {
              writePty(currentSessionKey, msg.data)
            }
            break
          }

          case 'pty:resize': {
            if (currentSessionKey && msg.cols && msg.rows) {
              resizePty(currentSessionKey, msg.cols, msg.rows)
            }
            break
          }

          case 'pty:kill': {
            if (detachFromTask) { detachFromTask(); detachFromTask = null }
            if (currentSessionKey) {
              killPtySession(currentSessionKey)
              currentSessionKey = null
            }
            break
          }
        }
      } catch (e) {
        console.error('[ws/pty] message error:', e)
      }
    })

    ws.on('close', () => {
      console.log('[ws/pty] terminal client disconnected')
      if (detachFromTask) { detachFromTask(); detachFromTask = null }
      if (currentSessionKey) {
        killPtySession(currentSessionKey)
        currentSessionKey = null
      }
    })
  })

  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`)

    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    } else if (pathname === '/ws/pty') {
      ptyWss.handleUpgrade(request, socket, head, (ws) => {
        ptyWss.emit('connection', ws, request)
      })
    }
    // Otherwise let Vite's HMR WebSocket handle it
  })
}

export function broadcast(message: WsMessage) {
  if (!wss) return
  const data = JSON.stringify(message)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(data)
  })
}
