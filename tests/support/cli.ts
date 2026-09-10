import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

/** Repository root — the checkout this suite exercises. */
export const REPO_ROOT = resolve(here, '..', '..')

/** Entry point of the CLI under test, run from source. */
export const CLI_ENTRY = join(REPO_ROOT, 'cli', 'src', 'index.ts')

/**
 * The CLI depends on `bun:sqlite` and `Bun.Glob`, so it is always run with bun
 * even when the test runner itself is started by node.
 */
const BUN = process.execPath.endsWith('bun') ? process.execPath : 'bun'

export interface CliResult {
  argv: string[]
  stdout: string
  stderr: string
  output: string
  exitCode: number
}

export interface RunOptions {
  /** Working directory for the invocation. Defaults to the project root. */
  cwd?: string
  /** Extra environment for the invocation. */
  env?: Record<string, string>
}

/**
 * Invoke `dep` against a project.
 *
 * The project root is passed as `--root` and used as the working directory:
 * the parser resolves relative link targets against `process.cwd()`, so the two
 * have to agree for the graph to come out right.
 */
export function runDep(projectRoot: string, args: string[], options: RunOptions = {}): Promise<CliResult> {
  const argv = [CLI_ENTRY, ...args]

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(BUN, argv, {
      cwd: options.cwd ?? projectRoot,
      env: { ...process.env, ...options.env, NO_COLOR: '1' },
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => (stdout += chunk.toString()))
    child.stderr.on('data', (chunk) => (stderr += chunk.toString()))
    child.on('error', rejectPromise)
    child.on('close', (code) => {
      resolvePromise({
        argv: args,
        stdout,
        stderr,
        output: stdout + stderr,
        exitCode: code ?? 0,
      })
    })
  })
}
