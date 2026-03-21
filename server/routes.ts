import { Router } from 'express'
import { nanoid } from 'nanoid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { readTasks, writeTasks, readConfig, writeConfig } from './store.js'
import { broadcast } from './ws.js'
import { advanceTask, processQueue } from './scheduler.js'
import type { Task } from '../src/types/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = Router()

// GET /api/tasks
router.get('/api/tasks', (_req, res) => {
  res.json(readTasks())
})

// POST /api/tasks
router.post('/api/tasks', (req, res) => {
  const { title, description } = req.body
  const tasks = readTasks()
  const task: Task = {
    id: `task_${nanoid(8)}`,
    parentId: null,
    children: [],
    title,
    description,
    status: 'inbox',
    humanAction: null,
    sessionId: null,
    branch: null,
    merged: false,
    version: 1,
    progress: { current: 0, total: 0 },
    artifacts: {},
    history: [],
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null
  }
  tasks.push(task)
  writeTasks(tasks)
  broadcast({ type: 'task:created', payload: task })
  res.status(201).json(task)
  processQueue()
})

// PATCH /api/tasks/:id
router.patch('/api/tasks/:id', (req, res) => {
  const tasks = readTasks()
  const idx = tasks.findIndex((t) => t.id === req.params.id)
  if (idx === -1) { res.status(404).json({ error: 'Task not found' }); return }
  Object.assign(tasks[idx], req.body)
  writeTasks(tasks)
  broadcast({ type: 'task:updated', payload: tasks[idx] })
  res.json(tasks[idx])
})

// DELETE /api/tasks/:id
router.delete('/api/tasks/:id', (req, res) => {
  let tasks = readTasks()
  tasks = tasks.filter((t) => t.id !== req.params.id)
  writeTasks(tasks)
  broadcast({ type: 'task:deleted', payload: { id: req.params.id } })
  res.status(204).end()
})

// POST /api/tasks/:id/action — human actions
router.post('/api/tasks/:id/action', async (req, res) => {
  const { action, feedback } = req.body
  const tasks = readTasks()
  const task = tasks.find((t) => t.id === req.params.id)
  if (!task) { res.status(404).json({ error: 'Task not found' }); return }
  await advanceTask(req.params.id, action, feedback)
  res.json({ ok: true })
})

// GET /api/artifacts/:path — read artifact content
router.get('/api/artifacts/:artifactPath', (req, res) => {
  const artifactPath = path.resolve(__dirname, '../data', decodeURIComponent(req.params.artifactPath))
  if (!fs.existsSync(artifactPath)) { res.status(404).send('Not found'); return }
  res.type('text/plain').send(fs.readFileSync(artifactPath, 'utf-8'))
})

// POST /api/scheduler/process — manually trigger queue
router.post('/api/scheduler/process', (_req, res) => {
  processQueue()
  res.json({ ok: true })
})

// GET /api/tasks/:id/log
router.get('/api/tasks/:id/log', (req, res) => {
  const logPath = path.resolve(__dirname, `../data/logs/${req.params.id}.log`)
  if (!fs.existsSync(logPath)) { res.send(''); return }
  res.type('text/plain').send(fs.readFileSync(logPath, 'utf-8'))
})

// GET /api/config
router.get('/api/config', (_req, res) => {
  res.json(readConfig())
})

// PATCH /api/config
router.patch('/api/config', (req, res) => {
  const config = readConfig()
  Object.assign(config, req.body)
  writeConfig(config)
  broadcast({ type: 'config:updated', payload: config })
  res.json(config)
})

// POST /api/config/projects — add a project
router.post('/api/config/projects', (req, res) => {
  const { name, path: projectPath } = req.body
  const config = readConfig()
  config.projects.push({ name, path: projectPath })
  if (!config.activeProject) config.activeProject = name
  writeConfig(config)
  broadcast({ type: 'config:updated', payload: config })
  res.status(201).json(config)
})

// POST /api/config/projects/validate
router.post('/api/config/projects/validate', async (req, res) => {
  const { path: projectPath } = req.body
  if (!fs.existsSync(projectPath)) {
    res.json({ valid: false, error: '目录不存在' }); return
  }
  const { isGitRepo } = await import('./git-ops.js')
  const isRepo = await isGitRepo(projectPath)
  if (!isRepo) {
    res.json({ valid: false, error: '不是 Git 仓库' }); return
  }
  let name = path.basename(projectPath)
  const pkgPath = path.join(projectPath, 'package.json')
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      name = pkg.name || name
    } catch {}
  }
  res.json({ valid: true, name })
})

export default router
