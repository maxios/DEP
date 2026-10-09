import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { DepWorld } from '../support/world'
import {
  Store, ClaudePlayer, playSuiteDayAsync, entryId,
  type Ask, type Level, type MemoryEntry, type Prompt, type SuiteDayResult,
} from '../../../packages/loop/src/index'
import { game } from './flow-48.steps'

/**
 * A stand-in for the model, so the story runs without a network: it follows
 * the first piece of advice it is shown that names an option, and otherwise
 * converts. What it was shown is what the real model would have been shown.
 */
const standIn: Ask = async (prompt: Prompt) => {
  const advised = /\d+\. choose ([a-z-]+)/.exec(prompt.user)?.[1]
  return { choice: advised && prompt.options.includes(advised) ? advised : 'convert', reason: 'stand-in' }
}

const player = (world: DepWorld) => world.notes.get('player') as ClaudePlayer
const store = (world: DepWorld) => {
  const existing = world.notes.get('store') as Store | undefined
  if (existing) return existing
  const s = new Store()
  world.notes.set('store', s)
  return s
}

Given('a model player', function (this: DepWorld) {
  this.notes.set('ask', standIn)
  this.notes.set('player', new ClaudePlayer({ arena: 'arena', ask: (p) => (this.notes.get('ask') as Ask)(p) }))
})

async function playDay(world: DepWorld, count?: number) {
  const { root, loaded } = game(world)
  const s = store(world)
  world.notes.set('headBefore', s.head)
  try {
    world.notes.set('suiteDay', await playSuiteDayAsync({ loaded, root, store: s, seed: 1, day: 0, player: player(world), count }))
  } catch (err) {
    world.error = err
  }
}

When('the model plays a day of the game', async function (this: DepWorld) {
  await playDay(this)
})

const day = (world: DepWorld) => {
  assert.ok(!world.error, `the day failed: ${world.errorMessage()}`)
  return world.notes.get('suiteDay') as SuiteDayResult
}

Then("each answer is one of the game's options", function (this: DepWorld) {
  const { loaded } = game(this)
  for (const e of day(this).episodes) assert.ok(loaded.game.actions.options.includes(e.choice), `${e.level} answered "${e.choice}"`)
})

// ── what it is shown ────────────────────────────────────────────────────

Given('the agent holds advice about a situation', function (this: DepWorld) {
  const { loaded } = game(this)
  const level = [...loaded.levels].sort((a, b) => a.id.localeCompare(b.id))[0]!
  const entry: MemoryEntry = {
    id: entryId('episode', level.key, 'choose refuse'), kind: 'episode', key: level.key, claim: 'choose refuse',
    strength: 0.4375, reads: 6, gains: 5, pains: 1, createdDay: 0, lastReadDay: 0, parents: [], distilled: false, archived: false,
  }
  store(this).apply({ type: 'episode', episodeId: 'fixture', day: 0, creates: [entry], sets: [], baselines: [] })
  this.notes.set('advised', level)
})

When('the model answers a level in that situation', async function (this: DepWorld) {
  await playDay(this, game(this).loaded.levels.length)
})

const promptOf = (world: DepWorld, level: Level) => {
  const seen = player(world).shown.find((s) => s.level === level.id)
  assert.ok(seen, `the model was never asked about ${level.id}`)
  return seen!.prompt
}

Then('the advice is in what the model was shown', function (this: DepWorld) {
  assert.match(promptOf(this, this.notes.get('advised') as Level).user, /choose refuse/)
})

Then('nothing it was shown carries the strength a claim is held at', function (this: DepWorld) {
  const p = promptOf(this, this.notes.get('advised') as Level)
  assert.doesNotMatch(`${p.system}\n${p.user}`, /0\.4375|0\.44|strength/i)
})

