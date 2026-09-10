/**
 * Cucumber World for the desired user stories.
 *
 * Every scenario gets a throw-away DEP project under the session scratchpad.
 * `Given` steps describe the project; the first `When` materialises it
 * (writes files, opens the set, builds the index) and performs the request.
 * The World records the last bundle / error / CLI output for `Then` steps.
 */
import { World, type IWorldOptions } from '@cucumber/cucumber'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, chmodSync, unlinkSync } from 'fs'
import { join, dirname, resolve, relative } from 'path'
import { spawnSync } from 'child_process'
import { stringify as yamlStringify } from 'yaml'
import { openDocumentationSet, DepError } from '../../src/lib'
import type { DocumentationSet, Bundle, ContextOptions, EmbeddingProvider } from '../../src/lib'

export const SCRATCH = process.env.DEP_STORY_SCRATCH
  ?? '/private/tmp/claude-501/-Volumes-storeHub-repos-ontology-dep/fe61f426-cbbb-46c5-88eb-b90a2941aa35/scratchpad/stories'

export const CLI_ENTRY = resolve(import.meta.dir, '..', '..', 'src', 'index.ts')

export const DEFAULT_QUESTION = "how is a document's freshness decided"
export const UNCOVERED_QUESTION = 'how do I bake sourdough bread at home'

export interface DocSpec {
  path: string
  type?: string
  audience?: string[]
  owner?: string | null
  created?: string
  lastVerified?: string
  confidence?: string
  tags?: string[]
  links?: Array<{ target: string; rel: string }>
  title?: string
  body?: string
}

const DAYS = 24 * 60 * 60 * 1000

export function daysAgo(days: number, from: Date = new Date()): string {
  return new Date(from.getTime() - days * DAYS).toISOString()
}

/** Prose that is unmistakably about freshness — matches DEFAULT_QUESTION. */
export function freshnessBody(extra = ''): string {
  return [
    'A document is fresh when it was verified recently. Freshness is decided by comparing the',
    "document's last verified date against the review cadence declared for its type. When the",
    'cadence has passed, the document is aging; when twice the cadence has passed, it is stale.',
    extra,
  ].filter(Boolean).join(' ')
}

/** Prose about something else entirely. */
export function unrelatedBody(topic = 'installing the binary'): string {
  return `This document is about ${topic}. It walks through the steps one at a time and lists the commands to run, in order, with the expected output after each one.`
}

/** Prose that mentions only one word of the question, faintly. */
export function faintBody(): string {
  return 'Every release ships a changelog, a signed archive, and a document listing the platforms that were tested. Download the archive for your platform and unpack it.'
}

export class DepWorld extends World {
  root = ''
  docsRoot = 'docs'
  configured = true
  audiences: Array<{ id: string; name: string; entry: string }> = [
    { id: 'ai-agent', name: 'AI Agent', entry: './docs/explanation/freshness.md' },
    { id: 'human-author', name: 'Human Author', entry: './docs/tutorials/first-document.md' },
  ]
  cadence: Record<string, number> = { tutorial: 90, 'how-to': 60, reference: 30, explanation: 180, 'decision-record': 365 }
  fallbackOwner = '@dep-core'
  vectorization: Record<string, unknown> | null = { provider: 'hash' }
  docs = new Map<string, DocSpec>()
  trees = new Map<string, string>()
  dapspec = true

  wantIndex = true
  written = false
  opened = false
  indexed = false
  /** Files changed since the set last read them. */
  dirty = false
  spawnCalls = 0
  savedEnv: Record<string, string | undefined> = {}

  now: Date = new Date()
  question = DEFAULT_QUESTION
  options: ContextOptions = {}
  provider?: EmbeddingProvider

  set?: DocumentationSet
  bundle?: Bundle
  previousBundle?: Bundle
  error?: unknown
  result?: unknown
  cli?: { stdout: string; stderr: string; code: number | null }
  captured: { stdout: string[]; stderr: string[] } = { stdout: [], stderr: [] }
  fetchCalls: string[] = []
  extraSets: DocumentationSet[] = []
  notes = new Map<string, unknown>()
  /** The document the current scenario is talking about ("its passages …"). */
  subject = ''

  constructor(opts: IWorldOptions) {
    super(opts)
  }

  // ── fixture description ───────────────────────────────────────────────

