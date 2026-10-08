import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { DepWorld } from '../support/world'
import {
  Store, write, read, loadCore, entryId, covers, featureSimilarity, configWith,
  type EntryKind, type MemoryEntry, type SituationKey,
} from '../../../packages/loop/src/index'

const DAY = 3
const config = configWith()
const sim = featureSimilarity({ area: 1, kind: 1, size: 1, currency: 1, tier: 1 })
const BASE = { area: 'area-billing', kind: 'happy-path', size: 'small', currency: 'EUR', tier: 'gold' }
type Features = Record<string, string>

function store(world: DepWorld): Store {
  const existing = world.notes.get('store') as Store | undefined
  if (existing) return existing
  const s = new Store()
  world.notes.set('store', s)
  // the shared "the day ends" step reads these
  world.notes.set('similarity', sim)
  world.notes.set('today', DAY)
  return s
}

/** Put a claim in the store as if the days had already credited it. */
function hold(world: DepWorld, features: Features, claim: string, acted: number, passed: number, kind: EntryKind = 'episode'): MemoryEntry {
  const key: SituationKey = { features }
  const entry: MemoryEntry = {
    id: entryId(kind, key, claim), kind, key, claim, strength: 0.5, reads: acted, gains: passed, pains: acted - passed,
    createdDay: 0, lastReadDay: DAY, parents: [], distilled: false, archived: false,
  }
  store(world).apply({ type: 'episode', episodeId: `fixture-${entry.id}`, day: DAY, creates: [entry], sets: [], baselines: [] })
  return store(world).entries.get(entry.id)!
}

const rules = (world: DepWorld) => store(world).active().filter((e) => e.kind === 'rule')
const without = (f: Features, ...drop: string[]) => Object.fromEntries(Object.entries(f).filter(([k]) => !drop.includes(k)))

// ── the document ────────────────────────────────────────────────────────

Then('some of its advice does not mention the area at all', function (this: DepWorld) {
  const doc = (this.notes.get('text') as string).replace(/^---\n[\s\S]*?\n---\n/, '')
  const lines = doc.split('\n').filter((l) => l.startsWith('- '))
  assert.ok(lines.length > 0, doc)
  assert.ok(lines.some((l) => !l.includes('the area is')), `every line names the area:\n${lines.join('\n')}`)
})

// ── keeping alike claims ────────────────────────────────────────────────

Given('the agent holds advice about one situation', function (this: DepWorld) {
  hold(this, BASE, 'choose convert', 10, 9)
})

When('the same advice proves itself in a situation that differs in one detail', function (this: DepWorld) {
  const key = { features: { ...BASE, tier: 'silver' } }
  this.notes.set('alike', key)
  write(store(this), {
    episodeId: 'alike', day: DAY, traces: [], score: { reward: 1, pain: false, gain: true },
    proposals: [{ kind: 'episode', key, claim: 'choose convert' }],
  }, config, sim)
})

Then('both are kept until the end of the day', function (this: DepWorld) {
  const held = store(this).active().filter((e) => e.claim === 'choose convert')
  assert.equal(held.length, 2, `held ${held.map((e) => JSON.stringify(e.key.features)).join(', ')}`)
})

// ── growing a rule ──────────────────────────────────────────────────────

Given('the agent holds a rule and proven advice that differs from it in one more detail', function (this: DepWorld) {
  const rule = hold(this, without(BASE, 'area'), 'choose convert', 20, 18, 'rule')
  const advice = hold(this, { ...BASE, area: 'area-refunds', tier: 'silver' }, 'choose convert', 10, 9)
  this.notes.set('members', [rule, advice])
})

Then('the two become one rule that leaves out that detail too', function (this: DepWorld) {
  const held = rules(this)
  assert.equal(held.length, 1, `rules: ${held.map((r) => JSON.stringify(r.key.features)).join(', ')}`)
  assert.deepEqual(held[0]!.key.features, without(BASE, 'area', 'tier'))
  for (const m of this.notes.get('members') as MemoryEntry[]) assert.equal(store(this).entries.get(m.id)!.archived, true, `${m.id} was not folded in`)
})

// ── exceptions ──────────────────────────────────────────────────────────

Given('the agent holds alike advice that would fold into a rule', function (this: DepWorld) {
  const members = [hold(this, BASE, 'choose convert', 12, 11), hold(this, { ...BASE, tier: 'silver' }, 'choose convert', 8, 7)]
  this.notes.set('members', members)
})

Given('proven advice to do something else in a situation that rule would cover', function (this: DepWorld) {
  this.notes.set('exception', hold(this, { ...BASE, tier: 'platinum' }, 'choose refuse', 9, 8))
})

Then('no rule covers the exception', function (this: DepWorld) {
  const exception = this.notes.get('exception') as MemoryEntry
  const over = rules(this).filter((r) => covers(r.key, exception.key))
  assert.equal(over.length, 0, `covered by ${over.map((r) => `${r.claim} ${JSON.stringify(r.key.features)}`).join(', ')}`)
})

Then('the exception is still held', function (this: DepWorld) {
  const exception = this.notes.get('exception') as MemoryEntry
  assert.equal(store(this).entries.get(exception.id)!.archived, false)
})

// ── evidence ────────────────────────────────────────────────────────────

Given('the agent holds alike advice that has hardly been acted on', function (this: DepWorld) {
  hold(this, BASE, 'choose convert', 2, 2)
  hold(this, { ...BASE, tier: 'silver' }, 'choose convert', 2, 2)
})

Then('no rule is made from it', function (this: DepWorld) {
  assert.equal(rules(this).length, 0)
})

Then('the rule has been acted on as often as all of them together', function (this: DepWorld) {
  const members = this.notes.get('members') as MemoryEntry[]
  const [rule] = rules(this)
  assert.ok(rule, 'no rule was made')
  assert.equal(rule!.gains + rule!.pains, members.reduce((s, m) => s + m.gains + m.pains, 0))
})

Then('has passed as often as all of them together', function (this: DepWorld) {
  const members = this.notes.get('members') as MemoryEntry[]
  assert.equal(rules(this)[0]!.gains, members.reduce((s, m) => s + m.gains, 0))
})

// ── where a rule is given ───────────────────────────────────────────────

Given('the agent holds a rule about large requests from new customers', function (this: DepWorld) {
  this.notes.set('rule', hold(this, { size: 'large', tier: 'new' }, 'choose refuse', 12, 12, 'rule'))
})

When('it meets a large request from a gold customer', function (this: DepWorld) {
  this.notes.set('situation', { ...BASE, size: 'large', tier: 'gold' })
})

function given(world: DepWorld, features: Features): boolean {
  const rule = world.notes.get('rule') as MemoryEntry
  const core = loadCore()
  for (let seed = 1; seed <= 20; seed++) {
    if (read(store(world), { features }, core.Rng(seed), config, sim).entries.some((e) => e.id === rule.id)) return true
  }
  return false
}

Then('the rule is not given', function (this: DepWorld) {
  assert.equal(given(this, this.notes.get('situation') as Features), false, 'the rule was given where it does not hold')
})

Then('a large request from a new customer is given the rule', function (this: DepWorld) {
  assert.equal(given(this, { ...BASE, size: 'large', tier: 'new' }), true)
})
