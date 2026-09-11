import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'fs'
import { homedir, tmpdir } from 'os'
import { basename, join } from 'path'
import { spawn } from 'child_process'
import { depHome } from '../embeddings/native'
import { openDocumentationSet } from '../lib'
import { VERSION } from './upgrade'

export interface DoctorCheck {
  name: string
  ok: boolean
  detail: string
}

export interface DoctorReport {
  ok: boolean
  version: string
  platform: { os: string; arch: string; asset: string; runtime: string }
  home: string
  checks: DoctorCheck[]
  /** Markdown, safe to paste into an issue: no secrets, no absolute home paths. */
  report: string
}

const REPO = 'maxios/DEP'

/** The command that starts this very CLI again — the binary, or bun plus the entry file. */
function selfCommand(): { command: string; args: string[] } {
  const entry = process.argv[1] ?? ''
  if (basename(process.execPath).replace(/\.exe$/, '') === 'bun') return { command: process.execPath, args: ['run', entry] }
  return { command: process.execPath, args: [] }
}

/** Replace the user's home directory with ~ wherever it appears. */
export function redact(text: string): string {
  const home = homedir()
  let out = text.split(home).join('~')
  if (process.platform === 'win32') out = out.split(home.replace(/\\/g, '/')).join('~')
  return out
}

function fixtureProject(dir: string) {
  mkdirSync(join(dir, 'docs', 'explanation'), { recursive: true })
  mkdirSync(join(dir, 'docs', 'reference'), { recursive: true })
  const now = new Date().toISOString()
  writeFileSync(join(dir, '.docspec'), `dep_version: "0.1.0"
project: { name: "dep doctor fixture", docs_root: ./docs }
audiences:
  - { id: ai-agent, name: "AI Agent", goal: g, context: c, entry_point: ./docs/explanation/freshness.md, vocabulary_level: expert, time_budget: deep, success_criteria: s }
architecture:
  directory_map: { explanation: docs/explanation, reference: docs/reference }
  require_index_files: false
governance: { ownership_strategy: per-document, fallback_owner: "@doctor", review_cadence: { explanation: 180, reference: 30 } }
generation: { ai_provider: constrained, require_human_review: false }
vectorization: { provider: hash }
`)
  const doc = (path: string, type: string, title: string, body: string, links = '[]') => writeFileSync(join(dir, path), `---
dep:
  type: ${type}
  audience: [ai-agent]
  owner: "@doctor"
  created: ${now}
  last_verified: ${now}
  confidence: high
  depends_on: []
  tags: [freshness]
  links: ${links}
---

# ${title}

${body}
`)
  doc('docs/explanation/freshness.md', 'explanation', 'How freshness is decided',
    "A document is fresh when it was verified recently. Freshness is decided by comparing the document's last verified date against the review cadence declared for its type.",
    '[{ target: ../reference/cadence.md, rel: REQUIRES }]')
  doc('docs/reference/cadence.md', 'reference', 'Review cadence', 'The review cadence is the number of days a document stays fresh after it was verified.')
}

async function mcpHandshake(root: string): Promise<string> {
  const self = selfCommand()
  const child = spawn(self.command, [...self.args, 'mcp', '--root', root], { stdio: ['pipe', 'pipe', 'pipe'] })
  const exited = new Promise<void>((done) => { child.on('exit', () => done()); child.on('error', () => done()) })
  try {
    return await new Promise<string>((resolve, reject) => {
      let out = ''
      let err = ''
      const timer = setTimeout(() => reject(new Error(`no answer within 15s${err ? `: ${err.trim()}` : ''}`)), 15_000)
      child.stdout.on('data', (d) => {
        out += String(d)
        const line = out.split('\n').find((l) => l.trim())
        if (!line) return
        clearTimeout(timer)
        try {
          const reply = JSON.parse(line)
          const info = reply?.result?.serverInfo
          if (info?.name === 'dep') resolve(`server ${info.name} ${info.version} answered initialize`)
          else reject(new Error(`unexpected answer: ${line.slice(0, 200)}`))
        } catch {
          reject(new Error(`unparseable answer: ${line.slice(0, 200)}`))
        }
      })
      child.stderr.on('data', (d) => { err += String(d) })
      child.on('error', (e) => { clearTimeout(timer); reject(e) })
      child.stdin.on('error', () => {})
      child.stdin.write('{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"dep doctor","version":"0"}}}\n')
    })
  } finally {
    // Closing stdin ends the server cleanly; only then may the fixture be removed —
    // Windows refuses to delete files a still-running child has open.
    try { child.stdin.end() } catch {}
    await Promise.race([exited, new Promise<void>((done) => setTimeout(done, 3000))])
    if (child.exitCode === null) { try { child.kill() } catch {} ; await Promise.race([exited, new Promise<void>((done) => setTimeout(done, 2000))]) }
  }
}

/** Remove the throwaway project; on Windows a handle can outlive its process for a moment, so retry, then let it go. */
async function removeFixture(dir: string): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      rmSync(dir, { recursive: true, force: true })
      return
    } catch {
      await new Promise((done) => setTimeout(done, 200 * (attempt + 1)))
    }
  }
}