  addDoc(spec: DocSpec): DocSpec {
    this.docs.set(spec.path, { ...spec })
    this.written = false
    return this.docs.get(spec.path)!
  }

  /** A typed link from one document to another, expressed the way frontmatter expects it. */
  relate(from: string, to: string, rel: string) {
    const spec = this.docs.get(from)
    if (!spec) throw new Error(`no such fixture document: ${from}`)
    spec.links = [...(spec.links ?? []), { target: relative(dirname(from), to), rel }]
    this.written = false
  }

  removeDoc(path: string) {
    this.docs.delete(path)
    const full = join(this.root, path)
    if (existsSync(full)) unlinkSync(full)
    this.dirty = true
  }

  /** The default project: two documents about freshness, two about other things. */
  seedDefaultDocs() {
    this.addDoc({
      path: 'docs/explanation/freshness.md',
      type: 'explanation',
      title: 'How freshness is decided',
      tags: ['freshness', 'lifecycle'],
      body: freshnessBody('The cadence is declared per document type in the project configuration.'),
    })
    this.addDoc({
      path: 'docs/reference/lifecycle-states.md',
      type: 'reference',
      title: 'Lifecycle states',
      tags: ['lifecycle'],
      body: freshnessBody('The three states are fresh, aging and stale, in that order.'),
    })
    this.addDoc({
      path: 'docs/how-to/install.md',
      type: 'how-to',
      title: 'Install the binary',
      tags: ['install'],
      body: unrelatedBody('installing the binary'),
    })
    this.addDoc({
      path: 'docs/tutorials/first-document.md',
      type: 'tutorial',
      title: 'Write your first document',
      tags: ['tutorial'],
      body: unrelatedBody('writing a first document with the editor of your choice'),
    })
  }

  // ── materialisation ───────────────────────────────────────────────────

  ensureRoot() {
    if (this.root) return
    mkdirSync(SCRATCH, { recursive: true })
    this.root = mkdtempSync(join(SCRATCH, 'project-'))
  }

  docspecObject() {
    return {
      dep_version: '0.1.0',
      project: { name: 'Story fixture', docs_root: `./${this.docsRoot}` },
      audiences: this.audiences.map((a) => ({
        id: a.id,
        name: a.name,
        goal: `${a.name} goal`,
        context: `${a.name} context`,
        entry_point: a.entry,
        vocabulary_level: 'intermediate',
        time_budget: 'scanning',
        success_criteria: 'succeeds',
      })),
      architecture: {
        directory_map: {
          tutorials: `${this.docsRoot}/tutorials`,
          'how-to': `${this.docsRoot}/how-to`,
          reference: `${this.docsRoot}/reference`,
          explanation: `${this.docsRoot}/explanation`,
          'decision-records': `${this.docsRoot}/decision-records`,
        },
        require_index_files: false,
        link_style: 'relative',
      },
      governance: {
        ownership_strategy: 'per-document',
        fallback_owner: this.fallbackOwner,
        review_cadence: this.cadence,
      },
      generation: { ai_provider: 'constrained', require_human_review: false },
      ...(this.vectorization ? { vectorization: this.vectorization } : {}),
    }
  }

  renderDoc(spec: DocSpec): string {
    const dep: Record<string, unknown> = {
      type: spec.type ?? 'reference',
      audience: spec.audience ?? this.audiences.map((a) => a.id),
      ...(spec.owner === null ? {} : { owner: spec.owner ?? '@fixture' }),
      created: spec.created ?? daysAgo(200, this.now),
      last_verified: spec.lastVerified ?? daysAgo(1, this.now),
      confidence: spec.confidence ?? 'high',
      depends_on: [],
      tags: spec.tags ?? [],
      links: spec.links ?? [],
    }
    const title = spec.title ?? spec.path.split('/').pop()!.replace(/\.md$/, '')
    const body = spec.body ?? freshnessBody()
    return `---\n${yamlStringify({ dep }, { lineWidth: 0 })}---\n\n# ${title}\n\n${body}\n`
  }

