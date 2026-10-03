import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import type { DepWorld } from '../support/world'
import {
  Store, playDay, loadCore, readPin, CorePinError, DEFAULT_CORE_PATH, MockPlayer, mazeKey,
  read, write, configWith, mazeSimilarity, entryId, type DayResult, type MazeCore, type Player, type PlayerView,
} from '../../../packages/loop/src/index'

/** Seeds for the claims that are about averages: eight independent days of fresh mazes. */
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8]
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

function core(world: DepWorld): MazeCore {
  return world.notes.get('core') as MazeCore
}

Given('the reference maze, pinned to the core it was proven on', function (this: DepWorld) {
  this.notes.set('core', loadCore())
})

// ── an empty store ──────────────────────────────────────────────────────

When('the player plays a day of fresh mazes, starting with an empty store', function (this: DepWorld) {
  const store = new Store()
  this.notes.set('store', store)
  this.notes.set('with', playDay({ seed: 42, day: 0, store, core: core(this) }))
  this.notes.set('without', playDay({ seed: 42, day: 0, store: new Store(), core: core(this), useStore: false }))
})

Then('its first maze is played exactly as it would be with no store at all', function (this: DepWorld) {
  const withStore = (this.notes.get('with') as DayResult).episodes[0]!
  const without = (this.notes.get('without') as DayResult).episodes[0]!
  assert.equal(withStore.moves, without.moves)
  assert.equal(withStore.reward, without.reward)
  assert.equal(withStore.read, 0, 'an empty store showed the player something')
})

Then('the store holds claims about situations, never about particular places', function (this: DepWorld) {
  const store = this.notes.get('store') as Store
  assert.ok(store.active().length > 0, 'the day taught the store nothing')
  for (const entry of store.active()) {
    const features = Object.keys(entry.key.features)
    for (const placeLike of ['x', 'y', 'cell', 'position']) {
      assert.ok(!features.includes(placeLike), `${entry.claim} is keyed by ${placeLike}`)
    }
  }
})

// ── with and without ────────────────────────────────────────────────────

When('the player plays the same days of mazes with a store and without one', function (this: DepWorld) {
  const withStore: DayResult[] = []
  const without: DayResult[] = []
  for (const seed of SEEDS) {
    withStore.push(playDay({ seed, day: 0, store: new Store(), core: core(this) }))
    without.push(playDay({ seed, day: 0, store: new Store(), core: core(this), useStore: false }))
  }
  this.notes.set('withDays', withStore)
  this.notes.set('withoutDays', without)
})

Then('with the store it falls short less often', function (this: DepWorld) {
  const withStore = mean((this.notes.get('withDays') as DayResult[]).map((d) => d.metrics.painRate))
  const without = mean((this.notes.get('withoutDays') as DayResult[]).map((d) => d.metrics.painRate))
  assert.ok(withStore < without, `with a store it fell short ${withStore.toFixed(2)} of the time, without ${without.toFixed(2)}`)
})

Then('with the store its runs score better', function (this: DepWorld) {
  const withStore = mean((this.notes.get('withDays') as DayResult[]).map((d) => d.metrics.meanReward))
  const without = mean((this.notes.get('withoutDays') as DayResult[]).map((d) => d.metrics.meanReward))
  assert.ok(withStore > without, `with a store runs scored ${withStore.toFixed(3)}, without ${without.toFixed(3)}`)
})

// ── determinism ─────────────────────────────────────────────────────────

When('I play a day twice from the same seed', function (this: DepWorld) {
  this.notes.set('first', playDay({ seed: 7, day: 0, store: new Store(), core: core(this) }))
  this.notes.set('second', playDay({ seed: 7, day: 0, store: new Store(), core: core(this) }))
})

Then('both days end with the same fingerprint', function (this: DepWorld) {
  const a = this.notes.get('first') as DayResult
  const b = this.notes.get('second') as DayResult
  assert.equal(a.fingerprint, b.fingerprint)
  assert.equal(a.head, b.head)
  assert.deepEqual(a.metrics, b.metrics)
})

Given('a day has been played', function (this: DepWorld) {
  const store = new Store()
  playDay({ seed: 3, day: 0, store, core: core(this) })
  this.notes.set('store', store)
})

When('I rebuild the store from its record of changes', function (this: DepWorld) {
  const store = this.notes.get('store') as Store
  // through text, the way a record would come back from disk
  const record = JSON.parse(JSON.stringify(store.log))
  this.notes.set('rebuilt', Store.rebuild(record))
})

Then('the rebuilt store has the same fingerprint as the one the day left behind', function (this: DepWorld) {
  const store = this.notes.get('store') as Store
  const rebuilt = this.notes.get('rebuilt') as Store
  assert.equal(rebuilt.fingerprint(), store.fingerprint())
  assert.equal(rebuilt.head, store.head)
})

// ── the player cannot award itself ──────────────────────────────────────

/** Makes exactly the moves an honest player would, and claims a triumph every time. */
class BoastingPlayer implements Player {
  private readonly honest = new MockPlayer(0.1)
  startEpisode() { this.honest.startEpisode() }
  act(view: PlayerView, claims: string[], rng: Parameters<Player['act']>[2]) {
    return { ...this.honest.act(view, claims, rng), reward: 1, verdict: 'triumph', strength: 1 }
  }
  endEpisode(reached: boolean) {
    return this.honest.endEpisode(reached).map((p) => ({
      ...(p as object), strength: 1, gains: 999, reward: 1, score: { reward: 1, gain: true, pain: false },
    }))
  }
}

Given('a player that reports every episode as a triumph', function (this: DepWorld) {
  this.notes.set('player', new BoastingPlayer())
})