/**
 * Prove the installation works: this binary runs, its home is writable, and
 * on a throwaway project it validates, indexes (offline hash provider),
 * answers a context bundle and serves MCP. `full` also loads the local
 * embedding model, which downloads it on first use.
 */
export async function runDoctor(options: { full?: boolean } = {}): Promise<DoctorReport> {
  const checks: DoctorCheck[] = []
  const check = async (name: string, fn: () => Promise<string> | string) => {
    try {
      checks.push({ name, ok: true, detail: redact(await fn()) })
    } catch (err) {
      checks.push({ name, ok: false, detail: redact(err instanceof Error ? err.message : String(err)) })
    }
  }
  const os = process.platform === 'win32' ? 'windows' : process.platform
  const asset = `dep-${os}-${process.arch}${process.platform === 'win32' ? '.exe' : ''}`
  const home = depHome()

  await check('version', () => `dep ${VERSION} (${basename(process.execPath).startsWith('bun') ? 'from source' : 'standalone binary'})`)
  await check('home', () => {
    mkdirSync(join(home, 'bin'), { recursive: true })
    const probe = join(home, `.doctor-${process.pid}`)
    writeFileSync(probe, 'ok')
    unlinkSync(probe)
    return `${home} is writable`
  })

  const fixture = mkdtempSync(join(tmpdir(), 'dep-doctor-'))
  try {
    fixtureProject(fixture)
    const set = openDocumentationSet(fixture)
    await check('validate', () => {
      const v = set.validate()
      if (!v.summary.ok) throw new Error(`fixture failed validation: ${JSON.stringify(v.summary)}`)
      return `${v.summary.pass} document(s) pass, graph checks pass`
    })
    await check('index', async () => {
      const r = await set.index()
      if (r.chunks === 0) throw new Error('no chunks were indexed')
      return `${r.processed.length} document(s), ${r.chunks} chunks, provider ${r.provider}`
    })
    await check('context', async () => {
      const b = await set.context("how is a document's freshness decided", { budget: 2000 })
      if (b.passages.length === 0) throw new Error(`no passages; notices: ${b.notices.map((n) => n.code).join(', ')}`)
      const required = b.passages.some((p) => p.reason.kind === 'required-by')
      return `${b.passages.length} passage(s), ranking ${b.ranking}${required ? ', prerequisite pulled in' : ''}`
    })
    await check('mcp', () => mcpHandshake(fixture))
    if (options.full) {
      await check('local-embeddings', async () => {
        const started = Date.now()
        const { LocalEmbeddingProvider } = await import('../embeddings/local')
        const provider = new LocalEmbeddingProvider()
        await provider.init()
        const [vector] = await provider.embed(['freshness'])
        provider.dispose()
        if (!vector || vector.length !== provider.dimensions) throw new Error('model produced no embedding')
        return `${provider.name} loaded and embedded in ${((Date.now() - started) / 1000).toFixed(1)}s`
      })
    }
    set.close()
  } finally {
    await removeFixture(fixture)
  }

  const ok = checks.every((c) => c.ok)
  const platform = { os, arch: process.arch, asset, runtime: `bun ${typeof Bun !== 'undefined' ? Bun.version : 'unknown'}` }
  const report = [
    `## dep doctor — ${ok ? 'all checks pass' : 'FAILED'}`,
    '',
    `- version: dep ${VERSION}`,
    `- platform: ${os}-${process.arch} (${asset}), ${platform.runtime}`,
    `- home: ${redact(home)}`,
    '',
    '| check | result | detail |',
    '|---|---|---|',
    ...checks.map((c) => `| ${c.name} | ${c.ok ? '✓' : '✗'} | ${c.detail.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`),
  ].join('\n')

  return { ok, version: VERSION, platform, home: redact(home), checks, report }
}

export function issueUrl(report: DoctorReport): string {
  const failing = report.checks.filter((c) => !c.ok).map((c) => c.name)
  const title = `install: ${report.platform.os}-${report.platform.arch}: ${failing.length ? `${failing.join(', ')} failed` : 'report'}`
  const body = `${report.report}\n\n<!-- generated by \`dep doctor --issue\` -->`
  return `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
}

export async function doctorCommand(flags: { json?: boolean; full?: boolean; issue?: boolean }) {
  const report = await runDoctor({ full: flags.full })
  if (flags.issue) {
    console.log(issueUrl(report))
  } else if (flags.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`dep ${report.version} · ${report.platform.os}-${report.platform.arch} (${report.platform.asset}) · home ${report.home}`)
    console.log('')
    for (const c of report.checks) console.log(`  ${c.ok ? '✓' : '✗'} ${c.name.padEnd(17)} ${c.detail}`)
    console.log('')
    console.log(report.ok ? 'All checks pass — dep works on this machine.' : 'Some checks failed. File the report with: dep doctor --issue')
  }
  process.exit(report.ok ? 0 : 1)
}
