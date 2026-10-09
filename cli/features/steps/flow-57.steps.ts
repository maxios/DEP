import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { join } from 'path'
import { DepWorld, freshnessBody } from '../support/world'
import { inbox, type BeatResult, type Message, type Runner } from '../../src/lib'
import { readDepFile } from '../../src/writer'
import { acting } from './flow-56.steps'

const ME = '@backend'
const TESTER = '@qa'
const MINE = 'docs/reference/refund-flow.md'
const ROLE = 'docs/reference/backend-role.md'
const HOUR = 60 * 60 * 1000

const person = (world: DepWorld, at: Date = world.now) => inbox(world.root, 'user', { now: at })
const heartOf = (world: DepWorld) => readDepFile(join(world.root, MINE)).dep.heart as Record<string, unknown>

function role(world: DepWorld, agent: Record<string, unknown>) {
  if (world.docs.size === 0) world.seedDefaultDocs()
  world.addDoc({ path: ROLE, type: 'reference', owner: ME, title: 'Backend role', body: freshnessBody('The backend owner implements the refund flow.'), agent })
}

Given('a document of mine waiting past its follow-up time, already followed up as often as it allows', function (this: DepWorld) {
  if (this.docs.size === 0) this.seedDefaultDocs()
  this.addDoc({
    path: MINE, type: 'reference', owner: ME, title: 'Refund flow', body: freshnessBody('Refunds are issued within a day.'),
    heart: { status: 'waiting', waiting_on: TESTER, asked_at: new Date(this.now.getTime() - 5 * HOUR).toISOString(), follow_up_after: '4h', follow_ups: 3, max_follow_ups: 3 },
  })
})

Then('I am told the loop needs me, and which document it is', function (this: DepWorld) {
  const told = person(this).filter((m) => m.kind === 'escalation' && m.from === ME && m.re === MINE)
  assert.equal(told.length, 1, JSON.stringify((this.result as BeatResult).actions))
})

Then('the document says it is escalated', function (this: DepWorld) {
  assert.equal(heartOf(this).status, 'escalated')
})

Given('my heart has beaten and escalated it', async function (this: DepWorld) {
  const r = (await acting(this)).beat(ME)
  assert.ok(r.actions.some((a) => a.became === 'escalate'), JSON.stringify(r.actions))
})

When('my heart beats again an hour later', async function (this: DepWorld) {
  this.now = new Date(this.now.getTime() + HOUR)
  this.result = (await acting(this)).beat(ME)
})

// ── owners talking among themselves ─────────────────────────────────────

Given('one owner has asked another a question', async function (this: DepWorld) {
  this.notes.set('opening', (await acting(this)).say(ME, TESTER, 'Do the refund tests cover partial refunds?'))
})

When('both answer whatever they are sent, beat after beat', async function (this: DepWorld) {
  const hb = await acting(this)
  for (let round = 0; round < 8; round++) {
    for (const owner of [TESTER, ME]) {
      this.now = new Date(this.now.getTime() + 60_000)
      hb.beat(owner)
    }
  }
})

Then('the exchange stops after the limit of messages between them', async function (this: DepWorld) {
  const opening = this.notes.get('opening') as Message
  const between = [...inbox(this.root, ME), ...inbox(this.root, TESTER)].filter((m) => m.thread === opening.thread)
  const limit = (await acting(this)).config.MAX_HOPS
  assert.equal(between.length, limit - 1, `${between.length} messages between them: ${between.map((m) => m.hops).join(', ')}`)
})

Then('I am told the exchange needs me', function (this: DepWorld) {
  const opening = this.notes.get('opening') as Message
  assert.equal(person(this).filter((m) => m.kind === 'escalation' && m.thread === opening.thread).length, 1)
})

// ── roles ───────────────────────────────────────────────────────────────

Given('my role says I may ask only the testers', function (this: DepWorld) {
  role(this, { can_ask: [TESTER] })
})

Given('my role says I may ask no one', function (this: DepWorld) {
  role(this, { can_ask: [] })
})

Given('I would ask the finance owner about it', function (this: DepWorld) {
  this.notes.set('runner', { act: () => [{ type: 'ask', to: '@finance', re: (this.notes.get('letter') as Message).id, body: 'Are partial refunds allowed?' }] } satisfies Runner)
})

Then('I am told whom my role allows me to ask', function (this: DepWorld) {
  assert.match((this.result as BeatResult).actions[0]!.reason ?? '', /allows asking only @qa/)
})

Given('a role that may ask {string}', function (this: DepWorld, who: string) {
  role(this, { can_ask: who })
})

Then('the role document fails validation', function (this: DepWorld) {
  const report = this.result as { documents: Array<{ path: string; status: string }> }
  assert.equal(report.documents.find((d) => d.path === ROLE)?.status, 'FAIL')
})

Then('I am told what is wrong with the role', function (this: DepWorld) {
  const report = this.result as { documents: Array<{ path: string; checks: Array<{ passed: boolean; message?: string }> }> }
  const failed = report.documents.find((d) => d.path === ROLE)!.checks.filter((c) => !c.passed).map((c) => c.message).join(' | ')
  assert.match(failed, /can_ask "everyone"/, failed)
})

// ── quiet hours ─────────────────────────────────────────────────────────

Given('my quiet hours are from {int}:00 to {int}:00', function (this: DepWorld, from: number, to: number) {
  const hh = (n: number) => String(n).padStart(2, '0')
  this.heartbeat = { quiet_hours: `${hh(from)}:00-${hh(to)}:00` }
})

Given('it is {int}:00', function (this: DepWorld, hour: number) {
  this.now = new Date(Date.UTC(2026, 9, 8, hour))
})

Then('nothing has reached me yet', function (this: DepWorld) {
  assert.deepEqual(person(this), [])
  assert.equal(inbox(this.root, 'user').length, 1, 'nothing was brought to the person at all')
})

Then('it reaches me at {int}:00', function (this: DepWorld, hour: number) {
  const morning = new Date(Date.UTC(2026, 9, 9, hour))
  assert.equal(person(this, new Date(morning.getTime() - 60_000)).length, 0, 'it arrived before the quiet hours ended')
  assert.equal(person(this, morning).length, 1)
})

Given('I would bring it to the person as urgent', function (this: DepWorld) {
  this.notes.set('runner', { act: () => [{ type: 'escalate', re: (this.notes.get('letter') as Message).id, reason: 'Production refunds are failing.', urgent: true }] } satisfies Runner)
})

Then('it has reached me already', function (this: DepWorld) {
  const told = person(this)
  assert.equal(told.length, 1)
  assert.equal(told[0]!.urgent, true)
})
