# Phase 1: 布局重构 + 项目管理器 — 设计文档

**日期**: 2026-03-21
**项目**: spec-kanban
**目标**: 将 6 列看板 UI 重构为 VS Code 风格三栏布局，增加项目文件浏览、表格式任务管理、右侧多功能面板和底部自然语言任务输入。

## 1. 变更范围

### 后端
- **不变**：所有现有 API（tasks CRUD、scheduler、Claude runner、WebSocket）
- **新增 2 个接口**：
  - `GET /api/files/tree?project=<name>` — 返回目标项目的目录树 JSON
  - `GET /api/files/content?path=<relativePath>` — 返回文件内容（只读）

### 前端
- **重构**：整体布局从 6 列看板改为三栏 IDE 布局
- **复用**：LogViewer、StageProgress 逻辑、zustand stores、WebSocket hook
- **删除**：Board.tsx、Column.tsx、TopBar.tsx、NewTaskForm.tsx（功能合并）
- **新增**：文件树、表格视图、右侧面板、底部输入栏、Issue 系统

## 2. 整体布局

```
┌──────────────────────────────────────────────────────────────┐
│  Spec Kanban   [my-app] [my-api]            并行 2/3  [设置] │
├────────────┬─╥──────────────────────────┬─╥──────────────────┤
│            │ ║                          │ ║  [任务详情]       │
│  📁 项目文件 │ ║     📊 任务表格           │ ║  [文件预览]       │
│            │ ║                          │ ║  [Issues]        │
│  src/      │ ║  任务 | Skill | 阶段 |..│ ║                  │
│   components│ ║  ───────────────────────│ ║  (右侧面板内容)   │
│    App.tsx  │ ║  用户登录 | ⚡ | ●●●○ │ ║                  │
│    ...     │ ║  权限设计 | ⚡ | ●●○○ │ ║                  │
│            │ ║  修Bug  | 🔧 | ●○   │ ║                  │
│  ⚡ Skills  │ ║                          │ ║                  │
│  [SP][修复] │ ║                          │ ║                  │
├────────────┴─╨──────────────────────────┴─╨──────────────────┤
│ [📝 新需求] [🔧 修Bug] [♻️ 改方案] [📎 上传]  描述需求... [发送] │
└──────────────────────────────────────────────────────────────┘
```

- 左中、中右之间有可拖拽分栏手柄
- 左侧栏默认宽度 240px，右侧面板默认 360px
- 最小宽度限制：左侧 180px，右侧 280px，中间 300px

## 3. 左侧栏 — 项目文件 + Skills

### 文件树
- 调用 `GET /api/files/tree` 获取目录结构
- 可折叠目录，点击文件 → 右侧切换到「文件预览」tab
- 文件图标根据扩展名区分（.ts/.tsx, .json, .md 等）
- 不显示 node_modules、.git、dist 等忽略目录

### Skills 区域
- 显示当前工程配置的 Skill 标签
- 点击可管理（Phase 2 实现完整 Skill 管理，Phase 1 只展示）

## 4. 中间区域 — 任务表格

### 表格列定义

| 列 | 内容 | 宽度 |
|----|------|------|
| 任务 | 标题 + 描述摘要 | 自适应 |
| Skill | Skill 图标 + 名称 | 100px |
| 阶段 | 迷你圆点进度（每个阶段一个圆点） | 120px |
| 耗时 | 从 startedAt 到现在的时间 | 80px |
| 状态 | 标签（排队/执行中/需人工/已完成） | 60px |

### 行为
- 点击行 → 右侧面板显示该任务详情
- 选中行高亮（indigo 背景）
- 已完成任务半透明显示
- 支持按状态筛选（后续增强）

### 阶段圆点
- 每个 Skill 的 stages 对应一个圆点
- 绿色实心 = 已完成
- 紫色实心 = 进行中
- 琥珀色实心 = 需人工
- 灰色空心 = 未开始

## 5. 右侧面板 — 多功能 Tab

### Tab 1: 任务详情
与现有 TaskDetail 功能一致，适配面板宽度：
- 任务标题、状态、元信息（Skill、耗时、分支）
- 阶段进度条（可点击查看产出）
- 阶段产出卡片（可折叠）
  - 已完成阶段：绿色边框，折叠状态，显示「✓ 已确认」
  - 当前阶段：琥珀色边框，自动展开，显示 markdown 预览 + 操作按钮
  - 操作按钮：确认 / 提 Issue / 回退 / 取消
- 执行日志（可读 + JSON 双 tab）
- 操作历史时间线

### Tab 2: 文件预览
- 只读显示文件内容
- 代码语法高亮（根据文件扩展名）
- 显示文件路径和大小
- 从左侧文件树点击触发

