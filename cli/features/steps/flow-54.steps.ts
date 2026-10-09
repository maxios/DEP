import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { SCRATCH, type DepWorld } from '../support/world'
import {
  Store, Instincts, loadGame, playSuiteDay, writeLearned, renderLearned, readJudgement, read, loadCore, configWith,
  situationSimilarity, line, entryId, featureSimilarity,
  type LoadedGame, type MemoryEntry, type JudgementReport, type VerdictCache,
} from '../../../packages/loop/src/index'
import { play, GAME_DOC } from './flow-51.steps'

const LEARNED = 'docs/reference/what-the-agent-learned.md'
const config = configWith()
const MINE = '- When the currency is USD and the tier is new: **choose defer**.'
const NOTE = 'Gold customers in refunds should always be asked about first.'
const UNKNOWN = '- When the currency is USD: **choose approve**.'

interface Mine { root: string; loaded: LoadedGame; store: Store; instincts: Instincts }
const mine = (world: DepWorld) => world.notes.get('mine') as Mine
const path = (world: DepWorld) => join(mine(world).root, LEARNED)
const doc = (world: DepWorld) => readFileSync(path(world), 'utf-8')

/** An independent copy of the instincts, so one scenario's judgement does not reach another. */
function copyInstincts(from: Instincts): Instincts {
  const copy = Instincts.start()
  for (const adapter of from.list()) if (adapter.version > 0) copy.adopt(adapter)
  copy.adopt(from.current())
  for (const night of from.nights) copy.nights.push(night.map((e) => ({ ...e, key: { features: { ...e.key.features } } })))
  return copy
}

/** The lines of one section of the document. */
function section(text: string, heading: string): string[] {
  return (text.split(`## ${heading}`)[1] ?? '').split('\n## ')[0]!.split('\n').filter((l) => l.startsWith('- '))
}

/** The claim a line of the document was written from. */
function entryOf(world: DepWorld, text: string): MemoryEntry {
  const { store, loaded } = mine(world)
  const names = Object.keys(loaded.game.situation)
  const found = store.active().find((e) => line(e, names) === text)
  assert.ok(found, `no claim wrote ${text}`)
  return found!
}

function strike(world: DepWorld, heading: string): MemoryEntry {
  const text = section(doc(world), heading)[0]
  assert.ok(text, `the document has nothing under ${heading}`)
  const entry = entryOf(world, text!)
  writeFileSync(path(world), doc(world).replace(text + '\n', ''))
  world.notes.set('struck', entry)
  return entry
}

function insertAfter(world: DepWorld, heading: string, text: string) {
  writeFileSync(path(world), doc(world).replace(`## ${heading}\n`, `## ${heading}\n\n${text}\n`))
}

function shown(world: DepWorld, features: Record<string, string>): string[] {
  const { store, loaded } = mine(world)
  const core = loadCore()
  const ids: string[] = []
  for (let seed = 1; seed <= 20; seed++) {
    ids.push(...read(store, { features }, core.Rng(seed), config, situationSimilarity(loaded.game)).entries.map((e) => e.id))
  }
  return ids
}

const readMine = (world: DepWorld) => {
  const { store, loaded, root, instincts } = mine(world)
  const report = readJudgement({ store, loaded, root, path: LEARNED, instincts })
  world.notes.set('judgement', report)
  return report
}

Given('what it learned has landed as a document', async function (this: DepWorld) {
  const played = await play(this)
  const root = mkdtempSync(join(SCRATCH, 'judgement-'))
  cpSync(played.root, root, { recursive: true, filter: (src) => !src.endsWith('.dep-trace.jsonl') })
  const loaded = loadGame(join(root, GAME_DOC), root)
  const store = Store.rebuild(played.store.log)
  this.notes.set('mine', { root, loaded, store, instincts: copyInstincts(played.instincts) })
  const report = writeLearned({ store, loaded, root, path: LEARNED })
  assert.ok(report.written && report.advice > 0 && report.habits > 0, JSON.stringify(report))
})

// ── striking out ────────────────────────────────────────────────────────

Given('I struck out a piece of its advice', function (this: DepWorld) {
  strike(this, 'Advice it relies on')
})

Given('I struck out one of its habits', function (this: DepWorld) {
  const habit = strike(this, 'Habits')
  const { instincts } = mine(this)
  assert.ok(instincts.current().instincts.some((i) => i.from === habit.id), 'the habit was never an instinct, so the scenario proves nothing')
})

When('the agent reads my changes', function (this: DepWorld) {
  readMine(this)
})

Given('the agent has read my changes', function (this: DepWorld) {
  readMine(this)
})

When('the agent reads my changes twice', function (this: DepWorld) {
  readMine(this)
  this.notes.set('afterFirst', { print: mine(this).store.fingerprint(), events: mine(this).store.log.length })
  readMine(this)
})

Then('that advice is not given in the situation it was about', function (this: DepWorld) {
  const struck = this.notes.get('struck') as MemoryEntry
  assert.ok(!shown(this, struck.key.features as Record<string, string>).includes(struck.id), `${struck.claim} is still given`)
})

Then('it no longer acts on that habit without being told', function (this: DepWorld) {
  const struck = this.notes.get('struck') as MemoryEntry
  const current = mine(this).instincts.current()
  assert.ok(current.instincts.every((i) => i.from !== struck.id), 'the instinct is still there')
})

// ── adding ──────────────────────────────────────────────────────────────

