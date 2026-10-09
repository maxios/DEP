import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { DepWorld, freshnessBody } from '../support/world'
import { MockRunner, inbox, type Advisor, type BeatResult, type Heartbeat, type Message, type Runner, type Wake } from '../../src/lib'
import { readDepFile } from '../../src/writer'

const ME = '@backend'
const ASKER = '@pm'
const SOMEONE = '@qa'
const MINE = 'docs/reference/refund-flow.md'

/** The heartbeat, acting through whatever runner the scenario set — the rules, unless it said otherwise. */
export async function acting(world: DepWorld): Promise<Heartbeat> {
  await world.materialise()
  const existing = world.notes.get('heartbeat') as Heartbeat | undefined
  if (existing) return existing
  world.notes.set('runs', 0)
  const runner: Runner = {
    act: (wake: Wake) => {
      world.notes.set('runs', (world.notes.get('runs') as number) + 1)
      return ((world.notes.get('runner') as Runner | undefined) ?? new MockRunner()).act(wake)
    },
  }
  const hb = world.set!.heartbeat({ runner, advisor: world.notes.get('advisor') as Advisor | undefined })
  world.notes.set('heartbeat', hb)
  return hb
}

const result = (world: DepWorld) => world.result as BeatResult
const heartOf = (world: DepWorld, path = MINE) => readDepFile(join(world.root, path)).dep.heart as Record<string, unknown>
const isoOf = (v: unknown) => new Date(v as string).toISOString()

Given('someone wrote to me', async function (this: DepWorld) {
  this.notes.set('letter', (await acting(this)).say(ASKER, ME, 'Can refunds be partial?'))
})

Given('a document of mine that is open work', function (this: DepWorld) {
  this.seedDefaultDocs()
  this.addDoc({ path: MINE, type: 'reference', owner: ME, title: 'Refund flow', body: freshnessBody('Refunds are issued within a day.'), heart: { status: 'open' } })
})

When('my heart beats and I act on what I am told', async function (this: DepWorld) {
  this.result = (await acting(this)).beat(ME)
})

// ── answering ───────────────────────────────────────────────────────────

Then('a reply to them is waiting in their inbox', function (this: DepWorld) {
  const letter = this.notes.get('letter') as Message
  const answers = inbox(this.root, ASKER).filter((m) => m.kind === 'answer' && m.from === ME && m.re === letter.id)
  assert.equal(answers.length, 1, JSON.stringify(result(this).actions))
})

Then('their message to me is marked read', function (this: DepWorld) {
  const letter = this.notes.get('letter') as Message
  assert.equal(inbox(this.root, ME).find((m) => m.id === letter.id)?.read, true)
})

Then('my next beat is not woken by it', async function (this: DepWorld) {
  this.now = new Date(this.now.getTime() + 60_000)
  const next = (await acting(this)).beat(ME)
  assert.ok(!next.signals.some((s) => s.kind === 'message'), JSON.stringify(next.signals))
})

// ── following up ────────────────────────────────────────────────────────

Then('the one it waits on is asked again about the document', function (this: DepWorld) {
  const asked = inbox(this.root, SOMEONE).filter((m) => m.from === ME && m.re === MINE)
  assert.equal(asked.length, 1, JSON.stringify(result(this)))
})

Then('the document says it has been followed up once more, from now', function (this: DepWorld) {
  const heart = heartOf(this)
  assert.equal(heart.follow_ups, 1)
  assert.equal(isoOf(heart.asked_at), this.now.toISOString())
})

Then('the document is active', function (this: DepWorld) {
  assert.equal(heartOf(this).status, 'active')
})

// ── leases ──────────────────────────────────────────────────────────────

Given('another beat holds the document', async function (this: DepWorld) {
  assert.ok((await acting(this)).hold(MINE, '@frontend', '@frontend:elsewhere'))
})

Given('another beat held the document but its hold has run out', async function (this: DepWorld) {
  assert.ok((await acting(this)).hold(MINE, '@frontend', '@frontend:elsewhere', 60_000))
  this.now = new Date(this.now.getTime() + 2 * 60_000)
})

Then('nothing is done to the document', function (this: DepWorld) {
  assert.ok(result(this).held.some((s) => s.document === MINE), 'the document was not left to the other beat')
  assert.equal(heartOf(this).follow_ups, 0)
  assert.equal(heartOf(this).acted, undefined)
})

Then('no one is asked again', function (this: DepWorld) {
  assert.deepEqual(inbox(this.root, SOMEONE), [])
})

// ── doing it once ───────────────────────────────────────────────────────

Given('my beat stopped after sending the follow-up but before the document recorded it', async function (this: DepWorld) {
  const hb = await acting(this)
  assert.throws(() => hb.beat(ME, { stopAfter: 1 }), /stopped after 1/)
  assert.equal(inbox(this.root, SOMEONE).length, 1, 'the follow-up was not sent before the beat stopped')
  assert.equal(heartOf(this).follow_ups, 0, 'the document recorded the follow-up before the beat stopped')
})

When('the same beat is run again', async function (this: DepWorld) {
  this.result = (await acting(this)).beat(ME)
})

Then('each action has been done exactly once', function (this: DepWorld) {
  assert.equal(inbox(this.root, SOMEONE).filter((m) => m.re === MINE).length, 1, 'the follow-up was sent twice, or never')
  assert.equal(heartOf(this).follow_ups, 1, 'the follow-up was counted twice, or never')
})

// ── refusals ────────────────────────────────────────────────────────────

Given('I would act on it if I could', async function (this: DepWorld) {
  this.notes.set('runner', { act: () => [{ type: 'set_status', document: MINE, status: 'done' }] } satisfies Runner)
  this.notes.set('letter', (await acting(this)).say(ASKER, ME, 'Is the refund flow done?'))
})

Given('I would answer with an action of my own invention', function (this: DepWorld) {
  this.notes.set('runner', { act: () => [{ type: 'erase', document: MINE, status: 'done' }] } satisfies Runner)
})

Then('the action is refused and recorded as refused', async function (this: DepWorld) {
  assert.equal(result(this).actions.length, 1)
  assert.equal(result(this).actions[0]!.outcome, 'refused')
  assert.ok(result(this).actions[0]!.reason, 'no reason given')
  const recorded = (await acting(this)).record().beats.at(-1)!
  assert.equal(recorded.actions[0]!.outcome, 'refused')
})

Then('the document is unchanged', function (this: DepWorld) {
  assert.equal(heartOf(this).status, 'waiting')
  assert.equal(heartOf(this).acted, undefined)
})

Then('nothing is written', function (this: DepWorld) {
  const inboxes = existsSync(join(this.root, 'inbox')) ? readdirSync(join(this.root, 'inbox')) : []
  assert.ok(inboxes.every((b) => b === 'backend'), `written to: ${inboxes.join(', ')}`)
  assert.equal(inbox(this.root, ME).every((m) => !m.read), true, 'a message was marked read')
  const heart = existsSync(join(this.root, MINE)) ? heartOf(this) : undefined
  assert.equal(heart?.acted, undefined, 'a document was changed')
})

Then('nothing was asked to act', function (this: DepWorld) {
  assert.equal(this.notes.get('runs'), 0)
})

Given('I would ask for every follow-up twice', function (this: DepWorld) {
  this.notes.set('runner', { act: (w: Wake) => { const once = new MockRunner().act(w); return [...once, ...once] } } satisfies Runner)
})

Then('I am told I do not own the document', function (this: DepWorld) {
  assert.match(result(this).actions[0]!.reason ?? '', /does not own/)
})