### Tab 3: Issues
- 任务关联的 Issue 列表
- 每个 Issue：内容、关联阶段、状态（open/resolved）
- 创建 Issue 表单（关联到当前任务 + 阶段）
- 从任务详情「提 Issue」按钮触发
- AI 在下次执行时读取未解决 Issue 作为修改指令

## 6. 底部栏 — 任务输入

### 模式选择
| 模式 | 默认 Skill | 说明 |
|------|-----------|------|
| 📝 新需求 | Superpowers 全流程 | 完整 brainstorm → plan → execute |
| 🔧 修 Bug | 快速修复 | 直接 execute |
| ♻️ 改方案 | 重构优化 | brainstorm → execute |
| 📎 上传 | Superpowers | 选择文件，内容作为需求描述 |

### 输入行为
- 自然语言输入 + Enter 提交
- 提交后自动创建任务到表格
- 上传模式点击后弹出文件选择器

## 7. 数据结构变更

### Task 接口新增
```typescript
issues: TaskIssue[]

interface TaskIssue {
  id: string
  stage: string             // brainstorm/planning/executing
  content: string
  status: 'open' | 'resolved'
  createdAt: string
  resolvedAt: string | null
}
```

### 新增 UI Store
```typescript
interface UiState {
  sidebarWidth: number       // 默认 240
  rightPanelWidth: number    // 默认 360
  selectedTaskId: string | null
  selectedFile: string | null
  rightTab: 'detail' | 'file' | 'issues'
  bottomMode: 'new' | 'fix' | 'refactor' | 'upload'
}
```

### 文件树 API 返回
```typescript
interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}
```

## 8. 前端组件结构

```
src/
├── App.tsx                    # 三栏布局 + 可拖拽分栏
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx        # 左侧栏（文件树 + Skills）
│   │   ├── FileTree.tsx       # 目录树（可折叠）
│   │   ├── SkillBar.tsx       # Skills 标签展示
│   │   ├── TaskTable.tsx      # 任务表格
│   │   ├── TaskRow.tsx        # 表格行
│   │   ├── RightPanel.tsx     # 右侧面板（tab 切换）
│   │   ├── ResizeHandle.tsx   # 拖拽分栏手柄
│   │   └── BottomBar.tsx      # 底部输入栏
│   ├── detail/
│   │   ├── TaskDetail.tsx     # 任务详情（迁移适配）
│   │   ├── StageCard.tsx      # 阶段产出卡片
│   │   ├── StageProgress.tsx  # 进度条
│   │   └── LogViewer.tsx      # 日志查看器（复用）
│   ├── files/
│   │   └── FileViewer.tsx     # 文件内容预览
│   └── issues/
│       ├── IssueList.tsx      # Issue 列表
│       └── IssueForm.tsx      # 创建 Issue
├── store/
│   ├── taskStore.ts           # 复用
│   ├── configStore.ts         # 复用
│   └── uiStore.ts             # 新增
```

### 删除的文件
- `src/components/Board.tsx`
- `src/components/Column.tsx`
- `src/components/TopBar.tsx`
- `src/components/NewTaskForm.tsx`
- `src/components/TaskCard.tsx`
- `src/components/ProjectSettings.tsx`（合并到设置弹窗）

## 9. 迁移策略

渐进式迁移，分 4 步：

1. **搭外壳**：创建三栏布局 App.tsx + ResizeHandle，中间放现有 Board 作为占位
2. **替换中间**：Board → TaskTable + TaskRow
3. **搬右面板**：TaskDetail → RightPanel，拆出 StageCard，加 Issues tab
4. **加左侧 + 底部**：FileTree + BottomBar，删除旧组件

每步都保持可运行。

## 10. 后端新增接口

### GET /api/files/tree
```typescript
// 读取目标项目目录树
// 忽略：node_modules, .git, dist, data, .superpowers
// 返回：FileNode[]
```

### GET /api/files/content
```typescript
// 读取单个文件内容
// 参数：path（相对于项目根目录）
// 限制：最大 1MB，二进制文件返回提示
// 返回：{ content: string, language: string, size: number }
```

### POST /api/tasks/:id/issues
```typescript
// 创建 Issue
// body: { stage: string, content: string }
// 行为：追加到 task.issues 数组
```

### PATCH /api/tasks/:id/issues/:issueId
```typescript
// 更新 Issue 状态
// body: { status: 'resolved' }
```

## 11. 不做的事情

- 不做文件编辑（只读预览）
- 不做 Skill 管理 UI（Phase 2）
- 不做 Git 仓库引入 Skill（Phase 2）
- 不做任务筛选/排序（后续增强）
- 不做快捷键（后续增强）
- 不做代码语法高亮库（Phase 1 用 `<pre>` 展示，后续加 Shiki/Prism）
