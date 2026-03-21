import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import type { IncomingMessage } from 'http'
import type { Duplex } from 'stream'
import type { WsMessage } from '../src/types/index.js'

let wss: WebSocketServer

export function setupWebSocket(server: Server) {
  // Use noServer mode to avoid hijacking Vite's HMR WebSocket
  wss = new WebSocketServer({ noServer: true })

  wss.on('connection', (ws) => {
    console.log('[ws] client connected')
    ws.on('close', () => console.log('[ws] client disconnected'))
  })

  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`)

    if (pathname === '/ws') {
      // Our WebSocket — handle it
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    }
    // Otherwise let Vite's HMR WebSocket handle it (don't destroy the socket)
  })
}

export function broadcast(message: WsMessage) {
  if (!wss) return
  const data = JSON.stringify(message)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(data)
  })
}
