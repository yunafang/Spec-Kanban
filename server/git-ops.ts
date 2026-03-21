import { execa } from 'execa'

export async function createBranch(projectDir: string, branchName: string): Promise<void> {
  await execa('git', ['checkout', '-b', branchName], { cwd: projectDir })
}

export async function deleteBranch(projectDir: string, branchName: string): Promise<void> {
  await execa('git', ['checkout', 'main'], { cwd: projectDir })
  await execa('git', ['branch', '-D', branchName], { cwd: projectDir })
}

export async function mergeBranch(projectDir: string, branchName: string): Promise<void> {
  await execa('git', ['checkout', 'main'], { cwd: projectDir })
  await execa('git', ['merge', '--no-ff', branchName], { cwd: projectDir })
}

export async function revertMerge(projectDir: string, branchName: string): Promise<void> {
  const { stdout } = await execa('git', [
    'log', '--merges', '--oneline', '--grep', branchName, '-1', '--format=%H'
  ], { cwd: projectDir })
  if (stdout.trim()) {
    await execa('git', ['revert', '--no-edit', stdout.trim()], { cwd: projectDir })
  }
}

export async function checkoutBranch(projectDir: string, branchName: string): Promise<void> {
  await execa('git', ['checkout', branchName], { cwd: projectDir })
}

export async function isMerged(projectDir: string, branchName: string): Promise<boolean> {
  const { stdout } = await execa('git', ['branch', '--merged', 'main'], { cwd: projectDir })
  return stdout.includes(branchName)
}

export async function isGitRepo(dir: string): Promise<boolean> {
  try {
    await execa('git', ['rev-parse', '--is-inside-work-tree'], { cwd: dir })
    return true
  } catch { return false }
}