  writeProject() {
    this.ensureRoot()
    const docspecPath = join(this.root, '.docspec')
    if (this.configured) {
      writeFileSync(docspecPath, yamlStringify(this.docspecObject(), { lineWidth: 0 }))
    } else if (existsSync(docspecPath)) {
      unlinkSync(docspecPath)
    }
    for (const spec of this.docs.values()) this.writeDoc(spec)
    if (this.dapspec && this.trees.size > 0) {
      mkdirSync(join(this.root, 'dap', 'trees'), { recursive: true })
      writeFileSync(
        join(this.root, 'dap', '.dapspec'),
        yamlStringify({
          dap_version: '0.1.0',
          project: { name: 'Story procedures', trees_root: './trees' },
          governance: { review_cadence: 60, fallback_owner: this.fallbackOwner },
        })
      )
      for (const [id, content] of this.trees) {
        writeFileSync(join(this.root, 'dap', 'trees', `${id}.md`), content)
      }
    }
    this.written = true
    this.dirty = true
  }

  /** Change a document on disk after the set (and index) have seen it. */
  editDoc(path: string, append: string) {
    const spec = this.docs.get(path)
    if (!spec) throw new Error(`no such fixture document: ${path}`)
    spec.body = (spec.body ?? freshnessBody()) + append
    this.writeDoc(spec)
    this.dirty = true
  }

  writeDoc(spec: DocSpec) {
    this.ensureRoot()
    const full = join(this.root, spec.path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, this.renderDoc(spec))
  }

  open() {
    if (!this.written) this.writeProject()
    this.set = openDocumentationSet(this.root, {
      now: () => this.now,
      ...(this.provider ? { embeddings: this.provider } : {}),
    })
    this.opened = true
    return this.set
  }

  async index(opts: Record<string, unknown> = {}) {
    if (!this.opened) this.open()
    const report = await this.set!.index(opts)
    this.indexed = true
    return report
  }

  dropIndex() {
    this.ensureRoot()
    for (const f of ['.dep-vectors.db', '.dep-vectors.db-wal', '.dep-vectors.db-shm']) {
      const p = join(this.root, f)
      if (existsSync(p)) unlinkSync(p)
    }
    this.indexed = false
  }

  /** Materialise everything the scenario has described so far. */
  async materialise() {
    // a scenario that never describes its documents gets the default project
    if (this.docs.size === 0 && this.configured) this.seedDefaultDocs()
    if (!this.written) this.writeProject()
    if (!this.configured) return
    if (!this.opened) {
      this.open()
      this.dirty = false
    }
    if (this.wantIndex && !this.indexed) {
      await this.index()
      this.dirty = false
    } else if (this.dirty && this.set) {
      this.set.refresh()
      this.dirty = false
    }
  }

  /** A second, unrelated project — different audiences, different subject. */
  openSecondProject(): { root: string; set: DocumentationSet; docs: string[] } {
    mkdirSync(SCRATCH, { recursive: true })
    const root = mkdtempSync(join(SCRATCH, 'second-'))
    const other = new DepWorld({ attach: async () => {}, log: () => {}, link: () => {}, parameters: {} } as unknown as IWorldOptions)
    other.root = root
    other.audiences = [{ id: 'reviewer', name: 'Reviewer', entry: './docs/how-to/install.md' }]
    other.addDoc({ path: 'docs/how-to/install.md', type: 'how-to', title: 'Install the binary', audience: ['reviewer'], body: unrelatedBody('installing the binary on a fresh machine') })
    other.addDoc({ path: 'docs/how-to/upgrade.md', type: 'how-to', title: 'Upgrade the binary', audience: ['reviewer'], body: unrelatedBody('upgrading an installed binary to the latest release') })
    other.writeProject()
    const set = openDocumentationSet(root, { now: () => this.now })
    this.extraSets.push(set)
    this.notes.set('secondRoot', root)
    return { root, set, docs: [...other.docs.keys()] }
  }

  /** Hide credentials from the process for the rest of the scenario. */
  withoutEnv(...keys: string[]) {
    for (const key of keys) {
      this.savedEnv[key] = process.env[key]
      delete process.env[key]
    }
  }

  // ── requests ──────────────────────────────────────────────────────────

  async ask(question: string = this.question, options: ContextOptions = this.options) {
    this.previousBundle = this.bundle
    this.bundle = undefined
    this.error = undefined
    try {
      await this.materialise()
      if (!this.configured || !this.set) {
        this.set = openDocumentationSet(this.root, { now: () => this.now })
      }
      this.bundle = await this.watchingNetwork(() => this.set!.context(question, options))
    } catch (err) {
      this.error = err
    }
    return this.bundle
  }

