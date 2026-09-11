#!/usr/bin/env node
/**
 * dep-mcp — start the DEP MCP server, installing or upgrading the dep CLI first.
 *
 * The CLI always lives at <DEP_HOME>/bin/dep (dep.exe on Windows); DEP_HOME
 * defaults to ~/.dep on every operating system. Everything a person should
 * read goes to stderr: stdout belongs to the MCP client.
 *
 *   npx -y @dep/mcp --root /path/to/project
 *
 * Environment:
 *   DEP_HOME               where the CLI, its libraries and caches live (default ~/.dep)
 *   DEP_VERSION            pin a release tag instead of following latest
 *   DEP_MCP_UPGRADE        daily (default) | always | never — how often to ask for a newer release
 *   DEP_RELEASES_API       GitHub releases API base (default https://api.github.com/repos/maxios/DEP/releases)
 *   DEP_RELEASES_DOWNLOAD  release asset base (default https://github.com/maxios/DEP/releases/download)
 *
 * Flags:
 *   --print-location       print where the CLI is kept and exit
 *   --no-upgrade           same as DEP_MCP_UPGRADE=never for this run
 *   anything else          passed through to `dep mcp` (e.g. --root)
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'

const DEFAULT_API = 'https://api.github.com/repos/maxios/DEP/releases'
const DEFAULT_DOWNLOAD = 'https://github.com/maxios/DEP/releases/download'
const DAY = 24 * 60 * 60 * 1000

const platform = process.env.DEP_MCP_PLATFORM || process.platform
const arch = process.env.DEP_MCP_ARCH || process.arch
const windows = platform === 'win32' || platform === 'windows'
const home = process.env.DEP_HOME || join(homedir(), '.dep')
const location = join(home, 'bin', windows ? 'dep.exe' : 'dep')
const statePath = join(home, 'mcp-state.json')
const api = process.env.DEP_RELEASES_API || DEFAULT_API
const downloads = process.env.DEP_RELEASES_DOWNLOAD || DEFAULT_DOWNLOAD

const args = process.argv.slice(2)
const log = (line) => process.stderr.write(`dep-mcp: ${line}\n`)

if (args.includes('--print-location')) {
  process.stdout.write(location + '\n')
  process.exit(0)
}

const upgradePolicy = args.includes('--no-upgrade') ? 'never' : (process.env.DEP_MCP_UPGRADE || 'daily')
const passthrough = args.filter((a) => a !== '--no-upgrade')

function assetName() {
  const os = windows ? 'windows' : platform
  return `dep-${os}-${arch}${windows ? '.exe' : ''}`
}

function installedVersion() {
  if (!existsSync(location)) return null
  const probe = spawnSync(location, ['version'], { encoding: 'utf-8' })
  const match = (probe.stdout || '').match(/dep (\d+\.\d+\.\d+)/)
  return match ? match[1] : null
}

function readState() {
  try { return JSON.parse(readFileSync(statePath, 'utf-8')) } catch { return {} }
}

function writeState(state) {
  try { mkdirSync(home, { recursive: true }); writeFileSync(statePath, JSON.stringify(state, null, 2)) } catch {}
}

async function latestRelease() {
  const pinned = process.env.DEP_VERSION
  const url = pinned ? `${api}/tags/${pinned.startsWith('v') ? pinned : `v${pinned}`}` : `${api}/latest`
  let response
  try {
    response = await fetch(url, { headers: { accept: 'application/vnd.github+json', 'user-agent': 'dep-mcp' } })
  } catch (err) {
    throw new Error(`the release service could not be reached (${url}): ${err.message}`)
  }
  if (!response.ok) throw new Error(`the release service answered ${response.status} for ${url}`)
  const release = await response.json()
  if (!release.tag_name) throw new Error(`the release service returned no release for ${url}`)
  return { tag: release.tag_name, version: release.tag_name.replace(/^v/, '') }
}

async function install(release) {
  const url = `${downloads}/${release.tag}/${assetName()}`
  mkdirSync(join(home, 'bin'), { recursive: true })
  const temp = `${location}.download`
  let response
  try {
    response = await fetch(url, { headers: { 'user-agent': 'dep-mcp' } })
  } catch (err) {
    throw new Error(`the download failed (${url}): ${err.message}`)
  }
  if (!response.ok) throw new Error(`the download failed: ${url} answered ${response.status}`)
  writeFileSync(temp, Buffer.from(await response.arrayBuffer()))
  chmodSync(temp, 0o755)
  const probe = spawnSync(temp, ['version'], { encoding: 'utf-8' })
  if (probe.status !== 0 || !/dep \d+\.\d+/.test(probe.stdout || '')) {
    try { unlinkSync(temp) } catch {}
    throw new Error(`the downloaded release could not be verified: it did not report a version when run; nothing was installed`)
  }
  if (existsSync(location)) renameSync(location, `${location}.prev`)
  renameSync(temp, location)
  log(`Installed dep ${release.version} at ${location}`)
}

function compare(a, b) {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d }
  return 0
}

async function ensureCli() {
  const installed = installedVersion()
  if (!installed) {
    log(`no dep CLI at ${location}; installing`)
    const release = await latestRelease()
    await install(release)
    writeState({ lastCheck: Date.now(), installed: release.version })
    return
  }
  const state = readState()
  const due = upgradePolicy === 'always' || (upgradePolicy === 'daily' && !(state.lastCheck && Date.now() - state.lastCheck < DAY))
  if (upgradePolicy === 'never' || !due) return
  let release
  try {
    release = await latestRelease()
  } catch (err) {
    log(`warning: ${err.message}; continuing with dep ${installed}`)
    return
  }
  writeState({ ...state, lastCheck: Date.now() })
  if (compare(release.version, installed) > 0) {
    log(`dep ${installed} installed, ${release.version} available; upgrading`)
    try {
      await install(release)
      writeState({ lastCheck: Date.now(), installed: release.version })
    } catch (err) {
      log(`warning: ${err.message}; continuing with dep ${installed}`)
    }
  }
}

try {
  await ensureCli()
} catch (err) {
  log(err.message)
  process.exit(1)
}

const server = spawn(location, ['mcp', ...passthrough], { stdio: 'inherit' })
server.on('error', (err) => { log(`could not start ${location}: ${err.message}`); process.exit(1) })
server.on('exit', (code) => process.exit(code ?? 0))
