import { Given, When, Then, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { DepWorld, freshnessBody } from '../support/world'
import { MockRunner, inbox, type HeartbeatOverview, type Runner, type Wake } from '../../src/lib'
import { startConsole, type ConsoleServer } from '../../src/console/server'
import { Store, entryId, learnedSummary, writeLearnedSummary, type LoadedGame, type MemoryEntry } from '../../../packages/loop/src/index'

const OWNER = '@backend'
const MINE = 'docs/reference/refund-flow.md'
const NOT_MINE = 'docs/reference/lifecycle-states.md'
const HOUR = 60 * 60 * 1000

After(async function (this: DepWorld) {
  const server = this.notes.get('loopConsole') as ConsoleServer | undefined
  if (server) await server.stop()
})

/** The console, started once the scenario's project is set up. */
async function console_(world: DepWorld): Promise<ConsoleServer> {
  const existing = world.notes.get('loopConsole') as ConsoleServer | undefined
  if (existing) return existing
  await world.materialise()
  const server = await startConsole(world.root, { port: 0 })
  world.notes.set('loopConsole', server)
  return server
}

async function get(world: DepWorld, path: string): Promise<{ status: number; body: any }> {
  const reply = await fetch(new URL(path, (await console_(world)).url))
  return { status: reply.status, body: await reply.json() }
}

function waiting(world: DepWorld, followUps = 0) {
  world.addDoc({
    path: MINE, type: 'reference', owner: OWNER, title: 'Refund flow', body: freshnessBody('Refunds are issued within a day.'),
    heart: { status: 'waiting', waiting_on: '@qa', asked_at: new Date(world.now.getTime() - 5 * HOUR).toISOString(), follow_up_after: '4h', follow_ups: followUps, max_follow_ups: 3 },
  })
}

async function beat(world: DepWorld, runner: Runner) {
  await world.materialise()
  return world.set!.heartbeat({ runner }).beat(OWNER)
}

Given('a project whose configuration lets owners act', function (this: DepWorld) {
  this.loop = { enabled: true, heartbeat: { act: 'rules' } }
  this.seedDefaultDocs()
})

Given('the project turns the heartbeat off', function (this: DepWorld) {
  this.loop = { enabled: true, heartbeat: { enabled: false } }
})

Given('an owner whose heart has beaten with a loop due', async function (this: DepWorld) {
  waiting(this)
  await beat(this, new MockRunner())
  // and an owner with nothing to do, whose beat wakes no one
  this.set!.heartbeat().beat('@frontend')
})

Given('an owner whose heart has beaten and was refused an action', async function (this: DepWorld) {
  waiting(this)
  await beat(this, { kind: 'rules', act: (w: Wake) => [...new MockRunner().act(w), { type: 'close_loop', document: NOT_MINE, note: 'tidying up' }] })
})

Given('a loop that has been brought to me', async function (this: DepWorld) {
  waiting(this, 3)
  await beat(this, new MockRunner())
})

Given('follow-ups that were answered in time, late and never', async function (this: DepWorld) {
  await this.materialise()
  mkdirSync(join(this.root, '.pulse'), { recursive: true })
  for (const kind of ['answered', 'answered-late', 'unanswered']) {
    appendFileSync(join(this.root, '.pulse', 'outcomes.jsonl'), JSON.stringify({ id: kind, agent: OWNER, to: '@qa', re: MINE, action: 'follow-up', situation: {}, kind, reward: 0, askedAt: this.now.toISOString(), at: this.now.toISOString() }) + '\n')
  }
})

When('I ask the console for the heartbeat', async function (this: DepWorld) {
  this.result = await get(this, '/api/heartbeat')
})

const overview = (world: DepWorld): HeartbeatOverview => {
  const r = world.result as { status: number; body: HeartbeatOverview }
  assert.equal(r.status, 200, JSON.stringify(r.body))
  return r.body
}

Then('I see each owner, when they last beat and when they beat next', function (this: DepWorld) {
  const owner = overview(this).owners.find((o) => o.owner === OWNER)
  assert.ok(owner?.lastBeat && owner.nextBeat, JSON.stringify(overview(this).owners))
})

Then('I see whether they were woken, and for what', function (this: DepWorld) {
  const owner = overview(this).owners.find((o) => o.owner === OWNER)!
  assert.equal(owner.woke, true)
  assert.ok(owner.signals.some((s) => s.kind === 'follow_up_due' && s.document === MINE))
})

Then('I see how many beats there were today and how many woke someone', function (this: DepWorld) {
  const { today } = overview(this)
  assert.equal(today.beats, 2)
  assert.equal(today.wakes, 1)
  assert.equal(today.wakeRatio, 0.5)
})

Then('I see the actions that were done and the one that was refused, with why', function (this: DepWorld) {
  const actions = overview(this).recent[0]!.actions
  assert.ok(actions.some((a) => a.outcome === 'done'), JSON.stringify(actions))
  const refused = actions.find((a) => a.outcome === 'refused')
  assert.match(refused?.reason ?? '', /does not own/)
})

Then('I see what is waiting for me', function (this: DepWorld) {
  const w = overview(this).waiting
  assert.equal(w.length, 1, JSON.stringify(w))
  assert.equal(w[0]!.re, MINE)
  this.notes.set('escalation', w[0]!.id)
})

async function reply(world: DepWorld, headers: Record<string, string> = {}) {
  const id = world.notes.get('escalation') as string ?? inbox(world.root, 'user')[0]!.id
  world.result = await fetch(new URL('/api/reply', (await console_(world)).url), {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ message: id, body: 'Ask legal instead — QA is on leave.' }),
  })
}

