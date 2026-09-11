import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { DepWorld, SCRATCH } from '../support/world'

interface SetupReport {
  ok: boolean
  version: string
  binary: string
  desktopConfig: string | null
  steps: Array<{ step: string; ok: boolean; skipped?: boolean; detail: string }>
}

function home(world: DepWorld): string {
  let h = world.notes.get('setupHome') as string | undefined
  if (!h) {
    h = join(world.root, 'home')
    mkdirSync(h, { recursive: true })
    world.notes.set('setupHome', h)
  }
  return h
}

function configFile(world: DepWorld): string {
  return join(world.root, 'desktop', 'claude_desktop_config.json')
}

function readConfig(world: DepWorld): any {
  return JSON.parse(readFileSync(configFile(world), 'utf-8'))
}

async function setup(world: DepWorld, extra: string[] = []) {
  await world.materialise()
  return world.runCliAsync(['setup', '--root', world.root, '--home', home(world), '--desktop-config', configFile(world), ...extra], { env: { DEP_HOME: home(world) } })
}

Given('a desktop configuration that already names another server', function (this: DepWorld) {
  mkdirSync(join(this.root, 'desktop'), { recursive: true })
  writeFileSync(configFile(this), JSON.stringify({ mcpServers: { other: { command: 'other-server', args: ['--flag'] } }, theme: 'dark' }, null, 2))
})

Given('setup has already been run for that project', async function (this: DepWorld) {
  const first = await setup(this)
  assert.equal(first.code, 0, first.stdout + first.stderr)
})

Given('a home location that cannot be written', function (this: DepWorld) {
  const h = join(this.root, 'sealed-home')
  mkdirSync(h, { recursive: true })
  chmodSync(h, 0o555)
  this.notes.set('setupHome', h)
})

When('I run setup for that project with a home location and a desktop configuration file', async function (this: DepWorld) {
  await setup(this)
})

When('I run setup for that project and request a machine-readable answer', async function (this: DepWorld) {
  await setup(this, ['--json'])
})

When('I run setup for that project and decline changes to the search path', async function (this: DepWorld) {
  await setup(this, ['--no-path'])
})

When('I run setup for that project with that home location', async function (this: DepWorld) {
  await setup(this)
})

When('I run setup without naming a project, from a place that is not a project', async function (this: DepWorld) {
  const elsewhere = mkdtempSync(join(SCRATCH, 'nowhere-'))
  await this.runCliAsync(['setup', '--home', home(this), '--desktop-config', configFile(this)], { cwd: elsewhere, env: { DEP_HOME: home(this) } })
})

Then('the desktop configuration names the CLI as the server for that project', function (this: DepWorld) {
  assert.equal(this.cli!.code, 0, this.cli!.stdout + this.cli!.stderr)
  const entry = readConfig(this).mcpServers.dep
  assert.ok(entry, 'no dep entry')
  assert.equal(entry.command, process.execPath)
  assert.ok(entry.args.includes('mcp') && entry.args.includes('--root') && entry.args.includes(this.root), JSON.stringify(entry.args))
})

Then('I am told where the CLI lives, that the desktop client was configured, and that the checks pass', function (this: DepWorld) {
  const out = this.cli!.stdout
  assert.match(out, /install\s+.*(copied to|already installed|running from source)/)
  assert.match(out, /desktop\s+.*"dep" serves/)
  assert.match(out, /doctor\s+all \d+ checks pass/)
})

Then('I am told to restart the desktop client', function (this: DepWorld) {
  assert.ok(this.cli!.stdout.includes('Restart Claude Desktop'), this.cli!.stdout)
})

Then('the desktop configuration still names the other server', function (this: DepWorld) {
  const config = readConfig(this)
  assert.deepEqual(config.mcpServers.other, { command: 'other-server', args: ['--flag'] })
  assert.equal(config.theme, 'dark')
})

Then('it names the CLI as the {string} server', function (this: DepWorld, name: string) {
  assert.equal(readConfig(this).mcpServers[name].command, process.execPath)
})

Then('the previous configuration is kept beside it', function (this: DepWorld) {
  assert.ok(existsSync(`${configFile(this)}.bak`))
  assert.ok(readFileSync(`${configFile(this)}.bak`, 'utf-8').includes('other-server'))
})

Then('the desktop configuration names exactly one {string} server', function (this: DepWorld, name: string) {
  const servers = readConfig(this).mcpServers
  assert.deepEqual(Object.keys(servers), [name])
})

Then('I receive each step by name with its outcome', function (this: DepWorld) {
  const report = JSON.parse(this.cli!.stdout) as SetupReport
  assert.deepEqual(report.steps.map((s) => s.step), ['install', 'path', 'desktop', 'doctor'])
  for (const s of report.steps) assert.equal(typeof s.ok, 'boolean')
  this.result = report
})

Then('I receive the paths that were written', function (this: DepWorld) {
  const report = this.result as SetupReport
  assert.ok(report.binary.endsWith('/bin/dep') || report.binary.endsWith('\\bin\\dep.exe'), report.binary)
  assert.ok(report.desktopConfig?.endsWith('claude_desktop_config.json'), String(report.desktopConfig))
})

Then('the desktop client is not configured', function (this: DepWorld) {
  assert.ok(!existsSync(configFile(this)))
})

Then('I am told to name a project', function (this: DepWorld) {
  assert.ok(this.cli!.stdout.includes('--root <project>'), this.cli!.stdout)
})

Then('the search path step reports that it was skipped', function (this: DepWorld) {
  assert.match(this.cli!.stdout, /path\s+search path left alone/)
})

Then('the install step fails and names the location', function (this: DepWorld) {
  assert.notEqual(this.cli!.code, 0)
  const sealed = home(this)
  const line = this.cli!.stdout.split('\n').find((l) => l.includes('✗ install'))
  assert.ok(line, this.cli!.stdout)
  assert.ok(line!.includes('sealed-home'), line)
  void sealed
})

Then('the verdict is that setup did not complete', function (this: DepWorld) {
  assert.ok(this.cli!.stdout.includes('Setup did not complete'), this.cli!.stdout)
})
