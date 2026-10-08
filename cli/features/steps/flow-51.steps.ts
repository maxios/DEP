import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { appendFileSync, cpSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { SCRATCH, type DepWorld } from '../support/world'
import { openDocumentationSet } from '../../src/lib'
import {
  Store, Instincts, loadGame, playSuiteDay, sleepNight, suiteHeldOut, writeLearned, configWith, claimAction,
  type LoadedGame, type LearnedReport, type Level, type Verdict, type VerdictCache,
} from '../../../packages/loop/src/index'

const LOOP = resolve(import.meta.dir, '..', '..', '..', 'packages', 'loop')
const ARENA = join(LOOP, 'arenas', 'requests')
export const GAME_DOC = 'docs/reference/requests-game.md'
const SEED = 1
const DAYS = 6
const config = configWith()

interface Played { root: string; loaded: LoadedGame; store: Store }

/** Playing is slow and every scenario only reads the memory, so the days are played once. */
let played: Played | undefined
let numbered = 0

/** A DEP project with the reference arena in it and its game document among the references. */
export async function play(world: DepWorld): Promise<Played> {
  if (played) return played
  // the world clears its own project after each scenario; this one outlives it
  world.seedDefaultDocs()
  await world.materialise()
  const root = mkdtempSync(join(SCRATCH, 'learned-'))
  cpSync(world.root, root, { recursive: true, filter: (src) => !src.endsWith('.dep-vectors.db') })
  cpSync(join(ARENA, 'arena'), join(root, 'arena'), { recursive: true, filter: (src) => !src.includes('/choices') })
  symlinkSync(join(LOOP, 'node_modules'), join(root, 'node_modules'))
  writeFileSync(join(root, GAME_DOC), readFileSync(join(ARENA, 'game.md'), 'utf-8'))
  const loaded = loadGame(join(root, GAME_DOC), root)

  const sorted = [...loaded.levels].sort((a, b) => a.id.localeCompare(b.id))
  const heldOut: Level[] = sorted.filter((_, i) => i % 6 === 0)
  const heldOutIds = new Set(heldOut.map((l) => l.id))
  const store = new Store()
  const instincts = Instincts.start()
  const history = new Map<string, Verdict>()
  const cache: VerdictCache = new Map()
  const proving = suiteHeldOut({ loaded, root, store, levels: heldOut, seed: SEED, cache })
  for (let day = 0; day < DAYS; day++) {
    const r = playSuiteDay({ loaded, root, store, seed: SEED, day, history, heldOut: heldOutIds, instincts: instincts.current(), cache })
    sleepNight({ store, instincts, day: r, seed: SEED, heldOut: proving })
  }
  played = { root, loaded, store }
  return played
}

function learned(world: DepWorld): Played {
  return world.notes.get('played') as Played
}

/** Each scenario writes its own document, so none reads another's. */
function writeOut(world: DepWorld, path?: string): LearnedReport {
  const { root, loaded, store } = learned(world)
  const target = path ?? `docs/reference/learned-${++numbered}.md`
  const report = writeLearned({ store, loaded, root, path: target })
  world.notes.set('report', report)
  world.set?.refresh()
  world.notes.set('text', readFileSync(join(root, target), 'utf-8'))
  return report
}

const text = (world: DepWorld) => world.notes.get('text') as string
const body = (doc: string) => doc.replace(/^---\n[\s\S]*?\n---\n/, '')
const section = (doc: string, heading: string) => (body(doc).split(`## ${heading}`)[1] ?? '').split('\n## ')[0]!
const lines = (doc: string, heading: string) => section(doc, heading).split('\n').filter((l) => l.startsWith('- '))

Given('a game the agent has played for several days', async function (this: DepWorld) {
  const p = await play(this)
  this.notes.set('played', p)
  this.set = openDocumentationSet(p.root)
})

When('I write out what the agent has learned', function (this: DepWorld) {
  writeOut(this)
})

Then('each piece of advice it relies on reads as a sentence about a situation', function (this: DepWorld) {
  const advice = lines(text(this), 'Advice it relies on')
  assert.ok(advice.length > 0, `nothing was written as advice:\n${text(this)}`)
  for (const l of advice) assert.match(l, /^- (When the [a-z]+ is [^:]+|In every situation): \*\*choose [a-z]+\*\*\./, l)
})

Then('each says how often it was acted on and how often that passed', function (this: DepWorld) {
  const { store } = learned(this)
  for (const l of lines(text(this), 'Advice it relies on')) {
    const m = /Acted on (\d+) times? here or somewhere like it; (\d+) passed\.$/.exec(l)
    assert.ok(m, `no evidence on: ${l}`)
    const acted = Number(m![1]), passed = Number(m![2])
    assert.ok(passed <= acted, l)
    const matching = store.active().filter((e) => l.includes(`**${e.claim}**`) && e.gains + e.pains === acted && e.gains === passed)
    assert.ok(matching.length > 0, `the evidence on this line is not the memory's: ${l}`)
  }
})

Given('some of what it learned has become habit', function (this: DepWorld) {
  const { store } = learned(this)
  assert.ok(store.active().some((e) => e.distilled), 'nothing became habit in the days played')
})

Then('the habits are listed apart from the advice it still needs to be told', function (this: DepWorld) {
  const { store } = learned(this)
  const habits = lines(text(this), 'Habits')
  const advice = lines(text(this), 'Advice it relies on')
  assert.ok(habits.length > 0, `no habits were written:\n${text(this)}`)
  const absorbed = store.active().filter((e) => e.distilled)
  for (const h of habits) assert.ok(absorbed.some((e) => h.includes(`**${e.claim}**`)), `${h} is not a habit`)
  for (const a of advice) assert.ok(!habits.includes(a), `${a} is listed as both`)
  assert.equal(new Set([...habits, ...advice]).size, habits.length + advice.length)
})

Then('the learned document is checked like any other reference', function (this: DepWorld) {
  const report = this.result as { documents: Array<{ path: string; status: string; checks: Array<{ name: string; passed: boolean; message?: string }> }> }
  const path = (this.notes.get('report') as LearnedReport).path
  const doc = report.documents.find((d) => d.path === path)
  assert.ok(doc, `the learned document was not checked: ${report.documents.map((d) => d.path).join(', ')}`)
  assert.notEqual(doc!.status, 'FAIL', JSON.stringify(doc!.checks.filter((c) => !c.passed)))
})

Then('it names the game it was learned from', function (this: DepWorld) {
  const doc = text(this)
  assert.ok(body(doc).includes('game.requests'), 'the body does not name the game')
  assert.match(doc, /target: requests-game\.md\n\s+rel: USES/, 'it does not link to the game document')
})

Then('nothing weak, untested or put away is in it', function (this: DepWorld) {
  const { store } = learned(this)
  const proven = store.active().filter((e) =>
    claimAction(e.claim) !== null && e.gains + e.pains >= 5 && e.gains / (e.gains + e.pains) >= config.GAIN_RATIO && (e.distilled || e.strength > config.S_INIT))
  const unproven = [...store.entries.values()].filter((e) => !proven.includes(e))
  assert.ok(unproven.some((e) => e.gains + e.pains < 5) && unproven.some((e) => !e.distilled && e.strength <= config.S_INIT),
    'the memory holds nothing weak and untested, so the scenario proves nothing')
  const written = [...lines(text(this), 'Advice it relies on'), ...lines(text(this), 'Habits')]
  assert.equal(written.length, proven.length, `${written.length} lines for ${proven.length} proven claims`)
  for (const l of written) {
    const m = /Acted on (\d+) times? here or somewhere like it; (\d+) passed\.$/.exec(l)!
    assert.ok(proven.some((e) => l.includes(`**${e.claim}**`) && e.gains + e.pains === Number(m[1]) && e.gains === Number(m[2])), `${l} has not proved itself`)
  }

  // in six days nothing is put away and nothing proven fades, so do both to a copy of the memory
  const { root, loaded } = learned(this)
  const copy = Store.rebuild(store.log)
  const [gone, faded] = proven.filter((e) => !e.distilled)
  copy.apply({ type: 'day-end', day: DAYS, sets: [{ id: faded!.id, strength: config.S_INIT, reads: faded!.reads, gains: faded!.gains, pains: faded!.pains, lastReadDay: faded!.lastReadDay }], rules: [], archive: [gone!.id] })
  const path = `docs/reference/learned-${++numbered}.md`
  writeLearned({ store: copy, loaded, root, path })
  const after = lines(readFileSync(join(root, path), 'utf-8'), 'Advice it relies on')
  const before = lines(text(this), 'Advice it relies on')
  for (const [e, what] of [[gone!, 'put away'], [faded!, 'faded']] as const) {
    const said = (l: string) => l.endsWith(`**${e.claim}**. Acted on ${e.gains + e.pains} times here or somewhere like it; ${e.gains} passed.`)
    assert.equal(after.filter(said).length, before.filter(said).length - 1, `the claim ${what} is still written`)
  }
})

When('I write out what the agent has learned twice', function (this: DepWorld) {
  writeOut(this)
  this.notes.set('first', text(this))
  writeOut(this)
})

Then('both documents say the same thing', function (this: DepWorld) {
  assert.equal(body(this.notes.get('first') as string), body(text(this)))
})

Then('no line carries the strength a claim is held at', function (this: DepWorld) {
  const { store } = learned(this)
  const doc = text(this)
  assert.doesNotMatch(doc, /strength/i)
  const numbers = new Set((doc.match(/\d+\.\d+/g) ?? []))
  for (const e of store.entries.values()) {
    for (const places of [1, 2, 3, 4]) assert.ok(!numbers.has(e.strength.toFixed(places)) || e.strength.toFixed(places) === '0.0', `${e.claim} is written with its strength ${e.strength}`)
    assert.ok(!doc.includes(String(e.strength)) || Number.isInteger(e.strength), `${e.claim} is written with its strength ${e.strength}`)
  }
})

Given('I have written out what the agent has learned', function (this: DepWorld) {
  writeOut(this)
  this.notes.set('mine', (this.notes.get('report') as LearnedReport).path)
})

Given('I have changed the document by hand', function (this: DepWorld) {
  const { root } = learned(this)
  appendFileSync(join(root, this.notes.get('mine') as string), '\nThe convert advice is wrong for gold customers — ask me.\n')
})

When('I write out what the agent has learned again', function (this: DepWorld) {
  writeOut(this, this.notes.get('mine') as string)
})

Then('my changes are still there', function (this: DepWorld) {
  assert.ok(text(this).includes('ask me.'), 'the hand-written line is gone')
})

Then('I am told the document was changed by hand since it was written', function (this: DepWorld) {
  const report = this.notes.get('report') as LearnedReport
  assert.equal(report.changedByHand, true)
  assert.equal(report.written, false)
})
