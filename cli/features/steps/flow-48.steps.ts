import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, symlinkSync } from 'fs'
import { join, resolve } from 'path'
import { DepWorld, SCRATCH } from '../support/world'
import {
  Store, loadGame, loadCore, playSuiteDay, read, configWith, featureSimilarity, entryId,
  type LoadedGame, type SuiteDayResult, type SuitePlayer, type Level, type Verdict,
} from '../../../packages/loop/src/index'

const LOOP = resolve(import.meta.dir, '..', '..', '..', 'packages', 'loop')
const ARENA = join(LOOP, 'arenas', 'requests')

/** The arena's hidden rule, known to the test independently of the engine. */
function expected(level: Level): string {
  const f = level.key.features
  if (f.kind === 'validation') return 'refused'
  if (f.size === 'large' && f.tier === 'new') return 'refused'
  if (f.currency !== 'USD') return 'converted'
  if (f.tier === 'new') return 'pending'
  return 'accepted'
}

function outcome(level: Level, choice: string): string {
  const currency = level.key.features.currency ?? 'USD'
  return ({ accept: 'accepted', refuse: 'refused', convert: currency !== 'USD' ? 'converted' : 'accepted', defer: 'pending' } as Record<string, string>)[choice] ?? 'unanswered'
}

export function game(world: DepWorld): { root: string; loaded: LoadedGame } {
  return { root: world.notes.get('arenaRoot') as string, loaded: world.notes.get('loaded') as LoadedGame }
}

export const sameSituation = (loaded: LoadedGame) => featureSimilarity(Object.fromEntries(Object.keys(loaded.game.situation).map((f) => [f, 1])))

Given('the reference game of scenarios', function (this: DepWorld) {
  const root = mkdtempSync(join(SCRATCH, 'arena-'))
  cpSync(ARENA, root, { recursive: true, filter: (src) => !src.includes('/choices') })
  symlinkSync(join(LOOP, 'node_modules'), join(root, 'node_modules'))
  this.notes.set('arenaRoot', root)
  this.notes.set('loaded', loadGame(join(root, 'game.md'), root))
})

When('the player plays a day of the game', function (this: DepWorld) {
  const { root, loaded } = game(this)
  const store = new Store()
  this.notes.set('store', store)
  this.notes.set('suiteDay', playSuiteDay({ loaded, root, store, seed: 1, day: 0, player: this.notes.get('player') as SuitePlayer | undefined }))
})

Then('every level it played was judged by running its scenario', function (this: DepWorld) {
  const { loaded } = game(this)
  const day = this.notes.get('suiteDay') as SuiteDayResult
  assert.equal(day.episodes.length, 40)
  for (const e of day.episodes) {
    const level = loaded.levels.find((l) => l.id === e.level)!
    const shouldPass = outcome(level, e.choice) === expected(level)
    assert.equal(e.verdict, shouldPass ? 'passed' : 'failed', `${e.level} answered ${e.choice}`)
  }
  assert.ok(day.episodes.some((e) => e.verdict === 'passed') && day.episodes.some((e) => e.verdict === 'failed'), 'the day was all one verdict, which proves little')
})

Then('each level scores what the game document says passing and failing are worth', function (this: DepWorld) {
  const { loaded } = game(this)
  for (const e of (this.notes.get('suiteDay') as SuiteDayResult).episodes) {
    assert.equal(e.reward, e.verdict === 'passed' ? loaded.game.scoring.pass : loaded.game.scoring.fail)
  }
})

When('the player plays the same days of the game with a store and without one', function (this: DepWorld) {
  const { root, loaded } = game(this)
  const last = { with: 0, without: 0 }
  for (const seed of [1, 2]) {
    for (const useStore of [true, false]) {
      const store = new Store()
      const history = new Map<string, Verdict>()
      let day: SuiteDayResult | undefined
      for (let d = 0; d < 4; d++) day = playSuiteDay({ loaded, root, store, seed, day: d, useStore, history })
      last[useStore ? 'with' : 'without'] += day!.metrics.passRate / 2
    }
  }
  this.notes.set('lastDay', last)
})

