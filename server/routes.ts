import { Router } from 'express'
import { nanoid } from 'nanoid'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { readTasks, writeTasks, readConfig, writeConfig } from './store.js'
import { broadcast } from './ws.js'
import { advanceTask, processQueue } from './scheduler.js'
import type { Task } from '../src/types/index.js'

const upload = multer({ dest: '/tmp/spec-kanban-uploads/', limits: { fileSize: 10 * 1024 * 1024 } })

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = Router()

// --- File tree helpers ---

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'data', '.superpowers', '.spec-kanban', '.DS_Store', '__pycache__'
])

function readDir(dir: string, rootDir: string, depth: number, maxDepth: number): FileNode[] {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const nodes: FileNode[] = []

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue

    const fullPath = path.join(dir, entry.name)
    const relativePath = path.relative(rootDir, fullPath)

    if (entry.isDirectory()) {
      const node: FileNode = {
        name: entry.name,
        path: relativePath,
        type: 'directory',
      }
      if (depth < maxDepth) {
        node.children = readDir(fullPath, rootDir, depth + 1, maxDepth)
      }
      nodes.push(node)
    } else if (entry.isFile()) {
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: 'file',
      })
    }
  }

  // Sort: directories first, then files, alphabetically within each group
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return nodes
}

// GET /api/tasks
router.get('/api/tasks', (_req, res) => {
  res.json(readTasks())
})

