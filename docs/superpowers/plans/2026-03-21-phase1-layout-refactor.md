# Phase 1: 布局重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor spec-kanban from a 6-column kanban board to a VS Code-style three-panel IDE layout with project file tree, task table, right detail panel, and bottom input bar.

**Architecture:** Incremental migration in 4 phases. Backend unchanged except 2 new file APIs and issues endpoints. Frontend rebuilt as three resizable panels: left sidebar (file tree + skills), center (task table), right (detail/files/issues tabs), bottom (mode selector + input).

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, zustand, existing Express middleware

**Spec:** `docs/superpowers/specs/2026-03-21-phase1-layout-refactor.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `src/store/uiStore.ts` | Panel widths, selected task/file, active tab, bottom mode |
| `src/components/layout/ResizeHandle.tsx` | Draggable panel divider |
| `src/components/layout/Sidebar.tsx` | Left panel container (file tree + skills) |
| `src/components/layout/FileTree.tsx` | Recursive directory tree with lazy loading |
| `src/components/layout/SkillBar.tsx` | Skill tags display |
| `src/components/layout/TaskTable.tsx` | Table header + rows container |
| `src/components/layout/TaskRow.tsx` | Single table row with mini stage dots |
| `src/components/layout/RightPanel.tsx` | Tab container (detail/file/issues) |
| `src/components/layout/BottomBar.tsx` | Mode selector + input + send |
| `src/components/detail/StageCard.tsx` | Collapsible stage output card |
| `src/components/detail/StageProgress.tsx` | Extracted from TaskDetail |
| `src/components/files/FileViewer.tsx` | Read-only file content display |
| `src/components/issues/IssueList.tsx` | Issue list for a task |
| `src/components/issues/IssueForm.tsx` | Create issue form |

### Modified Files
| File | Changes |
|------|---------|
| `src/App.tsx` | Complete rewrite: three-panel layout |
| `src/types/index.ts` | Add TaskIssue, FileNode, UiState types |
| `src/components/detail/TaskDetail.tsx` | Refactor to fit right panel, extract StageCard |
| `server/routes.ts` | Add file tree, file content, issues endpoints |
| `server/prompts.ts` | Inject open issues into prompts |

### Deleted Files
| File | Reason |
|------|--------|
| `src/components/Board.tsx` | Replaced by TaskTable |
| `src/components/Column.tsx` | Replaced by TaskTable |
| `src/components/TopBar.tsx` | Merged into App.tsx header |
| `src/components/NewTaskForm.tsx` | Replaced by BottomBar |
| `src/components/TaskCard.tsx` | Replaced by TaskRow |
| `src/components/ProjectSettings.tsx` | Deferred to settings modal |

---

## Task 1: Types + UI Store

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/store/uiStore.ts`

- [ ] **Step 1: Add new types to index.ts**

Add `TaskIssue`, `FileNode` interfaces and update `Task` to include `issues` field:

```typescript
// Add to src/types/index.ts

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

// Add to Task interface:
//   issues: TaskIssue[]
```

- [ ] **Step 2: Create uiStore.ts**

```typescript
// src/store/uiStore.ts
import { create } from 'zustand'

interface UiState {
  sidebarWidth: number
  rightPanelWidth: number
  selectedTaskId: string | null
  selectedFile: string | null
  rightTab: 'detail' | 'file' | 'issues'
  bottomMode: 'new' | 'fix' | 'refactor' | 'upload'
  setSidebarWidth: (w: number) => void
  setRightPanelWidth: (w: number) => void
  selectTask: (id: string | null) => void
  selectFile: (path: string | null) => void
  setRightTab: (tab: 'detail' | 'file' | 'issues') => void
  setBottomMode: (mode: 'new' | 'fix' | 'refactor' | 'upload') => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarWidth: 240,
  rightPanelWidth: 360,
  selectedTaskId: null,
  selectedFile: null,
  rightTab: 'detail',
  bottomMode: 'new',
  setSidebarWidth: (w) => set({ sidebarWidth: Math.max(180, w) }),
  setRightPanelWidth: (w) => set({ rightPanelWidth: Math.max(280, w) }),
  selectTask: (id) => set({ selectedTaskId: id, rightTab: 'detail' }),
  selectFile: (path) => set({ selectedFile: path, rightTab: 'file' }),
  setRightTab: (tab) => set({ rightTab: tab }),
  setBottomMode: (mode) => set({ bottomMode: mode }),
}))
```

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts src/store/uiStore.ts
git commit -m "feat: add TaskIssue, FileNode types and UI state store"
```

---

## Task 2: ResizeHandle Component

**Files:**
- Create: `src/components/layout/ResizeHandle.tsx`

- [ ] **Step 1: Create ResizeHandle**

A vertical draggable divider that calls `onResize(delta)` during drag:

```typescript
// src/components/layout/ResizeHandle.tsx
import { useCallback, useRef } from 'react'

