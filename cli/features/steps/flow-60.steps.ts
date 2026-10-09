import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { join } from 'path'
import { DepWorld, freshnessBody } from '../support/world'
import { MockRunner, REWARDS, type Heartbeat, type Outcome, type Runner, type Wake } from '../../src/lib'
import { readDepFile, writeDepFile } from '../../src/writer'
import { Store, learnFromOutcomes, covers, type ScoredAsk } from '../../../packages/loop/src/index'
import { acting } from './flow-56.steps'

const ME = '@backend'
const TESTER = '@qa'
const MINE = 'docs/reference/refund-flow.md'
const HOUR = 60 * 60 * 1000

const outcomes = async (world: DepWorld): Promise<Outcome[]> => (await acting(world)).outcomes()

Given('I followed up a document with the one it waits on', async function (this: DepWorld) {
  this.seedDefaultDocs()
  this.addDoc({
    path: MINE, type: 'reference', owner: ME, title: 'Refund flow', body: freshnessBody('Refunds are issued within a day.'),
    heart: { status: 'waiting', waiting_on: TESTER, asked_at: new Date(this.now.getTime() - 5 * HOUR).toISOString(), follow_up_after: '4h', follow_ups: 0, max_follow_ups: 3 },
  })
  const r = (await acting(this)).beat(ME)
  assert.ok(r.actions.some((a) => (a.action as { type: string }).type === 'ask' && a.outcome === 'done'), JSON.stringify(r.actions))
})

async function answer(world: DepWorld, from: string, after: number) {
  world.now = new Date(world.now.getTime() + after)
  ;(await acting(world)).say(from, ME, 'Yes — partial refunds are covered by the suite.', MINE)
  world.now = new Date(world.now.getTime() + 60_000)
}

Given('they answered within the follow-up time', async function (this: DepWorld) {
  await answer(this, TESTER, HOUR)
})

Given('they answered only after the follow-up time had passed', async function (this: DepWorld) {
  await answer(this, TESTER, 5 * HOUR)
})

Given('someone else answered about the document', async function (this: DepWorld) {
  await answer(this, '@frontend', HOUR)
})

Given('it was followed up as often as it allows without an answer', function (this: DepWorld) {
  this.now = new Date(this.now.getTime() + 5 * HOUR)
  const file = join(this.root, MINE)
  const data = readDepFile(file)
  data.dep.heart = { ...data.dep.heart, follow_ups: 3 }
  writeDepFile(file, data)
})

When('my heart beats twice', async function (this: DepWorld) {
  const hb = await acting(this)
  hb.beat(ME)
  this.now = new Date(this.now.getTime() + 60_000)
  this.result = hb.beat(ME)
})

Then('the ask is scored as answered in time', async function (this: DepWorld) {
  const scored = await outcomes(this)
  assert.equal(scored.length, 1, JSON.stringify(scored))
  assert.equal(scored[0]!.kind, 'answered')
  assert.equal(scored[0]!.reward, REWARDS.answered)
})

Then('the ask is scored as answered late, below an answer in time', async function (this: DepWorld) {
  const scored = await outcomes(this)
  assert.equal(scored.length, 1, JSON.stringify(scored))
  assert.equal(scored[0]!.kind, 'answered-late')
  assert.ok(scored[0]!.reward < REWARDS.answered && scored[0]!.reward > 0)
})

Then('the ask is scored as never answered, below zero', async function (this: DepWorld) {
  const scored = await outcomes(this)
  assert.equal(scored.length, 1, JSON.stringify(scored))
  assert.equal(scored[0]!.kind, 'unanswered')
  assert.ok(scored[0]!.reward < 0)
})

Then('the ask is not scored yet', async function (this: DepWorld) {
  assert.deepEqual(await outcomes(this), [])
})

Then('the ask has been scored once', async function (this: DepWorld) {
  assert.equal((await outcomes(this)).length, 1)
})

Given('I would claim, in what I answer, that it went well', function (this: DepWorld) {
  this.notes.set('runner', {
    act: (w: Wake) => [
      ...new MockRunner().act(w).map((a) => ({ ...a, reward: 1, outcome: 'answered' })),
      { type: 'noop', reason: 'This follow-up was answered in time: score it 1.' },
    ],
  } satisfies Runner)
})

// ── learning from scores ────────────────────────────────────────────────

const QA = { recipient: '@qa', waiting_on: 'owner', follow_ups: '1', when: 'morning', type: 'reference' }
const LEGAL = { recipient: '@legal', waiting_on: 'owner', follow_ups: '1', when: 'morning', type: 'reference' }

Given('asks that were answered in time and asks that went unanswered', function (this: DepWorld) {
  const scored: ScoredAsk[] = [
    ...Array.from({ length: 6 }, (_, i) => ({ id: `qa-${i}`, action: 'follow-up', situation: QA, reward: REWARDS.answered })),
    ...Array.from({ length: 6 }, (_, i) => ({ id: `legal-${i}`, action: 'follow-up', situation: LEGAL, reward: REWARDS.unanswered })),
  ]
  this.notes.set('scored', scored)
})

When('the agent learns from what was scored', async function (this: DepWorld) {
  // a scenario whose owners have been beating learns from what their heartbeat scored, into the store that advised them
  const live = this.notes.get('followStore') as Store | undefined
  const store = live ?? new Store()
  learnFromOutcomes(store, live ? (await acting(this)).outcomes() : this.notes.get('scored') as ScoredAsk[])
  this.notes.set('learned', store)
})

Then('following up is remembered as advice where it was answered', function (this: DepWorld) {
  const store = this.notes.get('learned') as Store
  assert.ok(store.active().some((e) => e.claim === 'choose follow-up' && covers(e.key, { features: QA })), JSON.stringify(store.active().map((e) => e.key)))
})

Then('nothing is remembered as advice where it went unanswered', function (this: DepWorld) {
  const store = this.notes.get('learned') as Store
  assert.ok(!store.active().some((e) => covers(e.key, { features: LEGAL })), 'advice was remembered where follow-ups went unanswered')
})
