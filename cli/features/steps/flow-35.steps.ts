import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join, resolve } from 'path'
import { spawn } from 'child_process'
import { DepWorld } from '../support/world'
import { fake, runnableAsset, INSTALLED, NEWER } from './flow-33.steps'

const LAUNCHER = resolve(import.meta.dir, '..', '..', '..', 'packages', 'dep-mcp', 'index.mjs')

function home(world: DepWorld): string {
  let h = world.notes.get('depHome') as string | undefined
  if (!h) {
    h = join(world.root, 'home')
    world.notes.set('depHome', h)
  }
  return h
}

function location(world: DepWorld): string {
  return join(home(world), 'bin', 'dep')
}

function env(world: DepWorld): Record<string, string> {
  const f = fake(world)
  const e: Record<string, string> = { DEP_HOME: home(world), DEP_RELEASES_API: f.api, DEP_RELEASES_DOWNLOAD: f.downloads }
  const platform = world.notes.get('platform') as string | undefined
  if (platform) e.DEP_MCP_PLATFORM = platform
  const policy = world.notes.get('upgradePolicy') as string | undefined
  if (policy) e.DEP_MCP_UPGRADE = policy
  return e
}

interface Launch { stdout: string; stderr: string; code: number | null }

/** Start the launcher, hand it one MCP request, collect what comes back, stop it. */
function launch(world: DepWorld, args: string[] = []): Promise<Launch> {
  return new Promise((done) => {
    const child = spawn('node', [LAUNCHER, ...args], { env: { ...process.env, ...env(world) }, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let finished = false
    const finish = (code: number | null) => {
      if (finished) return
      finished = true
      try { child.kill() } catch {}
      done({ stdout, stderr, code })
    }
    child.stdout.on('data', (d) => { stdout += String(d); if (stdout.includes('\n')) setTimeout(() => finish(0), 100) })
    child.stderr.on('data', (d) => { stderr += String(d) })
    child.on('exit', (code) => finish(code))
    child.stdin.write('{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"story","version":"0"}}}\n')
    setTimeout(() => finish(null), 10_000)
  })
}

Given('the launcher runs on {string}', function (this: DepWorld, os: string) {
  this.notes.set('platform', os === 'windows' ? 'win32' : os)
  this.notes.set('noHome', true)
})

When('I ask the launcher where it keeps the CLI', async function (this: DepWorld) {
  const e: Record<string, string> = {}
  const platform = this.notes.get('platform') as string | undefined
  if (platform) e.DEP_MCP_PLATFORM = platform
  if (!this.notes.get('noHome')) e.DEP_HOME = home(this)
  const base = { ...process.env }
  if (this.notes.get('noHome')) delete base.DEP_HOME
  await new Promise<void>((done) => {
    const child = spawn('node', [LAUNCHER, '--print-location'], { env: { ...base, ...e } })
    let out = ''
    child.stdout.on('data', (d) => { out += String(d) })
    child.on('exit', () => { this.result = out.trim(); done() })
  })
})

Then('it names {string}', function (this: DepWorld, expected: string) {
  const printed = String(this.result).replace(homedir(), '~').replace(/\\/g, '/')
  assert.equal(printed, expected)
})

Given('no CLI is installed on this machine', function (this: DepWorld) {
  assert.ok(!existsSync(location(this)))
  this.notes.set('installedPath', location(this))
})

Given('a release is published', function (this: DepWorld) {
  fake(this).release.latest = NEWER
  fake(this).release.tags.push(NEWER)
})

Given("the CLI is installed at the launcher's location", function (this: DepWorld) {
  const path = location(this)
  mkdirSync(join(home(this), 'bin'), { recursive: true })
  writeFileSync(path, runnableAsset(INSTALLED))
  chmodSync(path, 0o755)
  this.notes.set('installedPath', path)
  this.notes.set('installedBefore', readFileSync(path, 'utf-8'))
})

Given('the launcher checked for releases earlier today', function (this: DepWorld) {
  writeFileSync(join(home(this), 'mcp-state.json'), JSON.stringify({ lastCheck: Date.now() - 60_000, installed: INSTALLED }))
})

Given('the home location is declared as a different directory', function (this: DepWorld) {
  this.notes.set('depHome', join(this.root, 'elsewhere', 'dep-home'))
})

Given('upgrades are declared off', function (this: DepWorld) {
  this.notes.set('upgradePolicy', 'never')
})

When('the launcher starts', async function (this: DepWorld) {
  fake(this).requests.length = 0
  this.notes.set('launch', await launch(this))
})

Then("the CLI is placed at the launcher's location and is executable", function (this: DepWorld) {
  const path = location(this)
  assert.ok(existsSync(path), `nothing at ${path}; stderr: ${(this.notes.get('launch') as Launch).stderr}`)
  assert.ok(statSync(path).mode & 0o111)
})

Then('I am told which version was installed', function (this: DepWorld) {
  const l = this.notes.get('launch') as Launch
  assert.ok(l.stderr.includes(`Installed dep ${NEWER}`), l.stderr)
})

Then('the server answers a session', function (this: DepWorld) {
  const l = this.notes.get('launch') as Launch
  const line = l.stdout.split('\n').find((x) => x.trim())
  assert.ok(line, `no answer on stdout; stderr: ${l.stderr}`)
  const reply = JSON.parse(line!)
  assert.equal(reply.result.serverInfo.name, 'dep')
})

Then('the release service is not asked', function (this: DepWorld) {
  assert.deepEqual(fake(this).requests.filter((p) => p.startsWith('/releases')), [])
})

Then('the CLI is replaced with the newer release', function (this: DepWorld) {
  const path = location(this)
  assert.notEqual(readFileSync(path, 'utf-8'), this.notes.get('installedBefore'))
  assert.ok(readFileSync(path, 'utf-8').includes(NEWER))
})

Then('the previous CLI is kept beside it', function (this: DepWorld) {
  assert.ok(existsSync(`${location(this)}.prev`))
})

Then('it names a path inside that directory', function (this: DepWorld) {
  assert.ok(String(this.result).startsWith(home(this)), `${this.result} is not inside ${home(this)}`)
})

Then('I am warned the release service could not be reached', function (this: DepWorld) {
  const l = this.notes.get('launch') as Launch
  assert.ok(l.stderr.includes('could not be reached'), l.stderr)
})

Then('the launcher stops with a message naming the release service', function (this: DepWorld) {
  const l = this.notes.get('launch') as Launch
  assert.notEqual(l.code, 0)
  assert.ok(l.stderr.includes('release service'), l.stderr)
})

Then("nothing is placed at the launcher's location", function (this: DepWorld) {
  assert.ok(!existsSync(location(this)))
  assert.ok(!existsSync(`${location(this)}.download`))
})

Then('the launcher stops with a message saying the download could not be verified', function (this: DepWorld) {
  const l = this.notes.get('launch') as Launch
  assert.notEqual(l.code, 0)
  assert.ok(l.stderr.includes('could not be verified'), l.stderr)
})
