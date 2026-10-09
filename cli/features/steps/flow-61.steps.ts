import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { join } from 'path'
import type { DepWorld } from '../support/world'
import { REWARDS, askSituation, type ClaudeRunner } from '../../src/lib'
import { readDepFile, writeDepFile } from '../../src/writer'
import { Store, learnFromOutcomes, followUpAdvisor, type MemoryEntry, type ScoredAsk } from '../../../packages/loop/src/index'
import { acting } from './flow-56.steps'

const ME = '@backend'
const TESTER = '@qa'
const MINE = 'docs/reference/refund-flow.md'
const HOUR = 60 * 60 * 1000

/**
 * What the agent learned from earlier follow-ups with someone, in the situation
 * the refund flow is in now: half of them answered, half not, none advised —
 * so following up there is worth something, but is not yet a sure thing.
 */
function learned(world: DepWorld, to: string) {
  const situation = askSituation({ to, type: 'reference', followUps: 0, at: world.now, timeZone: 'UTC' })
  const scored: ScoredAsk[] = Array.from({ length: 6 }, (_, i) => ({
    id: `earlier-${to}-${i}`, action: 'follow-up', situation, reward: i % 2 === 0 ? REWARDS.answered : REWARDS.unanswered,
  }))
  const store = new Store()
  learnFromOutcomes(store, scored)
  const advice = store.active().find((e) => e.claim === 'choose follow-up')
  assert.ok(advice, 'nothing was learned to advise with')
  world.notes.set('followStore', store)
  world.notes.set('advisor', followUpAdvisor(store))
  world.notes.set('advice', { ...advice })
}

Given('the agent has learned that following up with the testers gets answered', function (this: DepWorld) {
  learned(this, TESTER)
})

Given('the agent has learned that following up with legal gets answered', function (this: DepWorld) {
  learned(this, '@legal')
})

When('I follow it up as advised and the testers answer in time', async function (this: DepWorld) {
  const hb = await acting(this)
  hb.beat(ME)
  this.now = new Date(this.now.getTime() + HOUR)
  hb.say(TESTER, ME, 'Partial refunds are covered.', MINE)
  this.now = new Date(this.now.getTime() + 60_000)
  hb.beat(ME)
  assert.equal(hb.outcomes().length, 1)
})

When('I follow it up as advised and it goes unanswered until it comes to the person', async function (this: DepWorld) {
  const hb = await acting(this)
  hb.beat(ME)
  this.now = new Date(this.now.getTime() + 5 * HOUR)
  const file = join(this.root, MINE)
  const data = readDepFile(file)
  data.dep.heart = { ...data.dep.heart, follow_ups: 3 }
  writeDepFile(file, data)
  hb.beat(ME)
  assert.equal(hb.outcomes()[0]?.kind, 'unanswered')
})

const strength = (world: DepWorld) => {
  const before = world.notes.get('advice') as MemoryEntry
  const after = (world.notes.get('learned') as Store).entries.get(before.id)!
  return { before: before.strength, after: after.strength }
}

Then('the advice is held more strongly than before', function (this: DepWorld) {
  const { before, after } = strength(this)
  assert.ok(after > before, `${before} → ${after}`)
})

Then('the advice is held less strongly than before', function (this: DepWorld) {
  const { before, after } = strength(this)
  assert.ok(after < before, `${before} → ${after}`)
})

const shown = (world: DepWorld) => {
  const p = (world.notes.get('claudeRunner') as ClaudeRunner).shown.at(-1)
  assert.ok(p, 'the model was never asked')
  return p!.user
}

Then('the model was shown that advice for the document', function (this: DepWorld) {
  assert.match(shown(this), new RegExp(`Learned from earlier follow-ups like ${MINE.replace(/\./g, '\\.')}:\\n1\\. choose follow-up`))
})

Then('the model was shown no advice for the document', function (this: DepWorld) {
  assert.doesNotMatch(shown(this), /Learned from earlier follow-ups/)
})

Then('nothing the model was shown carries the strength the advice is held at', function (this: DepWorld) {
  const s = (this.notes.get('advice') as MemoryEntry).strength
  for (const places of [1, 2, 3, 4]) assert.ok(!shown(this).includes(s.toFixed(places)) || s.toFixed(places) === '0.0', `the strength ${s} was shown`)
  assert.doesNotMatch(shown(this), /strength/i)
})