// POST /api/tasks
router.post('/api/tasks', (req, res) => {
  const { title, description, skillId } = req.body
  const config = readConfig()
  const tasks = readTasks()
  const task: Task = {
    id: `task_${nanoid(8)}`,
    parentId: null,
    children: [],
    title,
    description,
    projectName: config.activeProject || '',
    skillId: skillId || 'superpowers',
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

// POST /api/upload/parse — parse uploaded file content
router.post('/api/upload/parse', upload.single('file'), (req, res) => {
  const file = (req as any).file
  if (!file) { res.status(400).json({ error: 'No file' }); return }

  try {
    const ext = path.extname(file.originalname).toLowerCase()
    let content = ''

    if (['.md', '.txt', '.csv', '.json', '.prd'].includes(ext)) {
      content = fs.readFileSync(file.path, 'utf-8')
    } else if (['.doc', '.docx', '.pdf'].includes(ext)) {
      // For binary formats, read as text (basic fallback)
      // Full support would need a parser library
      content = `[${file.originalname}] 文件已上传。文件大小: ${(file.size / 1024).toFixed(1)}KB\n\n请基于此文件执行任务。文件路径: ${file.path}`
    } else {
      content = fs.readFileSync(file.path, 'utf-8')
    }

    res.json({ content, filename: file.originalname, size: file.size })
  } catch (e) {
    res.status(500).json({ error: '文件解析失败' })
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(file.path) } catch {}
  }
})

// GET /api/files/tree — read project directory tree
router.get('/api/files/tree', (req, res) => {
  const config = readConfig()
  if (!config.activeProject) { res.json([]); return }
  const project = config.projects.find(p => p.name === config.activeProject)
  if (!project) { res.json([]); return }

  const baseDir = req.query.dir
    ? path.join(project.path, req.query.dir as string)
    : project.path
  const maxDepth = parseInt(req.query.depth as string) || 4

  // Security: verify baseDir is within project.path
  const resolved = path.resolve(baseDir)
  if (!resolved.startsWith(path.resolve(project.path))) {
    res.status(403).json({ error: 'Access denied' }); return
  }

  const tree = readDir(resolved, project.path, 0, maxDepth)
  res.json(tree)
})

// GET /api/files/content — read a single file's content
router.get('/api/files/content', (req, res) => {
  const filePath = req.query.path as string
  if (!filePath) { res.status(400).json({ error: 'path required' }); return }

  const config = readConfig()
  const project = config.projects.find(p => p.name === config.activeProject)
  if (!project) { res.status(404).json({ error: 'No active project' }); return }

  const fullPath = path.resolve(project.path, filePath)

  // SECURITY: path traversal protection
  if (!fullPath.startsWith(path.resolve(project.path))) {
    res.status(403).json({ error: 'Access denied' }); return
  }

  if (!fs.existsSync(fullPath)) { res.status(404).json({ error: 'File not found' }); return }

  const stat = fs.statSync(fullPath)
  if (stat.size > 1024 * 1024) {
    res.json({ content: '[文件过大，超过 1MB]', language: '', size: stat.size }); return
  }

  // Detect binary
  const buffer = Buffer.alloc(512)
  const fd = fs.openSync(fullPath, 'r')
  const bytesRead = fs.readSync(fd, buffer, 0, 512, 0)
  fs.closeSync(fd)
  if (buffer.slice(0, bytesRead).includes(0)) {
    res.json({ content: '[二进制文件]', language: '', size: stat.size }); return
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  const ext = path.extname(fullPath).toLowerCase()
  const langMap: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript', '.jsx': 'javascript',
    '.json': 'json', '.md': 'markdown', '.css': 'css', '.html': 'html',
    '.py': 'python', '.rs': 'rust', '.go': 'go', '.yaml': 'yaml', '.yml': 'yaml',
    '.sh': 'shell', '.sql': 'sql', '.toml': 'toml',
  }
  res.json({ content, language: langMap[ext] || '', size: stat.size })
})

// POST /api/tasks/:id/issues — Create an issue
router.post('/api/tasks/:id/issues', (req, res) => {
  const { stage, content } = req.body
  const tasks = readTasks()
  const idx = tasks.findIndex((t) => t.id === req.params.id)
  if (idx === -1) { res.status(404).json({ error: 'Task not found' }); return }

  const issue = {
    id: `issue_${nanoid(8)}`,
    stage,
    content,
    status: 'open' as const,
    createdAt: new Date().toISOString(),
    resolvedAt: null
  }

  if (!tasks[idx].issues) tasks[idx].issues = []
  tasks[idx].issues.push(issue)
  writeTasks(tasks)
  broadcast({ type: 'task:updated', payload: tasks[idx] })
  res.status(201).json(issue)
})

// PATCH /api/tasks/:id/issues/:issueId — Resolve an issue
router.patch('/api/tasks/:id/issues/:issueId', (req, res) => {
  const tasks = readTasks()
  const task = tasks.find((t) => t.id === req.params.id)
  if (!task) { res.status(404).json({ error: 'Task not found' }); return }

  const issue = task.issues?.find((i) => i.id === req.params.issueId)
  if (!issue) { res.status(404).json({ error: 'Issue not found' }); return }

  issue.status = req.body.status || 'resolved'
  issue.resolvedAt = new Date().toISOString()
  writeTasks(tasks)
  broadcast({ type: 'task:updated', payload: task })
  res.json(issue)
})

// GET /api/tasks/:id/diff — git diff stat for a task's branch
router.get('/api/tasks/:id/diff', async (req, res) => {
  const tasks = readTasks()
  const task = tasks.find((t) => t.id === req.params.id)
  if (!task?.branch) { res.json({ diff: '' }); return }

  const config = readConfig()
  const project = config.projects.find((p) => p.name === config.activeProject)
  if (!project) { res.json({ diff: '' }); return }

  try {
    const { execa } = await import('execa')
    const { stdout } = await execa('git', ['diff', '--stat', `main...${task.branch}`], {
      cwd: project.path,
      reject: false
    })
    res.json({ diff: stdout })
  } catch {
    res.json({ diff: '' })
  }
})

// GET /api/tasks/:id/files — list files changed by a task (from its git branch)
router.get('/api/tasks/:id/files', async (req, res) => {
  const tasks = readTasks()
  const task = tasks.find((t) => t.id === req.params.id)
  if (!task) { res.json({ files: [] }); return }

  const config = readConfig()
  const project = config.projects.find((p) => p.name === config.activeProject)
  if (!project || !task.branch) { res.json({ files: [] }); return }

  try {
    const { execa } = await import('execa')
    const { stdout } = await execa('git', ['diff', '--name-only', 'main...', task.branch], {
      cwd: project.path,
      reject: false
    })
    const files = stdout.trim().split('\n').filter((f) => f.length > 0)
    res.json({ files })
  } catch {
    res.json({ files: [] })
  }
})

// GET /api/browse — browse system directories for project selection
router.get('/api/browse', (req, res) => {
  const os = require('os')
  const dir = (req.query.dir as string) || os.homedir()
  const resolved = path.resolve(dir)

  if (!fs.existsSync(resolved)) { res.json({ path: dir, dirs: [], isGit: false }); return }

  try {
    const entries = fs.readdirSync(resolved, { withFileTypes: true })
    const dirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'Library')
      .map((e) => e.name)
      .sort()
    const isGit = fs.existsSync(path.join(resolved, '.git'))
    res.json({ path: resolved, dirs, isGit })
  } catch {
    res.json({ path: resolved, dirs: [], isGit: false })
  }
})

// POST /api/project/scan — scan project for superpowers docs and import as tasks
router.post('/api/project/scan', (req, res) => {
  const config = readConfig()
  const project = config.projects.find(p => p.name === config.activeProject)
  if (!project) { res.json({ imported: 0 }); return }

  const tasks = readTasks()
  let imported = 0

  // Read specs
  const specsDir = path.join(project.path, 'docs/superpowers/specs')
  const specsMap = new Map<string, { name: string; specPath: string; date: string; content: string }>()

  if (fs.existsSync(specsDir)) {
    for (const file of fs.readdirSync(specsDir).filter(f => f.endsWith('.md'))) {
      const name = file.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')
      const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})/)
      const content = fs.readFileSync(path.join(specsDir, file), 'utf-8')
      // Extract title from first # heading
      const titleMatch = content.match(/^#\s+(.+)/m)
      specsMap.set(name, {
        name: titleMatch?.[1] || name,
        specPath: `docs/superpowers/specs/${file}`,
        date: dateMatch?.[1] || '',
        content: content.slice(0, 500)
      })
    }
  }

  // Read plans
  const plansDir = path.join(project.path, 'docs/superpowers/plans')
  const plansMap = new Map<string, { planPath: string }>()

  if (fs.existsSync(plansDir)) {
    for (const file of fs.readdirSync(plansDir).filter(f => f.endsWith('.md'))) {
      const name = file.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')
      plansMap.set(name, { planPath: `docs/superpowers/plans/${file}` })
    }
  }

  // Create tasks for each spec (avoid duplicates by checking existing task titles)
  const existingTitles = new Set(tasks.filter(t => t.projectName === config.activeProject).map(t => t.title))

  for (const [key, spec] of specsMap) {
    if (existingTitles.has(spec.name)) continue

    const hasPlan = plansMap.has(key)

    // Determine status: docs exist = stages already confirmed
    // Spec exists → brainstorm done. Plan exists → planning done.
    // Both exist → ready to execute (or already executing)
    let status: string
    let humanAction: string | null
    let progress: { current: number; total: number }

    if (hasPlan) {
      // Both spec and plan exist → planning is done, ready to execute
      status = 'needs_human'
      humanAction = 'confirm_merge' // Skips to execution confirmation
      progress = { current: 2, total: 3 }
      // Actually more accurate: set to executing or inbox for next run
      status = 'inbox' // Will be picked up by scheduler to execute
      humanAction = null
      progress = { current: 2, total: 3 }
    } else {
      // Only spec exists → brainstorm done, needs planning
      status = 'needs_human'
      humanAction = 'confirm_design'
      progress = { current: 1, total: 3 }
    }

    const task: Task = {
      id: `task_${nanoid(8)}`,
      parentId: null,
      children: [],
      title: spec.name,
      description: `从项目文档导入：${spec.specPath}`,
      projectName: config.activeProject || '',
      skillId: 'superpowers',
      status: status as any,
      humanAction: humanAction as any,
      sessionId: null,
      branch: null,
      merged: false,
      version: 1,
      progress,
      artifacts: {
        design: spec.specPath,
        ...(hasPlan ? { plan: plansMap.get(key)!.planPath } : {})
      },
      history: [],
      issues: [],
      createdAt: spec.date ? `${spec.date}T00:00:00Z` : new Date().toISOString(),
      startedAt: spec.date ? `${spec.date}T00:00:00Z` : new Date().toISOString(),
      completedAt: null
    }

    tasks.push(task)
    broadcast({ type: 'task:created', payload: task })
    imported++
  }

  if (imported > 0) writeTasks(tasks)
  res.json({ imported })
})