/** The scenario a level was drawn from, read from its feature file: its steps, and the outcome its row expects. */
function scenarioOf(root: string, level: Level): { steps: string[]; outcome: string | null } {
  const lines = readFileSync(join(root, level.file), 'utf-8').split('\n')
  // a level's id is file:scenario-line:row-line
  const [, scenarioLine, rowLine] = level.id.split(':').map(Number) as [number, number, number]
  // a scenario without examples names its outcome in its steps, which are checked on their own
  const cells = rowLine ? lines[rowLine - 1]!.split('|').map((c) => c.trim()).filter(Boolean) : []
  const steps: string[] = []
  for (let i = scenarioLine; i < lines.length && !/^\s*(Examples:|Scenario|@)/.test(lines[i]!); i++) {
    const m = /^\s*(?:Given|When|Then|And|But)\s+(.*)$/.exec(lines[i]!)
    if (m) steps.push(...m[1]!.split(/<[^>]+>/).map((f) => f.trim()).filter((f) => f.length >= 10))
  }
  return { steps, outcome: cells.at(-1) ?? null }
}

Then('nothing it was shown contains a step of the scenario it answered', function (this: DepWorld) {
  const { root, loaded } = game(this)
  assert.ok(player(this).shown.length > 0)
  for (const { level, prompt } of player(this).shown) {
    const { steps } = scenarioOf(root, loaded.levels.find((l) => l.id === level)!)
    assert.ok(steps.length > 0, `no steps found for ${level}`)
    for (const step of steps) assert.ok(!`${prompt.system}\n${prompt.user}`.includes(step), `${level}: the model was shown "${step}"`)
  }
})

Then('nothing it was shown names the outcome its scenario expects', function (this: DepWorld) {
  const { root, loaded } = game(this)
  for (const { level, prompt } of player(this).shown) {
    const { outcome } = scenarioOf(root, loaded.levels.find((l) => l.id === level)!)
    if (!outcome) continue
    assert.doesNotMatch(`${prompt.system}\n${prompt.user}`, new RegExp(`\\b${outcome}\\b`, 'i'), `${level}: the model was shown "${outcome}"`)
  }
})

// ── learning from it ────────────────────────────────────────────────────

Then('what passed is remembered as advice, and nothing that failed is', function (this: DepWorld) {
  const { loaded } = game(this)
  const episodes = day(this).episodes.map((e) => ({ ...e, key: loaded.levels.find((l) => l.id === e.level)!.key }))
  const learned = store(this).active()
  assert.ok(learned.length > 0, 'nothing was remembered')
  for (const m of learned) {
    // every piece of advice is a choice that passed in a situation it describes
    const backed = episodes.some((e) => e.verdict === 'passed' && m.claim === `choose ${e.choice}` && Object.entries(m.key.features).every(([k, v]) => e.key.features[k] === v))
    assert.ok(backed, `${m.claim} for ${JSON.stringify(m.key.features)} was remembered without a pass behind it`)
  }
})

// ── what goes wrong ─────────────────────────────────────────────────────

Given('a model that answers one level with a choice the game does not offer', function (this: DepWorld) {
  let first = true
  this.notes.set('ask', async (p: Prompt) => {
    if (first) { first = false; return { choice: 'approve', reason: 'made up' } }
    return standIn(p)
  })
})

Then('that level is void, with the reason', function (this: DepWorld) {
  const voided = day(this).voided
  assert.equal(voided.length, 1, JSON.stringify(voided))
  assert.match(voided[0]!.reason, /"approve" is not one of the game's options/)
  this.notes.set('voidedLevel', voided[0]!.level)
})

Then('nothing is learned from it', function (this: DepWorld) {
  const id = this.notes.get('voidedLevel') as string
  assert.ok(!day(this).record.some((r) => r.traces.some((t) => t.action === 'approve')), 'the void level was learned from')
  assert.ok(!store(this).active().some((m) => m.claim === 'choose approve'), id)
})

Given('a model that cannot be reached', function (this: DepWorld) {
  this.notes.set('ask', async () => { throw new Error('connect ECONNREFUSED api.anthropic.com:443') })
})

Then('I am told the model could not be reached', function (this: DepWorld) {
  assert.match(this.errorMessage(), /the model could not be reached/)
})

Then("the agent's memory is unchanged", function (this: DepWorld) {
  assert.equal(store(this).head, this.notes.get('headBefore'))
})
