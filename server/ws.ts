import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import type { WsMessage } from '../src/types/index.js'

let wss: WebSocketServer

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' })
  wss.on('connection', (ws) => {
    console.log('[ws] client connected')
    ws.on('close', () => console.log('[ws] client disconnected'))
  })
}

export function broadcast(message: WsMessage) {
  if (!wss) return
  const data = JSON.stringify(message)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(data)
  })
}
