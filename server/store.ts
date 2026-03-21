import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { Task, AppConfig } from '../src/types/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '../data')
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(path.join(DATA_DIR, 'logs'))) fs.mkdirSync(path.join(DATA_DIR, 'logs'))
  if (!fs.existsSync(path.join(DATA_DIR, 'artifacts'))) fs.mkdirSync(path.join(DATA_DIR, 'artifacts'))
}

export function readTasks(): Task[] {
  ensureDataDir()
  if (!fs.existsSync(TASKS_FILE)) return []
  return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'))
}

export function writeTasks(tasks: Task[]) {
  ensureDataDir()
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2))
}

export function readConfig(): AppConfig {
  ensureDataDir()
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaultConfig: AppConfig = {
      projects: [],
      activeProject: null,
      maxConcurrency: 3,
      timeoutMinutes: 10
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2))
    return defaultConfig
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
}

export function writeConfig(config: AppConfig) {
  ensureDataDir()
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}