// --- Skill management endpoints ---

// GET /api/project/skills — list enabled skills
router.get('/api/project/skills', (req, res) => {
  const config = readConfig()
  const project = config.projects.find(p => p.name === config.activeProject)
  if (!project) { res.json({ enabled: [], custom: [] }); return }

  const skillsFile = path.join(project.path, '.spec-kanban', 'skills.json')
  let projectSkills = { enabled: ['superpowers'] as string[], custom: [] as any[] }

  if (fs.existsSync(skillsFile)) {
    try { projectSkills = JSON.parse(fs.readFileSync(skillsFile, 'utf-8')) } catch {}
  }

  // Load custom skill definitions
  const customSkillsDir = path.join(project.path, '.spec-kanban', 'skills')
  const customDefs: any[] = []
  if (fs.existsSync(customSkillsDir)) {
    for (const dir of fs.readdirSync(customSkillsDir, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue
      const defFile = path.join(customSkillsDir, dir.name, 'skill.json')
      if (fs.existsSync(defFile)) {
        try {
          const def = JSON.parse(fs.readFileSync(defFile, 'utf-8'))
          customDefs.push(def)
        } catch {}
      }
    }
  }

  res.json({ enabled: projectSkills.enabled, custom: customDefs })
})

// POST /api/project/skills/enable — enable a built-in skill
router.post('/api/project/skills/enable', (req, res) => {
  const { skillId } = req.body
  const config = readConfig()
  const project = config.projects.find(p => p.name === config.activeProject)
  if (!project) { res.status(404).json({ error: 'No active project' }); return }

  const dir = path.join(project.path, '.spec-kanban')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const skillsFile = path.join(dir, 'skills.json')
  let projectSkills = { enabled: ['superpowers'], custom: [] }
  if (fs.existsSync(skillsFile)) {
    try { projectSkills = JSON.parse(fs.readFileSync(skillsFile, 'utf-8')) } catch {}
  }

  if (!projectSkills.enabled.includes(skillId)) {
    projectSkills.enabled.push(skillId)
  }
  fs.writeFileSync(skillsFile, JSON.stringify(projectSkills, null, 2))
  res.json({ ok: true, enabled: projectSkills.enabled })
})

// POST /api/project/skills/disable — disable a skill
router.post('/api/project/skills/disable', (req, res) => {
  const { skillId } = req.body
  const config = readConfig()
  const project = config.projects.find(p => p.name === config.activeProject)
  if (!project) { res.status(404).json({ error: 'No active project' }); return }

  const skillsFile = path.join(project.path, '.spec-kanban', 'skills.json')
  let projectSkills = { enabled: ['superpowers'] as string[], custom: [] as any[] }
  if (fs.existsSync(skillsFile)) {
    try { projectSkills = JSON.parse(fs.readFileSync(skillsFile, 'utf-8')) } catch {}
  }

  // Don't allow disabling if it's the last skill
  if (projectSkills.enabled.length <= 1) {
    res.status(400).json({ error: 'Cannot disable the last skill' }); return
  }

  projectSkills.enabled = projectSkills.enabled.filter(id => id !== skillId)
  fs.writeFileSync(skillsFile, JSON.stringify(projectSkills, null, 2))
  res.json({ ok: true, enabled: projectSkills.enabled })
})

// POST /api/project/skills/import — import from git URL
router.post('/api/project/skills/import', async (req, res) => {
  const { gitUrl } = req.body
  const config = readConfig()
  const project = config.projects.find(p => p.name === config.activeProject)
  if (!project) { res.status(404).json({ error: 'No active project' }); return }

  const skillsDir = path.join(project.path, '.spec-kanban', 'skills')
  if (!fs.existsSync(skillsDir)) fs.mkdirSync(skillsDir, { recursive: true })

  // Extract repo name from URL
  const repoName = gitUrl.split('/').pop()?.replace('.git', '') || 'custom-skill'
  const targetDir = path.join(skillsDir, repoName)

  try {
    const { execa } = await import('execa')
    if (fs.existsSync(targetDir)) {
      // Already exists — pull latest
      await execa('git', ['pull'], { cwd: targetDir })
    } else {
      await execa('git', ['clone', gitUrl, targetDir])
    }

    // Read skill.json
    const defFile = path.join(targetDir, 'skill.json')
    if (!fs.existsSync(defFile)) {
      res.status(400).json({ error: 'skill.json not found in repo' }); return
    }
    const def = JSON.parse(fs.readFileSync(defFile, 'utf-8'))

    // Auto-enable
    const skillsFile = path.join(project.path, '.spec-kanban', 'skills.json')
    let projectSkills = { enabled: ['superpowers'], custom: [] as string[] }
    if (fs.existsSync(skillsFile)) {
      try { projectSkills = JSON.parse(fs.readFileSync(skillsFile, 'utf-8')) } catch {}
    }
    if (!projectSkills.enabled.includes(def.id)) {
      projectSkills.enabled.push(def.id)
    }
    fs.writeFileSync(skillsFile, JSON.stringify(projectSkills, null, 2))

    res.json({ ok: true, skill: def })
  } catch (e) {
    res.status(500).json({ error: `Git clone failed: ${(e as Error).message}` })
  }
})

export default router