Then('by the last day it passes more levels with the store', function (this: DepWorld) {
  const last = this.notes.get('lastDay') as { with: number; without: number }
  assert.ok(last.with > last.without, `with a store ${last.with.toFixed(2)} passed, without ${last.without.toFixed(2)}`)
})

When('I play a day of the game twice from the same seed', function (this: DepWorld) {
  const { root, loaded } = game(this)
  this.notes.set('first', playSuiteDay({ loaded, root, store: new Store(), seed: 3, day: 0 }))
  this.notes.set('second', playSuiteDay({ loaded, root, store: new Store(), seed: 3, day: 0 }))
})

// ── transfer across product areas ───────────────────────────────────────

Given('the store learned a claim on a level in one product area', function (this: DepWorld) {
  const { loaded } = game(this)
  const withoutArea = (l: Level) => JSON.stringify({ ...l.key.features, area: undefined })
  const pair = loaded.levels.flatMap((a) => loaded.levels
    .filter((b) => b.key.features.area !== a.key.features.area && a.key.features.size && withoutArea(a) === withoutArea(b))
    .map((b) => [a, b] as const))[0]
  assert.ok(pair, 'the arena has no two areas sharing a situation')
  const [learned, met] = pair
  const store = new Store()
  const claim = 'choose convert'
  store.apply({
    type: 'episode', episodeId: 'fixture', day: 0, baselines: [], sets: [],
    creates: [{ id: entryId('episode', learned.key, claim), kind: 'episode', key: learned.key, claim, strength: 0.5, reads: 4, gains: 3, pains: 1, createdDay: 0, lastReadDay: 0, parents: [], distilled: false, archived: false }],
  })
  this.notes.set('store', store)
  this.notes.set('met', met)
  this.notes.set('claim', claim)
})

When('the player meets a level in another area that is otherwise the same situation', function (this: DepWorld) {
  const { loaded } = game(this)
  const met = this.notes.get('met') as Level
  this.notes.set('shown', read(this.notes.get('store') as Store, met.key, loadCore().Rng(1), configWith({ EPS: 0 }), sameSituation(loaded)))
})

Then('that claim is offered', function (this: DepWorld) {
  const shown = this.notes.get('shown') as { claims: string[] }
  assert.ok(shown.claims.includes(this.notes.get('claim') as string), `offered: ${JSON.stringify(shown.claims)}`)
})

// ── regressions ─────────────────────────────────────────────────────────

Given('a level the player passed on an earlier day', function (this: DepWorld) {
  const { loaded } = game(this)
  const level = loaded.levels.find((l) => expected(l) === 'converted')!
  this.notes.set('broken', level)
  this.notes.set('history', new Map<string, Verdict>([[level.id, 'passed']]))
})

When('the player fails it on a later day', function (this: DepWorld) {
  const { root, loaded } = game(this)
  const broken = this.notes.get('broken') as Level
  // answers everything with "defer", which is wrong for a request that should be converted
  const player: SuitePlayer = {
    act: (view) => ({ writes: [{ path: `arena/choices/${view.level.id.replace(/[^A-Za-z0-9]+/g, '_')}.json`, content: JSON.stringify({ option: 'defer' }) }], choice: 'defer' }),
    propose: () => [],
  }
  const day = playSuiteDay({ loaded, root, store: new Store(), seed: 1, day: 5, count: loaded.levels.length, history: this.notes.get('history') as Map<string, Verdict>, player })
  this.notes.set('brokenEpisode', day.episodes.find((e) => e.level === broken.id))
})

Then('that failure scores as breaking what worked, below an ordinary failure', function (this: DepWorld) {
  const { loaded } = game(this)
  const e = this.notes.get('brokenEpisode') as { verdict: string; regression: boolean; reward: number }
  assert.ok(e, 'the level was not played')
  assert.equal(e.verdict, 'failed')
  assert.equal(e.regression, true)
  assert.equal(e.reward, loaded.game.scoring.regression)
  assert.ok(loaded.game.scoring.regression < loaded.game.scoring.fail)
})
