import path from 'path'
import { readConfig, writeConfig } from '../server/store.js'
import { isGitRepo } from '../server/git-ops.js'
import { execSync } from 'child_process'

const args = process.argv.slice(2)
const projectIdx = args.indexOf('--project')

if (projectIdx !== -1 && args[projectIdx + 1]) {
  const projectPath = path.resolve(args[projectIdx + 1])
  const isRepo = await isGitRepo(projectPath)
  if (!isRepo) {
    console.error(`Error: ${projectPath} is not a git repository`)
    process.exit(1)
  }
  const name = path.basename(projectPath)
  const config = readConfig()
  if (!config.projects.find((p) => p.path === projectPath)) {
    config.projects.push({ name, path: projectPath })
    console.log(`Project "${name}" imported from ${projectPath}`)
  }
  config.activeProject = name
  writeConfig(config)
  console.log(`Active project: ${name}`)
}

console.log('Starting Spec Kanban...')
execSync('npx vite', {
  stdio: 'inherit',
  cwd: path.resolve(import.meta.dirname!, '..')
})
