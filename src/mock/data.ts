import type { Task, AppConfig } from '@/types'

export const mockConfig: AppConfig = {
  projects: [
    { name: 'my-app', path: '/Users/demo/projects/my-app' }
  ],
  activeProject: 'my-app',
  maxConcurrency: 3,
  timeoutMinutes: 10
}

export const mockTasks: Task[] = [
  {
    id: 'task_demo01',
    parentId: null,
    children: [],
    title: '用户登录功能',
    description: '支持 GitHub OAuth 登录，包含登录页面和回调处理',
    status: 'inbox',
    humanAction: null,
    sessionId: null,
    branch: null,
    merged: false,
    version: 1,
    progress: { current: 0, total: 0 },
    artifacts: {},
    history: [],
    createdAt: '2026-03-21T10:00:00Z',
    startedAt: null,
    completedAt: null
  },
  {
    id: 'task_demo02',
    parentId: null,
    children: [],
    title: '全局搜索',
    description: '支持按标题和内容搜索，结果实时展示',
    status: 'brainstorm',
    humanAction: null,
    sessionId: 'sess_abc',
    branch: null,
    merged: false,
    version: 1,
    progress: { current: 0, total: 0 },
    artifacts: {},
    history: [],
    createdAt: '2026-03-21T09:30:00Z',
    startedAt: '2026-03-21T09:30:05Z',
    completedAt: null
  },
  {
    id: 'task_demo03',
    parentId: null,
    children: [],
    title: '数据导出 CSV',
    description: '将报表数据导出为 CSV 文件下载',
    status: 'planning',
    humanAction: null,
    sessionId: 'sess_def',
    branch: null,
    merged: false,
    version: 1,
    progress: { current: 0, total: 0 },
    artifacts: { design: 'artifacts/task_demo03/design-v1.md' },
    history: [],
    createdAt: '2026-03-21T09:00:00Z',
    startedAt: '2026-03-21T09:00:05Z',
    completedAt: null
  },
  {
    id: 'task_demo04',
    parentId: null,
    children: [],
    title: 'REST API 接口',
    description: '用户管理的 CRUD API，包含参数验证和错误处理',
    status: 'executing',
    humanAction: null,
    sessionId: 'sess_ghi',
    branch: 'task/task_demo04',
    merged: false,
    version: 1,
    progress: { current: 2, total: 4 },
    artifacts: {
      design: 'artifacts/task_demo04/design-v1.md',
      plan: 'artifacts/task_demo04/plan-v1.md'
    },
    history: [],
    createdAt: '2026-03-21T08:30:00Z',
    startedAt: '2026-03-21T08:30:05Z',
    completedAt: null
  },
  {
    id: 'task_demo05',
    parentId: null,
    children: [],
    title: '权限系统设计',
    description: '基于角色的权限控制，包含管理员和普通用户两种角色',
    status: 'needs_human',
    humanAction: 'confirm_design',
    sessionId: 'sess_jkl',
    branch: null,
    merged: false,
    version: 1,
    progress: { current: 0, total: 0 },
    artifacts: { design: 'artifacts/task_demo05/design-v1.md' },
    history: [],
    createdAt: '2026-03-21T08:00:00Z',
    startedAt: '2026-03-21T08:00:05Z',
    completedAt: null
  },
  {
    id: 'task_demo06',
    parentId: null,
    children: [],
    title: '首页重构',
    description: '重新设计首页布局，添加仪表盘组件',
    status: 'done',
    humanAction: null,
    sessionId: 'sess_mno',
    branch: 'task/task_demo06',
    merged: true,
    version: 1,
    progress: { current: 4, total: 4 },
    artifacts: {
      design: 'artifacts/task_demo06/design-v1.md',
      plan: 'artifacts/task_demo06/plan-v1.md'
    },
    history: [],
    createdAt: '2026-03-20T14:00:00Z',
    startedAt: '2026-03-20T14:00:05Z',
    completedAt: '2026-03-20T14:12:00Z'
  },
  {
    id: 'task_demo07',
    parentId: null,
    children: [],
    title: '导航栏优化',
    description: '响应式导航栏，移动端汉堡菜单',
    status: 'done',
    humanAction: null,
    sessionId: 'sess_pqr',
    branch: 'task/task_demo07',
    merged: true,
    version: 2,
    progress: { current: 3, total: 3 },
    artifacts: {
      design: 'artifacts/task_demo07/design-v2.md',
      plan: 'artifacts/task_demo07/plan-v2.md'
    },
    history: [{
      action: 'rollback_to_brainstorm',
      fromVersion: 1,
      reason: '第一版设计不符合移动端需求',
      at: '2026-03-20T10:30:00Z'
    }],
    createdAt: '2026-03-20T10:00:00Z',
    startedAt: '2026-03-20T10:00:05Z',
    completedAt: '2026-03-20T11:15:00Z'
  }
]
