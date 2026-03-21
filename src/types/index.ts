export type TaskStatus = 'inbox' | 'brainstorm' | 'planning' | 'executing' | 'needs_human' | 'done'

export type HumanAction =
  | 'confirm_design'
  | 'confirm_plan'
  | 'confirm_split'
  | 'confirm_merge'
  | 'revision_requested'
  | 'error'
  | null

export interface TaskProgress {
  current: number
  total: number
}

export interface TaskArtifacts {
  design?: string
  plan?: string
  log?: string
}

export interface TaskHistoryEntry {
  action: string
  fromVersion: number
  reason: string
  at: string
}

export interface Task {
  id: string
  parentId: string | null
  children: string[]
  title: string
  description: string
  skillId: string
  status: TaskStatus
  previousStatus?: TaskStatus
  humanAction: HumanAction
  sessionId: string | null
  branch: string | null
  merged: boolean
  version: number
  progress: TaskProgress
  artifacts: TaskArtifacts
  history: TaskHistoryEntry[]
  issues: TaskIssue[]
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

export interface TaskIssue {
  id: string
  stage: string
  content: string
  status: 'open' | 'resolved'
  createdAt: string
  resolvedAt: string | null
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

export interface SkillStage {
  key: string
  label: string
  icon: string
  needsHumanConfirm: boolean
}

export interface Skill {
  id: string
  name: string
  icon: string
  description: string
  stages: SkillStage[]
}

export interface ProjectConfig {
  name: string
  path: string
}

export interface AppConfig {
  projects: ProjectConfig[]
  activeProject: string | null
  maxConcurrency: number
  timeoutMinutes: number
}

export type WsMessageType =
  | 'task:created'
  | 'task:updated'
  | 'task:deleted'
  | 'tasks:sync'
  | 'log:stream'
  | 'config:updated'

export interface WsMessage {
  type: WsMessageType
  payload: unknown
}
