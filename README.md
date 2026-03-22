# Superpower Kanban

AI-powered task management system with a VS Code-like IDE interface. Create tasks in natural language, let Claude AI execute them through structured workflows — with human approval gates at every critical step.

## Features

- **Multi-stage AI workflows** — Brainstorm → Planning → Executing, with human confirmation gates
- **Built-in Skills** — Superpowers (full flow), Quick Fix, Code Review, Refactor, Docs, Test
- **IDE-like interface** — File tree, task board, terminal, artifact preview in a three-column layout
- **Real-time updates** — WebSocket-powered live task status and log streaming
- **Multi-project support** — Switch between Git repositories seamlessly
- **Issue system** — Provide feedback on AI-generated designs and plans
- **Terminal integration** — xterm.js embedded terminal with live execution logs

## Quick Start

### Prerequisites

- Node.js 18+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed

### Install & Run

```bash
git clone https://github.com/yunafang/Spec-Kanban.git
cd Spec-Kanban
npm install
npm run dev
```

Open http://localhost:5173

### Import a project

```bash
npm run dev -- --project /path/to/your/git/repo
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with project CLI |
| `npm run dev:vite` | Start Vite dev server only |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Tech Stack

- **Frontend**: React, Zustand, Tailwind CSS, xterm.js
- **Backend**: Express (Vite plugin), WebSocket, node-pty
- **AI**: Claude Code CLI
- **Build**: Vite, TypeScript

## Acknowledgements

This project is inspired by and built upon the [Superpowers](https://github.com/nicekid1/Superpowers) workflow methodology. The core "Brainstorm → Planning → Executing" paradigm with human approval gates originates from the Superpowers approach to AI-assisted development.

## License

[MIT](LICENSE)
