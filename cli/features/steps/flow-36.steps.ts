import { Given, When, Then, type DataTable } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { chmodSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { DepWorld } from '../support/world'
import pkg from '../../package.json'

interface Report {
  ok: boolean
  version: string
  platform: { os: string; arch: string; asset: string }
  home: string
  checks: Array<{ name: string; ok: boolean; detail: string }>
  report: string
}

const SECRET = 'sk-doctor-secret-3f9c1b2a7d4e'

function env(world: DepWorld): Record<string, string> {
  const e: Record<string, string> = { DEP_HOME: world.notes.get('depHome') as string }
  if (world.notes.get('credential')) e.DEP_OPENAI_API_KEY = SECRET
  return e
}

function report(world: DepWorld): Report {
  assert.ok(world.cli, 'doctor was not run')
  try {
    return JSON.parse(world.cli.stdout) as Report
  } catch {
    assert.fail(`doctor did not answer with data:\n${world.cli.stdout}\n${world.cli.stderr}`)
  }
}

Given('the CLI is installed and can write to its home location', function (this: DepWorld) {
  this.ensureRoot()
  const home = join(this.root, 'home')
  mkdirSync(home, { recursive: true })
  this.notes.set('depHome', home)
})

Given('the CLI is installed but its home location cannot be written', function (this: DepWorld) {
  this.ensureRoot()
  const home = join(this.root, 'sealed-home')
  mkdirSync(home, { recursive: true })
  chmodSync(home, 0o555)
  this.notes.set('depHome', home)
})

Given('a credential is present in the environment', function (this: DepWorld) {
  this.notes.set('credential', true)
})

When('I ask the CLI to check itself', async function (this: DepWorld) {
  await this.runCliAsync(['doctor'], { env: env(this) })
})

When('I ask the CLI to check itself and request a machine-readable answer', async function (this: DepWorld) {
  await this.runCliAsync(['doctor', '--json'], { env: env(this) })
})

When('I ask the CLI where to file its report', async function (this: DepWorld) {
  await this.runCliAsync(['doctor', '--issue'], { env: env(this) })
})

Then('every check passes', function (this: DepWorld) {
  assert.equal(this.cli!.code, 0, this.cli!.stdout + this.cli!.stderr)
  assert.ok(!this.cli!.stdout.includes('✗'), this.cli!.stdout)
  assert.ok((this.cli!.stdout.match(/✓/g) ?? []).length >= 6, this.cli!.stdout)
})

Then('I am told the version and the platform it was built for', function (this: DepWorld) {
  const out = this.cli!.stdout
  assert.ok(out.includes(`dep ${pkg.version}`), out)
  assert.ok(out.includes(`${process.platform === 'win32' ? 'windows' : process.platform}-${process.arch}`), out)
})

Then('the verdict is that the installation works', function (this: DepWorld) {
  assert.ok(this.cli!.stdout.includes('All checks pass'), this.cli!.stdout)
})

Then('I receive each check by name with its outcome and a detail', function (this: DepWorld) {
  const r = report(this)
  assert.ok(r.checks.length >= 6)
  for (const c of r.checks) {
    assert.equal(typeof c.name, 'string')
    assert.equal(typeof c.ok, 'boolean')
    assert.ok(c.detail.length > 0, `${c.name} has no detail`)
  }
})

Then('I receive the version, the platform and a report ready to file', function (this: DepWorld) {
  const r = report(this)
  assert.equal(r.version, pkg.version)
  assert.ok(r.platform.os && r.platform.arch && r.platform.asset)
  assert.ok(r.report.startsWith('## dep doctor'))
})

Then("I am given a link that opens a new issue on the project's repository", function (this: DepWorld) {
  const url = this.cli!.stdout.trim()
  assert.ok(url.startsWith('https://github.com/maxios/DEP/issues/new?'), url)
})

Then('the link carries the report', function (this: DepWorld) {
  const url = new URL(this.cli!.stdout.trim())
  const body = url.searchParams.get('body') ?? ''
  assert.ok(body.includes('## dep doctor'), body.slice(0, 200))
  assert.ok(url.searchParams.get('title')!.startsWith('install:'))
})

Then('the check {string} passes', function (this: DepWorld, name: string) {
  const c = report(this).checks.find((x) => x.name === name)
  assert.ok(c, `no check named ${name}: ${report(this).checks.map((x) => x.name)}`)
  assert.equal(c!.ok, true, c!.detail)
})

Then('the check {string} fails', function (this: DepWorld, name: string) {
  assert.notEqual(this.cli!.code, 0)
  const line = this.cli!.stdout.split('\n').find((l) => l.includes(`✗ ${name}`))
  assert.ok(line, `no failing ${name} line:\n${this.cli!.stdout}`)
})

Then('the verdict is that the installation does not work', function (this: DepWorld) {
  assert.ok(this.cli!.stdout.includes('Some checks failed'), this.cli!.stdout)
})

Then('the report names the home location', function (this: DepWorld) {
  const home = (this.notes.get('depHome') as string).replace(homedir(), '~')
  assert.ok(this.cli!.stdout.includes(home), this.cli!.stdout)
})

Then('the report does not contain the credential', function (this: DepWorld) {
  const r = report(this)
  assert.ok(!JSON.stringify(r).includes(SECRET))
})

Then("the report shows the home location relative to the user's home, not the full path", function (this: DepWorld) {
  const r = report(this)
  assert.ok(!r.report.includes(homedir()), r.report)
  assert.ok(r.home.startsWith('~') || !r.home.includes(homedir()), r.home)
})
