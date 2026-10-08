import { Given, When, Then, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { existsSync } from 'fs'
import { join } from 'path'
import { DepWorld, DEFAULT_QUESTION, freshnessBody } from '../support/world'
import { ClaudeRunner, MockRunner, loopReport, type BeatResult, type Bundle, type Heartbeat, type Runner, type UsageReceipt } from '../../src/lib'
import { depTools } from '../../src/mcp/tools'
import { startConsole, type ConsoleServer } from '../../src/console/server'

const OWNER = '@backend'
const MINE = 'docs/reference/refund-flow.md'
const HOUR = 60 * 60 * 1000
/** What the loop writes, when it runs. Pure documentation writes none of it. */
const LOOP_STATE = ['.dep-trace.jsonl', '.dep-usage.json', '.pulse', '.leases', 'inbox', '.dep-proposals']

After(async function (this: DepWorld) {
  const server = this.notes.get('pureConsole') as ConsoleServer | undefined
  if (server) await server.stop()
})

// ── the project ─────────────────────────────────────────────────────────

Given('a project that says nothing about the loop', function (this: DepWorld) {
  this.loop = null
  this.seedDefaultDocs()
})

Given('a project whose configuration turns the loop on', function (this: DepWorld) {
  this.loop = { enabled: true }
  if (this.docs.size === 0) this.seedDefaultDocs()
})

Given('a project whose configuration turns the loop on, but not recording', function (this: DepWorld) {
  this.loop = { enabled: true, trace: false }
  this.seedDefaultDocs()
})

Given('a project whose configuration lets owners act, but not with a model', function (this: DepWorld) {
  this.loop = { enabled: true, heartbeat: { act: 'rules' } }
  this.seedDefaultDocs()
})

Given('a project whose configuration lets a model act, at most twice a day', function (this: DepWorld) {
  this.loop = { enabled: true, heartbeat: { act: 'model' }, models: { enabled: true, max_requests_per_day: 2 } }
  this.now = new Date(Date.UTC(2026, 9, 8, 12))
  this.seedDefaultDocs()
})

Given('a project whose loop configuration says owners act {string}', function (this: DepWorld, act: string) {
  this.loop = { enabled: true, heartbeat: { act } }
  this.seedDefaultDocs()
})

Given('the environment says the loop is off', function (this: DepWorld) {
  this.env = { DEP_LOOP: 'off' }
})

Given('a document waiting on someone past its follow-up time', function (this: DepWorld) {
  this.addDoc({
    path: MINE, type: 'reference', owner: OWNER, title: 'Refund flow', body: freshnessBody('Refunds are issued within a day.'),
    heart: { status: 'waiting', waiting_on: '@qa', asked_at: new Date(this.now.getTime() - 5 * HOUR).toISOString(), follow_up_after: '4h', follow_ups: 0, max_follow_ups: 3 },
  })
})

// ── asking ──────────────────────────────────────────────────────────────

When('I ask the documentation set a question, search it and validate it', async function (this: DepWorld) {
  await this.materialise()
  await this.set!.context(DEFAULT_QUESTION, {})
  await this.set!.search(DEFAULT_QUESTION, {})
  this.set!.validate()
})

When('I ask the documentation set a question', async function (this: DepWorld) {
  await this.materialise()
  await this.set!.context(DEFAULT_QUESTION, {})
})

Then('nothing has been written beside the documents', function (this: DepWorld) {
  const written = LOOP_STATE.filter((f) => existsSync(join(this.root, f)))
  assert.deepEqual(written, [], `the loop wrote ${written.join(', ')}`)
})

Then('the document passes validation', function (this: DepWorld) {
  const report = this.result as { documents: Array<{ path: string; status: string; checks: Array<{ passed: boolean; message?: string }> }> }
  const doc = report.documents.find((d) => d.path === MINE)!
  assert.notEqual(doc.status, 'FAIL', JSON.stringify(doc.checks.filter((c) => !c.passed)))
})

Then('no owner can be woken', function (this: DepWorld) {
  assert.throws(() => this.set!.heartbeat(), /heartbeat is not available/)
})

When("I ask for an owner's heartbeat", async function (this: DepWorld) {
  await this.materialise()
  try { this.set!.heartbeat() } catch (err) { this.error = err }
})

When('something proposes a new version of a document', async function (this: DepWorld) {
  await this.materialise()
  try { this.set!.propose('docs/reference/lifecycle-states.md', '# new\n', { from: 'loop' }) } catch (err) { this.error = err }
})

Then('I am told the loop is off and which setting turns it on', function (this: DepWorld) {
  assert.match(this.errorMessage(), /not available: the loop is off in \.docspec \(set loop\.enabled: true\)/)
})

// ── usage ───────────────────────────────────────────────────────────────

Given('a question I asked earlier', async function (this: DepWorld) {
  await this.materialise()
  this.bundle = await this.set!.context(DEFAULT_QUESTION, {})
  assert.ok((this.bundle as Bundle).passages.length > 0, 'the question found nothing to report on')
})

Then('the report is not recorded, and I am told why', function (this: DepWorld) {
  const receipt = this.result as UsageReceipt
  assert.equal(receipt.recorded, false)
  assert.match(receipt.reason ?? '', /loop is off/)
})

Then('the report is recorded', function (this: DepWorld) {
  assert.equal((this.result as UsageReceipt).recorded, true)
})

Then('an agent connected over MCP is not offered usage reports', function (this: DepWorld) {
  const names = depTools(this.root).map((t) => t.name)
  assert.ok(names.includes('dep_context'), 'the MCP tools are missing altogether')
  assert.ok(!names.includes('dep_report_usage'), 'usage reports are offered')
})

Then('no request was recorded', function (this: DepWorld) {
  assert.equal(existsSync(join(this.root, '.dep-trace.jsonl')), false)
})

Then('the request is recorded', function (this: DepWorld) {
  assert.ok(this.set!.traceReport().entries.length > 0, 'nothing was recorded')
})

// ── the console ─────────────────────────────────────────────────────────

Then('the console offers no review', async function (this: DepWorld) {
  const server = await startConsole(this.root, { port: 0 })
  this.notes.set('pureConsole', server)
  const loop = await (await fetch(new URL('/api/loop', server.url))).json() as { proposals: string }
  assert.equal(loop.proposals, 'off')
  assert.equal((await fetch(new URL('/api/proposals', server.url))).status, 404)
})

// ── the heartbeat, part by part ─────────────────────────────────────────

function counting(world: DepWorld, runner: Runner): Runner {
  world.notes.set('asked', 0)
  return {
    kind: runner.kind,
    act: (w) => { world.notes.set('asked', (world.notes.get('asked') as number) + 1); return runner.act(w) },
  }
}

Given('someone has supplied a way to act', function (this: DepWorld) {
  this.notes.set('supplied', counting(this, new MockRunner()))
})

Given('a model has been supplied to act', function (this: DepWorld) {
  // a stand-in for the model: it decides to wait, so the loop stays due
  this.notes.set('supplied', counting(this, new ClaudeRunner({ ask: async () => [{ type: 'noop', reason: 'not yet' }] })))
})

async function beat(world: DepWorld, runner?: Runner): Promise<BeatResult> {
  await world.materialise()
  const hb: Heartbeat = world.set!.heartbeat({ runner: runner ?? world.notes.get('supplied') as Runner })
  const r = await hb.beatAsync(OWNER)
  world.result = r
  return r
}

When("the owner's heart beats", async function (this: DepWorld) {
  await beat(this)
})

When('an owner with something to do beats three times in a day', async function (this: DepWorld) {
  this.addDoc({
    path: MINE, type: 'reference', owner: OWNER, title: 'Refund flow', body: freshnessBody('Refunds are issued within a day.'),
    heart: { status: 'waiting', waiting_on: '@qa', asked_at: new Date(this.now.getTime() - 5 * HOUR).toISOString(), follow_up_after: '4h', follow_ups: 0, max_follow_ups: 3 },
  })
  const results: BeatResult[] = []
  for (let i = 0; i < 3; i++) {
    results.push(await beat(this))
    this.now = new Date(this.now.getTime() + 60_000)
  }
  this.notes.set('beats', results)
})

Then('the owner is woken', function (this: DepWorld) {
  assert.equal((this.result as BeatResult).woke, true)
})

Then('nothing was asked to act, and the beat says why', function (this: DepWorld) {
  assert.equal(this.notes.get('asked'), 0)
  assert.match((this.result as BeatResult).error ?? '', /loop\.heartbeat\.act is off/)
})

Then('the model was not asked, and the beat says why', function (this: DepWorld) {
  assert.equal(this.notes.get('asked'), 0)
  assert.match((this.result as BeatResult).error ?? '', /act by rule here, not by model/)
})

Then('with the rules supplied instead, the owner follows up', async function (this: DepWorld) {
  this.now = new Date(this.now.getTime() + 60_000)
  const r = await beat(this, new MockRunner())
  assert.ok(r.actions.some((a) => (a.action as { type: string }).type === 'ask' && a.outcome === 'done'), JSON.stringify(r))
})

Then('the model was asked twice', function (this: DepWorld) {
  assert.equal(this.notes.get('asked'), 2)
})

Then("the third beat says the day's model budget is used", function (this: DepWorld) {
  const third = (this.notes.get('beats') as BeatResult[])[2]!
  assert.match(third.error ?? '', /day's model budget is used \(2 of loop\.models\.max_requests_per_day: 2\)/)
})

// ── seeing what runs ────────────────────────────────────────────────────

When('I ask which parts of the loop are running', async function (this: DepWorld) {
  await this.materialise()
  this.result = loopReport(this.set!.loop)
})

const part = (world: DepWorld, name: string) => {
  const row = (world.result as ReturnType<typeof loopReport>).find((r) => r.part === name)
  assert.ok(row, `${name} is not reported`)
  return row!
}

Then('I am told recording is off because the configuration says so', function (this: DepWorld) {
  assert.deepEqual(part(this, 'recording requests'), { part: 'recording requests', state: 'off', why: 'set in .docspec' })
})

Then('I am told the heartbeat is on, but acts on nothing', function (this: DepWorld) {
  assert.equal(part(this, 'heartbeat').state, 'on, acts on nothing')
})

Then('I am told models are off by default', function (this: DepWorld) {
  assert.deepEqual(part(this, 'models'), { part: 'models', state: 'off', why: 'by default' })
})

// ── validation ──────────────────────────────────────────────────────────

Then('the configuration fails validation', function (this: DepWorld) {
  const report = this.result as { graph: Array<{ name: string; passed: boolean }> }
  const check = report.graph.find((c) => c.name === 'Loop configuration valid')
  assert.ok(check, 'the loop configuration was not checked')
  assert.equal(check!.passed, false)
})

Then('I am told what is wrong with it', function (this: DepWorld) {
  const report = this.result as { graph: Array<{ name: string; message?: string }> }
  assert.match(report.graph.find((c) => c.name === 'Loop configuration valid')!.message ?? '', /loop\.heartbeat\.act is "sometimes", not one of off, rules, model/)
})

Given('a project whose configuration lets owners act by model, but turns models off', function (this: DepWorld) {
  this.loop = { enabled: true, heartbeat: { act: 'model' }, models: { enabled: false } }
  this.seedDefaultDocs()
})

Then('the model was not asked, because no model may be asked here', function (this: DepWorld) {
  assert.equal(this.notes.get('asked'), 0)
  assert.match((this.result as BeatResult).error ?? '', /no model may be asked in this project \(loop\.models\.enabled is not true\)/)
})
