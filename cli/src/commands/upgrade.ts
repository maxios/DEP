import { chmodSync, existsSync, renameSync, unlinkSync, writeFileSync } from 'fs'
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

function runningFromSource(): boolean {
  return basename(process.execPath).replace(/\.exe$/, '') === 'bun'
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