Given('I added advice of my own in the same form as its own', function (this: DepWorld) {
  const held = mine(this).store.active().some((e) => e.claim === 'choose defer' && Object.keys(e.key.features).length === 2 && e.key.features.currency === 'USD' && e.key.features.tier === 'new')
  assert.ok(!held, 'the agent already holds this advice, so the scenario proves nothing')
  insertAfter(this, 'What you told it', MINE)
})

Then('my advice is given in the situation I named', function (this: DepWorld) {
  const { store } = mine(this)
  const taught = store.active().find((e) => e.taught && e.claim === 'choose defer')
  assert.ok(taught, 'my advice is not held')
  const situation = { area: 'area-billing', kind: 'happy-path', size: 'small', currency: 'USD', tier: 'new' }
  assert.ok(shown(this, situation).includes(taught!.id), 'my advice was never given')
})

When('it plays another day', function (this: DepWorld) {
  const { store, loaded, root, instincts } = mine(this)
  const day = Math.max(...store.log.map((e) => e.body.day)) + 1
  playSuiteDay({ loaded, root, store, seed: 1, day, history: new Map(), instincts: instincts.current(), cache: new Map() as VerdictCache })
})

When('it writes out what it learned again', function (this: DepWorld) {
  const { store, loaded, root } = mine(this)
  this.notes.set('again', renderLearned({ store, loaded, root, path: LEARNED }))
})

const again = (world: DepWorld) => world.notes.get('again') as ReturnType<typeof renderLearned>

Then('my advice is listed as what I told it', function (this: DepWorld) {
  assert.ok(again(this).text, 'nothing was written again')
  const told = section(again(this).text!, 'What you told it')
  const held = [...mine(this).store.entries.values()].filter((e) => e.claim === 'choose defer' && (e.taught || e.parents.length)).map((e) => ({ k: e.key.features, kind: e.kind, taught: e.taught, archived: e.archived, parents: e.parents.length }))
  assert.ok(told.some((l) => l.startsWith('- When the currency is USD and the tier is new: **choose defer**.')), told.join('\n') + JSON.stringify(held))
})

Then('it says how often my advice was acted on and how often that passed', function (this: DepWorld) {
  const told = section(again(this).text!, 'What you told it').find((l) => l.includes('**choose defer**'))!
  const taught = mine(this).store.active().find((e) => e.taught && e.claim === 'choose defer')!
  assert.ok(taught.gains + taught.pains > 0, 'the agent never acted on my advice in a whole day')
  assert.ok(told.endsWith(`Acted on ${taught.gains + taught.pains} ${taught.gains + taught.pains === 1 ? 'time' : 'times'} here or somewhere like it; ${taught.gains} passed.`), told)
})

Given('I wrote a note of my own in the document', function (this: DepWorld) {
  writeFileSync(path(this), doc(this) + '\n' + NOTE + '\n')
})

Then('my note is still in the document', function (this: DepWorld) {
  assert.ok(again(this).text, 'nothing was written again')
  assert.ok(again(this).text!.includes(NOTE), 'the note is gone')
})

Then('it is no longer refused as changed by hand', function (this: DepWorld) {
  assert.equal(again(this).changedByHand, false)
})

Then('its memory is the same as after the first reading', function (this: DepWorld) {
  const first = this.notes.get('afterFirst') as { print: string; events: number }
  assert.equal(mine(this).store.fingerprint(), first.print)
  assert.equal(mine(this).store.log.length, first.events)
})

// ── what is not understood ──────────────────────────────────────────────

Given('I added advice that names a choice the game does not offer', function (this: DepWorld) {
  insertAfter(this, 'What you told it', UNKNOWN)
})

Then('that advice is not given anywhere', function (this: DepWorld) {
  assert.ok(!mine(this).store.active().some((e) => e.claim === 'choose approve'))
})

Then('it is kept as my note', function (this: DepWorld) {
  assert.ok(mine(this).store.notes.includes(UNKNOWN), JSON.stringify(mine(this).store.notes))
})

Then('I am told it was not understood as advice', function (this: DepWorld) {
  assert.deepEqual((this.notes.get('judgement') as JudgementReport).notUnderstood, [UNKNOWN])
})

// ── never folded ────────────────────────────────────────────────────────

Given('I told it advice alike to proven advice of its own', function (this: DepWorld) {
  const base = { area: 'area-billing', kind: 'happy-path', size: 'small', currency: 'EUR', tier: 'gold' }
  const entry = (features: Record<string, string>, acted: number, passed: number, taught: boolean): MemoryEntry => ({
    id: entryId('episode', { features }, 'choose convert'), kind: 'episode', key: { features }, claim: 'choose convert',
    strength: 0.6, reads: acted, gains: passed, pains: acted - passed, createdDay: 0, lastReadDay: 3,
    parents: [], distilled: false, archived: false, ...(taught ? { taught: true } : {}),
  })
  const store = new Store()
  const own = entry(base, 12, 11, false)
  const told = entry({ ...base, tier: 'silver' }, 10, 9, true)
  store.apply({ type: 'episode', episodeId: 'fixture', day: 3, creates: [own, told], sets: [], baselines: [] })
  this.notes.set('store', store)
  this.notes.set('similarity', featureSimilarity({ area: 1, kind: 1, size: 1, currency: 1, tier: 1 }))
  this.notes.set('today', 3)
  this.notes.set('told', told.id)
})

Then('my advice is still held in my own words', function (this: DepWorld) {
  const store = this.notes.get('store') as Store
  const told = store.entries.get(this.notes.get('told') as string)!
  assert.equal(told.archived, false, 'my advice was folded away')
  assert.equal(told.taught, true)
  assert.ok([...store.entries.values()].every((e) => !e.parents.includes(told.id)), 'my advice became part of a rule')
})