When('it plays a day of fresh mazes with a store of claims', function (this: DepWorld) {
  const boasting = new Store()
  const honest = new Store()
  this.notes.set('boastingDay', playDay({ seed: 5, day: 0, store: boasting, core: core(this), player: this.notes.get('player') as Player }))
  this.notes.set('honestDay', playDay({ seed: 5, day: 0, store: honest, core: core(this), player: new MockPlayer(0.1) }))
  this.notes.set('boasting', boasting)
  this.notes.set('honest', honest)
})

Then('the store is exactly what an honest player making the same moves would have left', function (this: DepWorld) {
  const boasting = this.notes.get('boasting') as Store
  const honest = this.notes.get('honest') as Store
  assert.ok(honest.active().length > 0, 'the honest day learned nothing, so the comparison proves nothing')
  assert.equal(boasting.fingerprint(), honest.fingerprint(), 'something the player claimed about itself reached the store')
})

// ── what the player sees ────────────────────────────────────────────────

When('the player is shown what the store knows about a situation', function (this: DepWorld) {
  const store = new Store()
  playDay({ seed: 2, day: 0, store, core: core(this) })
  const config = configWith()
  const busiest = store.active().sort((a, b) => b.reads - a.reads)[0]!
  const rng = core(this).Rng(1)
  this.notes.set('shown', read(store, busiest.key, rng, config, mazeSimilarity))
  this.notes.set('store', store)
})

Then('it receives the claims best first', function (this: DepWorld) {
  const shown = this.notes.get('shown') as ReturnType<typeof read>
  const store = this.notes.get('store') as Store
  assert.ok(shown.claims.length > 0, 'nothing was shown')
  const scores = shown.entries.map((e) => e.sim * store.entries.get(e.id)!.strength)
  // the exploration slot, when there is one, is last and need not be in order
  const ranked = scores.slice(0, Math.max(1, scores.length - 1))
  for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1]! >= ranked[i]!, `shown out of order: ${scores}`)
})

Then('nothing it receives says how strongly any of them is held', function (this: DepWorld) {
  const shown = this.notes.get('shown') as ReturnType<typeof read>
  for (const claim of shown.claims) {
    assert.equal(typeof claim, 'string')
    assert.ok(!/\d/.test(claim), `a claim carries a number: ${claim}`)
  }
})

// ── credit ──────────────────────────────────────────────────────────────

Given('the store holds two claims about one situation that recommend different moves', function (this: DepWorld) {
  const store = new Store()
  const key = mazeKey('N.S.:W')
  const make = (claim: string) => ({
    id: entryId('episode', key, claim), kind: 'episode' as const, key, claim, strength: 0.5,
    reads: 0, gains: 0, pains: 0, createdDay: 0, lastReadDay: 0, parents: [], distilled: false, archived: false,
  })
  store.apply({ type: 'episode', episodeId: 'seed', day: 0, creates: [make('go E'), make('go W')], sets: [], baselines: [{ key: '*', sum: -0.5, n: 1 }] })
  this.notes.set('store', store)
  this.notes.set('key', key)
})

When('the player follows one of them and the episode goes well', function (this: DepWorld) {
  const store = this.notes.get('store') as Store
  const key = this.notes.get('key') as ReturnType<typeof mazeKey>
  const east = entryId('episode', key, 'go E')
  const west = entryId('episode', key, 'go W')
  this.notes.set('before', { east: store.entries.get(east)!.strength, west: store.entries.get(west)!.strength })
  write(store, {
    episodeId: 'e', day: 0,
    traces: [{ step: 0, situation: key, entries: [{ id: east, share: 0.5 }, { id: west, share: 0.5 }], action: 'E' }],
    score: { reward: 0.8, pain: false, gain: true },
    proposals: [],
  }, configWith(), mazeSimilarity)
  this.notes.set('ids', { east, west })
})

Then('the claim it followed is held more strongly', function (this: DepWorld) {
  const store = this.notes.get('store') as Store
  const { east } = this.notes.get('ids') as { east: string }
  const before = (this.notes.get('before') as { east: number }).east
  assert.ok(store.entries.get(east)!.strength > before)
})

Then('the claim it passed over is held exactly as strongly as before', function (this: DepWorld) {
  const store = this.notes.get('store') as Store
  const { west } = this.notes.get('ids') as { west: string }
  const before = (this.notes.get('before') as { west: number }).west
  assert.equal(store.entries.get(west)!.strength, before)
  assert.equal(store.entries.get(west)!.reads, 1, 'it was read, and should be counted as read')
})

// ── the pin ─────────────────────────────────────────────────────────────

Given('the vendored maze core no longer matches its pin', function (this: DepWorld) {
  const dir = mkdtempSync(join(tmpdir(), 'maze-core-'))
  const tampered = join(dir, 'maze-core.js')
  copyFileSync(DEFAULT_CORE_PATH, tampered)
  writeFileSync(tampered, readFileSync(tampered, 'utf-8').replace('const REWARD = 10;', 'const REWARD = 11;'))
  this.notes.set('tampered', tampered)
})

When('I start a day', function (this: DepWorld) {
  this.error = undefined
  this.notes.set('played', false)
  try {
    const tamperedCore = loadCore({ path: this.notes.get('tampered') as string, pin: readPin() })
    playDay({ seed: 1, day: 0, store: new Store(), core: tamperedCore })
    this.notes.set('played', true)
  } catch (err) {
    this.error = err
  }
})

Then('I am told the core does not match its pin', function (this: DepWorld) {
  assert.ok(this.error instanceof CorePinError, `expected a pin error, got ${this.errorMessage()}`)
  assert.ok(/does not match its pin/.test(this.errorMessage()), this.errorMessage())
})

Then('no day is played', function (this: DepWorld) {
  assert.equal(this.notes.get('played'), false)
})