interface ResizeHandleProps {
  onResize: (delta: number) => void
}

export default function ResizeHandle({ onResize }: ResizeHandleProps) {
  const startX = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startX.current = e.clientX
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX.current
      startX.current = e.clientX
      onResize(delta)
    }
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [onResize])

  return (
    <div
      onMouseDown={handleMouseDown}
      className="w-1 cursor-col-resize hover:bg-indigo-500/30 transition-colors flex items-center justify-center group"
    >
      <div className="w-0.5 h-8 bg-gray-700 group-hover:bg-indigo-400 rounded-full transition-colors" />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/ResizeHandle.tsx
git commit -m "feat: add ResizeHandle component for draggable panel dividers"
```

---

## Task 3: Three-Panel Layout Shell (App.tsx Rewrite)

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Rewrite App.tsx with three-panel layout**

Replace entire App.tsx. Use placeholders for panels not yet built. Keep existing WebSocket and data fetching logic.

```tsx
// src/App.tsx — three-panel layout
// Left: placeholder div "Sidebar"
// Center: existing Board component (temporary)
// Right: placeholder div "Right Panel"
// Bottom: placeholder div "Bottom Bar"
// Two ResizeHandle between left-center and center-right
// Use uiStore for widths
```

The App should:
- Import `useUiStore` for panel widths
- Import `ResizeHandle` for dividers
- Keep existing `useWebSocket`, `useTaskStore`, `useConfigStore` logic
- Render header bar (project name, concurrency, settings)
- Render three columns with ResizeHandle between them
- Render bottom bar area
- Temporarily keep Board in center panel

- [ ] **Step 2: Verify three-panel layout renders**

```bash
npx vite &
sleep 3
curl -s http://localhost:5173 | grep -c "Spec Kanban"
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: three-panel layout shell with resizable dividers"
```

---

## Task 4: TaskTable + TaskRow (Replace Board)

**Files:**
- Create: `src/components/layout/TaskTable.tsx`
- Create: `src/components/layout/TaskRow.tsx`
- Modify: `src/App.tsx` (swap Board for TaskTable)

- [ ] **Step 1: Create TaskRow**

Single table row showing: task title + description, skill icon + name, mini stage dots, elapsed time, status badge. Clicking the row calls `onSelect(task.id)`.

Stage dots: map skill stages to small colored circles (green=done, purple=active, amber=needs_human, gray=future).

- [ ] **Step 2: Create TaskTable**

Table with header row (任务 | Skill | 阶段 | 耗时 | 状态) and TaskRow for each task. Filter out child tasks (parentId != null). Selected row gets indigo highlight. Completed tasks get opacity-50.

- [ ] **Step 3: Replace Board in App.tsx**

Remove Board import, add TaskTable in center panel. Wire `onSelect` to `useUiStore.selectTask`.

- [ ] **Step 4: Verify table renders with existing tasks**

Start dev server, create a task via API, verify it appears as a table row.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/TaskTable.tsx src/components/layout/TaskRow.tsx src/App.tsx
git commit -m "feat: task table view replacing kanban board columns"
```

---

## Task 5: RightPanel + TaskDetail Migration

**Files:**
- Create: `src/components/layout/RightPanel.tsx`
- Create: `src/components/detail/StageCard.tsx`
- Create: `src/components/detail/StageProgress.tsx`
- Modify: `src/components/detail/TaskDetail.tsx` (refactor from old TaskDetail.tsx, move to detail/)

- [ ] **Step 1: Extract StageProgress into its own file**

Move the `StageProgress` function and its helpers (`stages`, `getStageIndex`, `guessStage`, `stageColors`) from the existing `TaskDetail.tsx` into `src/components/detail/StageProgress.tsx`. Remove the inline preview panel from StageProgress (that moves to StageCard).

- [ ] **Step 2: Create StageCard**

Collapsible card for a single stage's output. Props: `stage`, `task`, `isActive`, `isCompleted`. Shows artifact content fetched from API. Active cards auto-expand with action buttons (confirm/issue/rollback/cancel). Completed cards show "✓ 已确认" and collapse.

- [ ] **Step 3: Refactor TaskDetail**

Move existing `src/components/TaskDetail.tsx` to `src/components/detail/TaskDetail.tsx`. Remove the modal overlay (it's now inside RightPanel). Remove inline StageProgress (import from new file). Replace inline stage preview with StageCard components. Remove old ArtifactViewer (replaced by StageCard). Keep LogViewer, history, children sections.

- [ ] **Step 4: Create RightPanel**

Tab container with three tabs: 任务详情 / 文件预览 / Issues. Shows content based on `useUiStore.rightTab`. TaskDetail tab shows selected task from `useUiStore.selectedTaskId`. File/Issues tabs show placeholder for now.

- [ ] **Step 5: Wire RightPanel into App.tsx**

Replace the right placeholder with RightPanel.

- [ ] **Step 6: Verify clicking a table row shows detail in right panel**

- [ ] **Step 7: Commit**

```bash
git add src/components/detail/ src/components/layout/RightPanel.tsx src/App.tsx
git commit -m "feat: right panel with task detail, stage cards, and tab navigation"
```

---

## Task 6: Backend — File Tree + File Content APIs

**Files:**
- Modify: `server/routes.ts`

- [ ] **Step 1: Add GET /api/files/tree endpoint**

Read project directory using `fs.readdirSync` recursively. Ignore: `node_modules`, `.git`, `dist`, `data`, `.superpowers`, `.DS_Store`. Default depth limit 4. Support `?dir=` param for lazy loading subdirectories. Return `FileNode[]`.

- [ ] **Step 2: Add GET /api/files/content endpoint**

Read file content. **Security**: resolve path, verify it starts with project root (prevent traversal). Limit 1MB. Detect binary files (check for null bytes). Return `{ content, language, size }`. Language inferred from extension.

- [ ] **Step 3: Test APIs**

```bash
curl http://localhost:5173/api/files/tree
curl "http://localhost:5173/api/files/content?path=README.md"
curl "http://localhost:5173/api/files/content?path=../../etc/passwd"  # should 403
```

- [ ] **Step 4: Commit**

```bash
git add server/routes.ts
git commit -m "feat: file tree and file content APIs with path traversal protection"
```

---

## Task 7: Sidebar — FileTree + SkillBar

**Files:**
- Create: `src/components/layout/FileTree.tsx`
- Create: `src/components/layout/SkillBar.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create FileTree**

Recursive tree component. Fetches `/api/files/tree` on mount. Directories are collapsible (click to toggle). Expanding a collapsed directory with no children fetches `?dir=<path>` for lazy loading. Clicking a file calls `useUiStore.selectFile(path)`. File icons by extension: 📄 default, specific icons for .ts/.tsx, .json, .md, .css.

- [ ] **Step 2: Create SkillBar**

Read skills from `configStore` or `builtinSkills`. Display as small colored tags. Non-interactive in Phase 1.

- [ ] **Step 3: Create Sidebar**

Container: FileTree on top (scrollable), SkillBar at bottom (fixed). Section headers: "📁 项目文件" and "⚡ Skills".

- [ ] **Step 4: Wire Sidebar into App.tsx left panel**

Replace left placeholder with Sidebar.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/FileTree.tsx src/components/layout/SkillBar.tsx src/components/layout/Sidebar.tsx src/App.tsx
git commit -m "feat: sidebar with file tree and skill tags"
```

---

## Task 8: FileViewer (Right Panel File Tab)

**Files:**
- Create: `src/components/files/FileViewer.tsx`
- Modify: `src/components/layout/RightPanel.tsx`

- [ ] **Step 1: Create FileViewer**

Fetches `/api/files/content?path=<selectedFile>` when `selectedFile` changes. Shows file path, size, and content in `<pre>` with monospace font. Props: `language` (reserved for future syntax highlighting).

- [ ] **Step 2: Wire FileViewer into RightPanel file tab**

When `rightTab === 'file'` and `selectedFile` is set, render FileViewer.

- [ ] **Step 3: Test: click file in tree → content shows in right panel**

- [ ] **Step 4: Commit**

```bash
git add src/components/files/FileViewer.tsx src/components/layout/RightPanel.tsx
git commit -m "feat: file viewer in right panel for read-only file preview"
```

---

## Task 9: BottomBar (Task Input)

**Files:**
- Create: `src/components/layout/BottomBar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create BottomBar**

Mode selector buttons (📝 新需求 / 🔧 修Bug / ♻️ 改方案 / 📎 上传). Text input with Enter to submit. Send button. Upload mode: clicking opens file picker, reads content via `/api/upload/parse`, uses as description.

Mode → skillId mapping:
- new → 'superpowers'
- fix → 'quick-fix'
- refactor → 'refactor'
- upload → 'superpowers'

Submit: POST `/api/tasks` with `{ title, description, skillId }`. Title extracted from first line or sentence of input.

- [ ] **Step 2: Wire BottomBar into App.tsx**

Replace bottom placeholder with BottomBar.

- [ ] **Step 3: Test: type a task, hit Enter, see it appear in table**

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/BottomBar.tsx src/App.tsx
git commit -m "feat: bottom input bar with mode selector and natural language task creation"
```

---

## Task 10: Issues System

**Files:**
- Modify: `server/routes.ts` (add issue endpoints)
- Modify: `server/prompts.ts` (inject issues into prompts)
- Create: `src/components/issues/IssueList.tsx`
- Create: `src/components/issues/IssueForm.tsx`
- Modify: `src/components/layout/RightPanel.tsx` (wire Issues tab)
- Modify: `src/components/detail/StageCard.tsx` (add "提 Issue" button action)

- [ ] **Step 1: Add issue API endpoints**

`POST /api/tasks/:id/issues` — create issue (generate nanoid, append to task.issues, broadcast update).
`PATCH /api/tasks/:id/issues/:issueId` — update issue status.

- [ ] **Step 2: Update prompts.ts to inject open issues**

Add `issueContext(task)` function that returns a string with all open issues formatted as user feedback. Call this in `brainstormPrompt`, `planningPrompt`, `executingPrompt` when task has open issues.

- [ ] **Step 3: Create IssueForm**

Simple form: stage selector (auto-filled from current stage), content textarea, submit button.

- [ ] **Step 4: Create IssueList**

List of issues for selected task. Each shows: stage badge, content, status (open=red / resolved=green). Resolved button to mark done.

- [ ] **Step 5: Wire Issues tab in RightPanel**

When `rightTab === 'issues'`, show IssueList + IssueForm. Show issue count badge on tab header.

- [ ] **Step 6: Wire "提 Issue" button in StageCard**

Clicking "提 Issue" in StageCard: switch to Issues tab, pre-fill stage in IssueForm.

- [ ] **Step 7: Commit**

```bash
git add server/routes.ts server/prompts.ts src/components/issues/ src/components/layout/RightPanel.tsx src/components/detail/StageCard.tsx
git commit -m "feat: issue system with create/resolve, prompt injection, and UI"
```

---

## Task 11: Cleanup + Polish

**Files:**
- Delete: old components
- Modify: `src/App.tsx` (remove old imports)

- [ ] **Step 1: Delete old components**

```bash
rm src/components/Board.tsx
rm src/components/Column.tsx
rm src/components/TopBar.tsx
rm src/components/NewTaskForm.tsx
rm src/components/TaskCard.tsx
rm src/components/ProjectSettings.tsx
```

- [ ] **Step 2: Remove old imports from App.tsx**

Remove any remaining imports of deleted components. Remove `@dnd-kit` usage if no longer needed (TaskTable doesn't use drag-and-drop).

- [ ] **Step 3: Verify clean build**

```bash
npx vite build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Visual test**

Start dev server, verify:
1. Three-panel layout renders correctly
2. File tree loads project files
3. Click file → right panel shows content
4. Bottom bar: type task → appears in table
5. Click task row → right panel shows detail
6. Stage cards expand/collapse
7. Create issue → appears in Issues tab
8. Resize panels by dragging handles

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old kanban components, clean up imports"
```

---

## Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Types + UI Store | None |
| 2 | ResizeHandle | None |
| 3 | Three-panel layout shell | 1, 2 |
| 4 | TaskTable + TaskRow | 3 |
| 5 | RightPanel + TaskDetail refactor | 3 |
| 6 | File tree + content APIs (backend) | None |
| 7 | Sidebar (FileTree + SkillBar) | 6 |
| 8 | FileViewer | 5, 7 |
| 9 | BottomBar | 3 |
| 10 | Issues system | 5 |
| 11 | Cleanup + polish | All |

**Parallel tracks:**
- Backend: Task 6 (independent)
- Layout shell: Tasks 1 → 2 → 3
- Center: Task 4 (after 3)
- Right: Task 5 (after 3) → 8, 10
- Left: Task 7 (after 6)
- Bottom: Task 9 (after 3)