  /** Run something while counting every process the runtime is asked to start. */
  async countingProcesses<T>(fn: () => Promise<T> | T): Promise<T> {
    const spawn = Bun.spawn
    const spawnSync = Bun.spawnSync
    this.spawnCalls = 0
    Bun.spawn = ((...args: any[]) => { this.spawnCalls++; return (spawn as any)(...args) }) as typeof Bun.spawn
    Bun.spawnSync = ((...args: any[]) => { this.spawnCalls++; return (spawnSync as any)(...args) }) as typeof Bun.spawnSync
    try {
      return await fn()
    } finally {
      Bun.spawn = spawn
      Bun.spawnSync = spawnSync
    }
  }

  /** Run something and capture anything written to the process output streams. */
  async capturingOutput<T>(fn: () => Promise<T> | T): Promise<T> {
    const out = process.stdout.write.bind(process.stdout)
    const errw = process.stderr.write.bind(process.stderr)
    const log = console.log
    const cerr = console.error
    this.captured = { stdout: [], stderr: [] }
    process.stdout.write = ((chunk: any) => { this.captured.stdout.push(String(chunk)); return true }) as any
    process.stderr.write = ((chunk: any) => { this.captured.stderr.push(String(chunk)); return true }) as any
    console.log = (...a: unknown[]) => { this.captured.stdout.push(a.join(' ')) }
    console.error = (...a: unknown[]) => { this.captured.stderr.push(a.join(' ')) }
    try {
      return await fn()
    } finally {
      process.stdout.write = out
      process.stderr.write = errw
      console.log = log
      console.error = cerr
    }
  }

  /** Run something while recording every outbound fetch. */
  async watchingNetwork<T>(fn: () => Promise<T> | T): Promise<T> {
    const original = globalThis.fetch
    this.fetchCalls = []
    globalThis.fetch = ((input: any, init?: any) => {
      this.fetchCalls.push(typeof input === 'string' ? input : input?.url ?? String(input))
      return original(input, init)
    }) as typeof fetch
    try {
      return await fn()
    } finally {
      globalThis.fetch = original
    }
  }

  runCli(args: string[], opts: { env?: Record<string, string>; cwd?: string } = {}) {
    const res = spawnSync('bun', ['run', CLI_ENTRY, ...args], {
      cwd: opts.cwd ?? this.root,
      encoding: 'utf-8',
      env: { ...process.env, ...(opts.env ?? {}) },
    })
    this.cli = { stdout: res.stdout ?? '', stderr: res.stderr ?? '', code: res.status }
    return this.cli
  }

  git(args: string[]) {
    const res = spawnSync('git', args, { cwd: this.root, encoding: 'utf-8', env: { ...process.env, GIT_AUTHOR_NAME: 'story', GIT_AUTHOR_EMAIL: 'story@example.invalid', GIT_COMMITTER_NAME: 'story', GIT_COMMITTER_EMAIL: 'story@example.invalid' } })
    return { stdout: res.stdout ?? '', stderr: res.stderr ?? '', code: res.status }
  }

  // ── helpers for assertions ────────────────────────────────────────────

  get depError(): DepError | undefined {
    return this.error instanceof DepError ? this.error : undefined
  }

  errorMessage(): string {
    if (!this.error) return ''
    return this.error instanceof Error ? this.error.message : String(this.error)
  }

  passagesFrom(path: string) {
    return (this.bundle?.passages ?? []).filter((p) => p.document === path)
  }

  readDoc(path: string): string {
    return readFileSync(join(this.root, path), 'utf-8')
  }

  makeUnreadable(path: string) {
    chmodSync(join(this.root, path), 0o000)
  }

  cleanup() {
    for (const [key, value] of Object.entries(this.savedEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    for (const extra of this.extraSets) {
      const root = (extra as DocumentationSet).root
      if (root && existsSync(root)) rmSync(root, { recursive: true, force: true })
    }
    for (const spec of this.docs.values()) {
      const p = join(this.root, spec.path)
      if (existsSync(p)) {
        try { chmodSync(p, 0o644) } catch {}
      }
    }
    try { this.set?.close() } catch {}
    for (const s of this.extraSets) { try { s.close() } catch {} }
    if (this.root && existsSync(this.root)) {
      try { chmodSync(this.root, 0o755) } catch {}
      rmSync(this.root, { recursive: true, force: true })
    }
  }
}

