import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { DepWorld } from '../support/world'
import {
  Store, playDay, endDay, entryId, configWith, mazeKey, read, mazeSimilarity,
  type MemoryEntry, type SituationKey, type MazeCore,
} from '../../../packages/loop/src/index'

const TODAY = 10
const config = configWith()

function claim(key: SituationKey, advice: string, o: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: entryId('episode', key, advice), kind: 'episode', key, claim: advice,
    strength: 0.5, reads: 10, gains: 6, pains: 4, createdDay: 0, lastReadDay: TODAY,
    parents: [], distilled: false, archived: false, ...o,
  }
}

function seeded(entries: MemoryEntry[]): Store {
  const store = new Store()
  store.apply({ type: 'episode', episodeId: 'fixture', day: 0, creates: entries, sets: [], baselines: [] })
  return store
}

function remember(world: DepWorld, name: string, entry: MemoryEntry) {
  world.notes.set(name, entry.id)
  world.notes.set(`${name}:before`, { ...entry })
}

function held(world: DepWorld, name: string): MemoryEntry {
  return (world.notes.get('store') as Store).entries.get(world.notes.get(name) as string)!
}

// ── fading ──────────────────────────────────────────────────────────────

Given('the store holds a claim that was read today and one that was not', function (this: DepWorld) {
  const read = claim(mazeKey('N.S.:W'), 'go E', { lastReadDay: TODAY })
  const unread = claim(mazeKey('.E.W:N'), 'go S', { lastReadDay: TODAY - 3 })
  remember(this, 'read', read)
  remember(this, 'unread', unread)
  this.notes.set('store', seeded([read, unread]))
})

When('the day ends', function (this: DepWorld) {
  endDay(this.notes.get('store') as Store, TODAY, config, mazeSimilarity)
})

Then('the claim nobody read is held a little less strongly than before', function (this: DepWorld) {
  const before = (this.notes.get('unread:before') as MemoryEntry).strength
  const after = held(this, 'unread').strength
  assert.ok(after < before, `${after} is not below ${before}`)
  assert.ok(after > before * 0.9, `it faded too far in one day: ${before} → ${after}`)
})

Then('the claim that was read is held exactly as strongly as the day left it', function (this: DepWorld) {
  assert.equal(held(this, 'read').strength, (this.notes.get('read:before') as MemoryEntry).strength)
})

// ── putting away ────────────────────────────────────────────────────────

Given('a claim that has faded below use and is older than faded claims are kept', function (this: DepWorld) {
  const faded = claim(mazeKey('N...:S'), 'go E', { strength: 0.01, createdDay: TODAY - config.PRUNE_AGE - 1, lastReadDay: TODAY - 2 })
  remember(this, 'faded', faded)
  this.notes.set('store', seeded([faded]))
})

Given('a claim that has faded below use but is younger than faded claims are kept', function (this: DepWorld) {
  const faded = claim(mazeKey('N...:S'), 'go E', { strength: 0.01, createdDay: TODAY - 1, lastReadDay: TODAY - 1 })
  remember(this, 'faded', faded)
  this.notes.set('store', seeded([faded]))
})

Then('the player is no longer shown it', function (this: DepWorld) {
  const store = this.notes.get('store') as Store
  const entry = held(this, 'faded')
  assert.equal(entry.archived, true)
  assert.ok(!store.active().some((e) => e.id === entry.id))
  const core = this.notes.get('core') as MazeCore
  for (let seed = 0; seed < 20; seed++) {
    const shown = read(store, entry.key, core.Rng(seed), config, mazeSimilarity)
    assert.ok(!shown.claims.length, 'a put-away claim was shown')
  }
})

Then('it is still in the store, with its history', function (this: DepWorld) {
  const before = this.notes.get('faded:before') as MemoryEntry
  const entry = held(this, 'faded')
  assert.ok(entry, 'the claim was deleted')
  assert.equal(entry.reads, before.reads)
  assert.equal(entry.gains, before.gains)
  assert.equal(entry.pains, before.pains)
  assert.equal(entry.claim, before.claim)
})

Then('the player can still be shown it', function (this: DepWorld) {
  const store = this.notes.get('store') as Store
  const entry = held(this, 'faded')
  assert.equal(entry.archived, false)
  assert.ok(store.active().some((e) => e.id === entry.id))
})

// ── folding into rules ──────────────────────────────────────────────────

Given('the store holds the same advice about situations that differ only in which way the player came in', function (this: DepWorld) {
  const fromWest = claim(mazeKey('N.S.:W'), 'go E', { strength: 0.4, reads: 10 })
  const fromEast = claim(mazeKey('N.S.:E'), 'go E', { strength: 0.6, reads: 30 })
  remember(this, 'fromWest', fromWest)
  remember(this, 'fromEast', fromEast)
  this.notes.set('store', seeded([fromWest, fromEast]))
})

Given('the store holds different advice about situations that differ only in which way the player came in', function (this: DepWorld) {
  const east = claim(mazeKey('N.S.:W'), 'go E')
  const west = claim(mazeKey('N.S.:E'), 'go W')
  remember(this, 'east', east)
  remember(this, 'west', west)
  this.notes.set('store', seeded([east, west]))
})

function theRule(world: DepWorld): MemoryEntry {
  const rules = (world.notes.get('store') as Store).active().filter((e) => e.kind === 'rule')
  assert.equal(rules.length, 1, `expected one rule, found ${rules.length}`)
  return rules[0]!
}

Then('the store holds one rule in their place', function (this: DepWorld) {
  const rule = theRule(this)
  assert.equal(rule.claim, 'go E')
  const active = (this.notes.get('store') as Store).active()
  assert.equal(active.length, 1, `the store still shows ${active.map((e) => e.kind).join(', ')}`)
  // weighted by how often each was read: (0.4 × 10 + 0.6 × 30) / 40
  assert.ok(Math.abs(rule.strength - 0.55) < 1e-12, `rule strength ${rule.strength}`)
})

Then('the rule says which claims it came from', function (this: DepWorld) {
  const rule = theRule(this)
  const expected = [this.notes.get('fromWest') as string, this.notes.get('fromEast') as string].sort()
  assert.deepEqual([...rule.parents].sort(), expected)
})

Then('the rule is about only what those situations had in common', function (this: DepWorld) {
  assert.deepEqual(theRule(this).key.features, { walls: 'N.S.' })
})

Then('the claims it came from are put away', function (this: DepWorld) {
  assert.equal(held(this, 'fromWest').archived, true)
  assert.equal(held(this, 'fromEast').archived, true)
})

Then('each piece of advice is still held on its own', function (this: DepWorld) {
  const store = this.notes.get('store') as Store
  assert.equal(store.active().filter((e) => e.kind === 'rule').length, 0)
  assert.equal(held(this, 'east').archived, false)
  assert.equal(held(this, 'west').archived, false)
})

// ── the record ──────────────────────────────────────────────────────────

Given('several days have been played', function (this: DepWorld) {
  const store = new Store()
  for (let day = 0; day < 3; day++) playDay({ seed: 9, day, store, core: this.notes.get('core') as MazeCore })
  assert.ok(store.log.some((e) => e.body.type === 'day-end'), 'no day ended in the record')
  this.notes.set('store', store)
})
