import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs'
import { basename, dirname, join } from 'path'
import { spawnSync } from 'child_process'
import pkg from '../../package.json'

export const VERSION: string = pkg.version

const DEFAULT_API = 'https://api.github.com/repos/maxios/DEP/releases'
const DEFAULT_DOWNLOAD = 'https://github.com/maxios/DEP/releases/download'

export interface UpgradeFlags {
  check?: boolean
  version?: string | boolean
  target?: string | boolean
  json?: boolean
}

export function versionCommand(flags: { json?: boolean }) {
  if (flags.json) console.log(JSON.stringify({ version: VERSION }))
  else console.log(`dep ${VERSION}`)
}

function fail(message: string, json?: boolean): never {
  if (json) console.log(JSON.stringify({ ok: false, error: message }))
  else console.error(message)
  process.exit(1)
}

export function runningFromSource(): boolean {
  return basename(process.execPath).replace(/\.exe$/, '') === 'bun'
}

/** How to start this very CLI again: the binary, or bun plus the entry file. */
export function selfCommand(): { command: string; args: string[] } {
  const entry = process.argv[1] ?? ''
  if (runningFromSource()) return { command: process.execPath, args: ['run', entry] }
  return { command: process.execPath, args: [] }
}

export type UpgradePolicy = 'daily' | 'always' | 'never'

const DAY = 24 * 60 * 60 * 1000

/**
 * The check a long-running command makes on start: at most once a day (or as
 * DEP_MCP_UPGRADE says), ask for the latest release and, if it is newer,
 * replace this binary — the same verified swap `dep upgrade` performs. Never
 * throws and never takes long: a slow or absent release service is a note on
 * stderr, not a failed start. Returns a one-line account of what happened.
 */
export async function selfUpgradeIfDue(options: { policy?: string; log?: (line: string) => void; timeoutMs?: number } = {}): Promise<string> {
  const log = options.log ?? (() => {})
  const policy = (options.policy ?? process.env.DEP_MCP_UPGRADE ?? 'daily') as UpgradePolicy
  if (policy === 'never') return 'release check skipped: upgrades are declared off'
  if (runningFromSource()) return 'release check skipped: running from source (git pull to update)'

  const { depHome } = await import('../embeddings/native')
  const statePath = join(depHome(), 'mcp-state.json')
  let state: { lastCheck?: number; installed?: string } = {}
  try { state = JSON.parse(readFileSync(statePath, 'utf-8')) } catch {}
  if (policy === 'daily' && state.lastCheck && Date.now() - state.lastCheck < DAY) return 'release check skipped: already checked today'

  const api = process.env.DEP_RELEASES_API ?? DEFAULT_API
  const downloads = process.env.DEP_RELEASES_DOWNLOAD ?? DEFAULT_DOWNLOAD
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000)
  try {
    const response = await fetch(`${api}/latest`, { signal: controller.signal, headers: { accept: 'application/vnd.github+json', 'user-agent': `dep/${VERSION}` } })
    if (!response.ok) return `release check failed: the release service answered ${response.status}`
    const release = (await response.json()) as { tag_name?: string }
    const latest = (release.tag_name ?? '').replace(/^v/, '')
    writeState(statePath, { ...state, lastCheck: Date.now() })
    if (!latest || compareVersions(latest, VERSION) <= 0) return `release check: dep ${VERSION} is current`

    const target = process.execPath
    const temp = join(dirname(target), `.${basename(target)}.download`)
    const asset = `${downloads}/${release.tag_name}/${platformBinary()}`
    const download = await fetch(asset, { signal: controller.signal, headers: { 'user-agent': `dep/${VERSION}` } })
    if (!download.ok) return `release check: ${latest} is available but the download answered ${download.status}`
    writeFileSync(temp, new Uint8Array(await download.arrayBuffer()))
    chmodSync(temp, 0o755)
    const probe = spawnSync(temp, ['version'], { encoding: 'utf-8' })
    if (probe.status !== 0 || !/^dep \d+\.\d+/.test((probe.stdout ?? '').trim())) {
      if (existsSync(temp)) unlinkSync(temp)
      return `release check: ${latest} was downloaded but could not be verified; kept ${VERSION}`
    }
    if (existsSync(target)) renameSync(target, `${target}.prev`)
    renameSync(temp, target)
    writeState(statePath, { lastCheck: Date.now(), installed: latest })
    log(`upgraded dep ${VERSION} → ${latest}; the new version serves from the next start`)
    return `upgraded dep ${VERSION} → ${latest}`
  } catch (err) {
    return `release check skipped: the release service could not be reached (${err instanceof Error ? err.message : String(err)})`
  } finally {
    clearTimeout(timer)
  }
}

