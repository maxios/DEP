import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { World, setWorldConstructor, type IWorldOptions } from '@cucumber/cucumber'
import { runDep, type CliResult, type RunOptions } from './cli.ts'
import { ProjectFixture } from './project.ts'
import { DapFixture } from './dap-project.ts'

export class DepWorld extends World {
  readonly project: ProjectFixture
  readonly dap: DapFixture

  /** The most recent CLI invocation. */
  result?: CliResult
  /** Every invocation this scenario made, oldest first. */
  readonly invocations: CliResult[] = []
  /** Scratch space for values a Given hands to a Then. */
  readonly notes = new Map<string, unknown>()

  constructor(options: IWorldOptions) {
    super(options)
    this.project = new ProjectFixture(mkdtempSync(join(tmpdir(), 'dep-acceptance-')))
    this.dap = new DapFixture(this.project)
  }

  /** Run `dep` against the fixture project. */
  async run(args: string[], options?: RunOptions): Promise<CliResult> {
    const result = await runDep(this.project.root, args, options)
    this.result = result
    this.invocations.push(result)
    this.attach(`$ dep ${args.join(' ')}\n[exit ${result.exitCode}]\n${result.output}`, 'text/plain')
    return result
  }

  /** Run `dep`, adding `--root` unless the caller is testing root handling. */
  async runInProject(args: string[], options?: RunOptions): Promise<CliResult> {
    return this.run([...args, '--root', this.project.root], options)
  }

  /**
   * Run `dep` for a step's own bookkeeping — establishing what a set holds
   * before acting on it, or reading back a verdict the text form omits.
   * The scenario's own last result is left alone.
   */
  async runQuiet(args: string[], options?: RunOptions): Promise<CliResult> {
    const result = await runDep(this.project.root, [...args, '--root', this.project.root], options)
    this.attach(`(support) $ dep ${args.join(' ')}\n[exit ${result.exitCode}]\n${result.output}`, 'text/plain')
    return result
  }

  get lastResult(): CliResult {
    if (!this.result) throw new Error('No dep invocation has been made in this scenario yet.')
    return this.result
  }

  get output(): string {
    return this.lastResult.output
  }

  /** The last invocation's stdout, parsed as JSON. */
  json<T = any>(): T {
    const stdout = this.lastResult.stdout.trim()
    try {
      return JSON.parse(stdout) as T
    } catch (error) {
      throw new Error(`Expected JSON on stdout but got:\n${stdout || '(empty)'}\n\nstderr:\n${this.lastResult.stderr}`)
    }
  }

  note(key: string, value: unknown): void {
    this.notes.set(key, value)
  }

  recall<T>(key: string): T {
    if (!this.notes.has(key)) throw new Error(`Nothing was noted under "${key}" in this scenario.`)
    return this.notes.get(key) as T
  }

  cleanup(): void {
    rmSync(this.project.root, { recursive: true, force: true })
  }
}

setWorldConstructor(DepWorld)