When('I reply to it from the console', async function (this: DepWorld) {
  await reply(this)
  assert.equal((this.result as Response).status, 200, await (this.result as Response).clone().text())
})

When('a page from another site tries to reply to it', async function (this: DepWorld) {
  await reply(this, { origin: 'https://docs.example.com' })
})

Then("my reply is in the owner's inbox, from me", function (this: DepWorld) {
  const mine = inbox(this.root, OWNER).filter((m) => m.from === 'user')
  assert.equal(mine.length, 1)
  assert.match(mine[0]!.body, /Ask legal instead/)
})

Then('it is no longer waiting for me', async function (this: DepWorld) {
  const { body } = await get(this, '/api/heartbeat')
  assert.deepEqual((body as HeartbeatOverview).waiting, [])
})

Then("nothing is in the owner's inbox from me", function (this: DepWorld) {
  assert.deepEqual(inbox(this.root, OWNER).filter((m) => m.from === 'user'), [])
})

Then('I see how many follow-ups were answered in time, late and never', function (this: DepWorld) {
  assert.deepEqual(overview(this).outcomes, { answered: 1, 'answered-late': 1, unanswered: 1 })
})

Then('the console says it does not serve it', function (this: DepWorld) {
  assert.equal((this.result as { status: number }).status, 404)
})

// ── what the agent learned ──────────────────────────────────────────────

const STRENGTH = 0.6731

Given('the loop has written a summary of what the agent learned', async function (this: DepWorld) {
  await this.materialise()
  const key = { features: { tier: 'gold' } }
  const rule: MemoryEntry = {
    id: entryId('rule', key, 'choose convert'), kind: 'rule', key, claim: 'choose convert', strength: STRENGTH,
    reads: 249, gains: 205, pains: 44, createdDay: 0, lastReadDay: 9, parents: [], distilled: false, archived: false,
  }
  const store = new Store()
  store.apply({ type: 'episode', episodeId: 'fixture', day: 9, creates: [rule], sets: [], baselines: [] })
  const game = { game: { id: 'game.requests', situation: { size: 'row:size', tier: 'row:tier' } } } as unknown as LoadedGame
  writeLearnedSummary(this.root, learnedSummary(store, game, [
    { label: 'no edit', passRates: [0.31, 0.49, 0.57] },
    { label: 'with your edit', passRates: [0.31, 0.49, 0.94] },
  ]))
})

When('I ask the console what the agent has learned', async function (this: DepWorld) {
  this.result = await get(this, '/api/learned')
})

Then('I see the pass rate by day, for each run', function (this: DepWorld) {
  const { body } = this.result as { body: { runs: Array<{ label: string; passRates: number[] }> } }
  assert.deepEqual(body.runs.map((r) => r.label), ['no edit', 'with your edit'])
  assert.equal(body.runs[1]!.passRates.at(-1), 0.94)
})

Then('I see the advice it relies on, with how often it was acted on and passed', function (this: DepWorld) {
  const { body } = this.result as { body: { advice: Array<{ situation: string; claim: string; acted: number; passed: number }> } }
  assert.deepEqual(body.advice[0], { situation: 'When the tier is gold', claim: 'choose convert', acted: 249, passed: 205 })
})

Then('nothing I see says how strongly a claim is held', function (this: DepWorld) {
  const text = JSON.stringify((this.result as { body: unknown }).body)
  assert.doesNotMatch(text, /strength|0\.67/)
})