function writeState(path: string, state: unknown) {
  try {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(state, null, 2))
  } catch {}
}

function platformBinary(): string {
  const os = process.platform === 'win32' ? 'windows' : process.platform
  return `dep-${os}-${process.arch}${process.platform === 'win32' ? '.exe' : ''}`
}

async function fetchJson(url: string): Promise<Response> {
  try {
    return await fetch(url, { headers: { accept: 'application/vnd.github+json', 'user-agent': `dep/${VERSION}` } })
  } catch (err) {
    throw new Error(`the release service could not be reached (${url}): ${err instanceof Error ? err.message : String(err)}`)
  }
}

/**
 * Replace this binary with a published release — the latest, or a named one.
 * The download is verified by running it and checking it reports a version
 * before the installed binary is touched; the previous binary is kept beside
 * the new one as `<name>.prev`.
 */
export async function upgradeCommand(flags: UpgradeFlags) {
  const json = !!flags.json
  const api = process.env.DEP_RELEASES_API ?? DEFAULT_API
  const downloads = process.env.DEP_RELEASES_DOWNLOAD ?? DEFAULT_DOWNLOAD

  const target = typeof flags.target === 'string' ? flags.target : runningFromSource() ? null : process.execPath
  if (!target && !flags.check) {
    fail('dep is running from its source tree, not an installed binary; update it with `git pull` (then `bun install`) instead of `dep upgrade`', json)
  }

  const wanted = typeof flags.version === 'string' ? flags.version : null
  const url = wanted ? `${api}/tags/${wanted.startsWith('v') ? wanted : `v${wanted}`}` : `${api}/latest`
  let response: Response
  try {
    response = await fetchJson(url)
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err), json)
  }
  if (response.status === 404 && wanted) fail(`release ${wanted} is not published`, json)
  if (!response.ok) fail(`the release service answered ${response.status} for ${url}`, json)
  const release = (await response.json()) as { tag_name?: string }
  if (!release.tag_name) fail(`the release service returned no release for ${url}`, json)
  const tag = release.tag_name!
  const latest = tag.replace(/^v/, '')

  if (flags.check) {
    const available = compareVersions(latest, VERSION) > 0
    if (json) console.log(JSON.stringify({ ok: true, installed: VERSION, latest, upgradeAvailable: available }))
    else console.log(`Installed ${VERSION}, latest ${latest} — ${available ? 'upgrade available: run `dep upgrade`' : 'up to date'}`)
    return
  }

  if (!wanted && compareVersions(latest, VERSION) <= 0) {
    if (json) console.log(JSON.stringify({ ok: true, installed: VERSION, latest, upgraded: false }))
    else console.log(`dep ${VERSION} is already up to date`)
    return
  }

  if (!json) {
    console.log(`Installed: dep ${VERSION}`)
    console.log(`Installing: dep ${latest}`)
  }

  const asset = `${downloads}/${tag}/${platformBinary()}`
  const temp = join(dirname(target!), `.${basename(target!)}.download`)
  let download: Response
  try {
    download = await fetch(asset, { headers: { 'user-agent': `dep/${VERSION}` } })
  } catch (err) {
    fail(`the download failed (${asset}): ${err instanceof Error ? err.message : String(err)}`, json)
  }
  if (!download.ok) fail(`the download failed: ${asset} answered ${download.status}`, json)
  writeFileSync(temp, new Uint8Array(await download.arrayBuffer()))
  chmodSync(temp, 0o755)

  const probe = spawnSync(temp, ['version'], { encoding: 'utf-8' })
  const reported = (probe.stdout ?? '').trim()
  if (probe.status !== 0 || !/^dep \d+\.\d+/.test(reported)) {
    if (existsSync(temp)) unlinkSync(temp)
    fail(`the downloaded release could not be verified: it did not report a version when run (${(probe.stderr ?? probe.error?.message ?? '').toString().trim() || 'no output'}); the installed dep was left as it was`, json)
  }

  const previous = `${target}.prev`
  if (existsSync(target!)) renameSync(target!, previous)
  renameSync(temp, target!)

  if (json) console.log(JSON.stringify({ ok: true, installed: VERSION, latest, upgraded: true, path: target, previous }))
  else console.log(`Installed dep ${latest} at ${target} (previous kept as ${previous})`)
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}
