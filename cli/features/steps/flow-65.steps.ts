import { Given, When, Then, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import type { DepWorld } from '../support/world'
import { startConsole, type ConsoleServer } from '../../src/console/server'

const REPO = resolve(import.meta.dir, '..', '..', '..')
const ARENA = 'packages/loop/arenas/doc-maintenance/arena'
const GAME = 'docs/games/doc-maintenance.md'
const DRAFT = 'docs/games/draft.md'

After(async function (this: DepWorld) {
  const server = this.notes.get('gameConsole') as ConsoleServer | undefined
  if (server) await server.stop()
})

/** The project, with the real doc-maintenance arena and game document in it, and a console on it. */
async function console_(world: DepWorld): Promise<ConsoleServer> {
  const existing = world.notes.get('gameConsole') as ConsoleServer | undefined
  if (existing) return existing
  await world.materialise()
  cpSync(join(REPO, ARENA, 'features'), join(world.root, ARENA, 'features'), { recursive: true })
  cpSync(join(REPO, ARENA, 'steps'), join(world.root, ARENA, 'steps'), { recursive: true })
  if (!existsSync(join(world.root, 'packages/loop/node_modules'))) symlinkSync(join(REPO, 'packages/loop/node_modules'), join(world.root, 'packages/loop/node_modules'))
  mkdirSync(join(world.root, 'docs/games'), { recursive: true })
  writeFileSync(join(world.root, GAME), readFileSync(join(REPO, GAME), 'utf-8'))
  if (world.notes.get('withDraft')) {
    const draftArena = 'packages/loop/arenas/draft/arena'
    cpSync(join(REPO, ARENA, 'features'), join(world.root, draftArena, 'features'), { recursive: true })
    writeFileSync(join(world.root, DRAFT), readFileSync(join(REPO, GAME), 'utf-8')
      .replace('id: game.doc-maintenance', 'id: game.draft').split(ARENA).join(draftArena))
  }
  world.set?.refresh()
  const server = await startConsole(world.root, { port: 0 })
  world.notes.set('gameConsole', server)
  return server
}

async function call(world: DepWorld, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<{ status: number; body: any }> {
  const server = await console_(world)
  const reply = await fetch(new URL(path, server.url), body === undefined ? undefined : {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
  })
  return { status: reply.status, body: await reply.json() }
}

const ok = (r: { status: number; body: any }) => { assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body }
const gameDoc = (world: DepWorld) => readFileSync(join(world.root, GAME), 'utf-8')
/** The agent's memory of the game: a hash-chained log, so what it knew is a prefix of what it knows. */
const memory = (world: DepWorld) => (JSON.parse(readFileSync(join(world.root, '.dep-loop/game.doc-maintenance/log.json'), 'utf-8')) as Array<{ hash: string }>).map((e) => e.hash)

Given('a project whose configuration turns the loop on, with the doc-maintenance game', function (this: DepWorld) {
  this.loop = { enabled: true }
  this.seedDefaultDocs()
})

Given('the project turns the loop off', function (this: DepWorld) {
  this.loop = null
})

Given('a draft game whose judge has not been written', function (this: DepWorld) {
  this.notes.set('withDraft', true)
})

When('I ask the console for the games', async function (this: DepWorld) {
  this.result = await call(this, '/api/games')
})

const listed = (world: DepWorld, document: string) => {
  const game = (ok(world.result as any).games as any[]).find((g) => g.document === document)
  assert.ok(game, `${document} is not listed`)
  return game
}

Then('I see the doc-maintenance game with its levels, options and situation', function (this: DepWorld) {
  const game = listed(this, GAME)
  assert.equal(game.id, 'game.doc-maintenance')
  assert.equal(game.levels, 135)
  assert.deepEqual(game.options, ['review', 'bump', 'propose-fix', 'skip'])
  assert.deepEqual(Object.keys(game.situation), ['type', 'lifecycle', 'deps', 'confidence'])
})

Then('I see it passes every check and can be played', function (this: DepWorld) {
  const game = listed(this, GAME)
  assert.ok(game.checks.every((c: any) => c.passed), JSON.stringify(game.checks))
  assert.equal(game.playable, true)
  assert.ok(game.judge.some((f: string) => f.endsWith('maintenance.steps.ts')))
})

When("I ask the console for the doc-maintenance game's levels", async function (this: DepWorld) {
  this.result = await call(this, `/api/games/levels?document=${encodeURIComponent(GAME)}`)
})

Then('I see every level with the situation it is read as', function (this: DepWorld) {
  const levels = ok(this.result as any).levels as any[]
  assert.equal(levels.length, 135)
  assert.deepEqual(Object.keys(levels[0].situation).sort(), ['confidence', 'deps', 'lifecycle', 'type'])
})

Then("I see what each level's scenario expects", function (this: DepWorld) {
  const levels = ok(this.result as any).levels as any[]
  const changed = levels.find((l) => l.situation.deps === 'changed')
  const stale = levels.find((l) => l.situation.deps === 'none' && l.situation.lifecycle === 'STALE')
  assert.equal(changed.expected, 'propose-fix')
  assert.equal(stale.expected, 'review')
})

When('I play a day of the doc-maintenance game from the console', async function (this: DepWorld) {
  this.result = await call(this, '/api/games/play', { document: GAME })
})

Given('a day of the doc-maintenance game has been played from the console', async function (this: DepWorld) {
  this.notes.set('firstDay', ok(await call(this, '/api/games/play', { document: GAME })))
  this.notes.set('firstMemory', memory(this))
})

When('I play another day from the console', async function (this: DepWorld) {
  this.result = await call(this, '/api/games/play', { document: GAME })
})

Then('every level it played was judged, and the day says how many passed', function (this: DepWorld) {
  const day = ok(this.result as any)
  assert.equal(day.day, 0)
  assert.equal(day.passed + day.failed + day.void, 40)
  assert.equal(day.void, 0)
  assert.ok(day.passed > 0 && day.failed > 0, JSON.stringify(day))
})

Then('what the agent learned is written for the Loop tab', async function (this: DepWorld) {
  const learned = ok(await call(this, '/api/learned'))
  assert.equal(learned.game, 'game.doc-maintenance')
  assert.equal(learned.runs[0].passRates.length, 1)
})

Then('it is the second day, and the agent remembers the first', async function (this: DepWorld) {
  const second = ok(this.result as any)
  const first = this.notes.get('firstDay') as { claims: number }
  assert.equal(second.day, 1)
  assert.ok(first.claims > 0, 'the first day taught nothing')
  const before = this.notes.get('firstMemory') as string[]
  const after = memory(this)
  assert.ok(after.length > before.length, 'the second day added nothing to memory')
  assert.deepEqual(after.slice(0, before.length), before, 'the second day started from an empty memory')
  const game = (ok(await call(this, '/api/games')).games as any[]).find((g) => g.document === GAME)
  assert.equal(game.days.length, 2)
})

When("I change the game's options from the console to ones it can learn", async function (this: DepWorld) {
  this.result = await call(this, '/api/games/rules', { document: GAME, options: ['review', 'bump', 'propose-fix', 'skip', 'archive'] })
})

When("I change the game's options from the console to ones it cannot learn", async function (this: DepWorld) {
  await console_(this)
  this.notes.set('before', gameDoc(this))
  this.result = await call(this, '/api/games/rules', { document: GAME, options: ['Review It!', 'bump'] })
})

Then('the game document has the new options', function (this: DepWorld) {
  ok(this.result as any)
  assert.match(gameDoc(this), /options: \[ review, bump, propose-fix, skip, archive \]|- archive/)
})

Then('the game still passes every check', function (this: DepWorld) {
  const game = ok(this.result as any)
  assert.ok(game.checks.every((c: any) => c.passed), JSON.stringify(game.checks))
  assert.ok(game.options.includes('archive'))
})

Then('I am told why the change was refused', function (this: DepWorld) {
  const r = this.result as { status: number; body: any }
  assert.equal(r.status, 409)
  assert.match(r.body.error, /"Review It!" cannot be learned/)
})

Then('the game document is unchanged', function (this: DepWorld) {
  assert.equal(gameDoc(this), this.notes.get('before'))
})

Then('I see the draft cannot be played, because its judge is missing', function (this: DepWorld) {
  const draft = listed(this, DRAFT)
  assert.equal(draft.playable, false)
  assert.match(draft.why, /judge's steps are missing/)
  assert.equal(draft.checks.find((c: any) => c.code === 'JUDGE').passed, false)
})

Then('playing a day of it is refused with that reason', async function (this: DepWorld) {
  const r = await call(this, '/api/games/play', { document: DRAFT })
  assert.equal(r.status, 409)
  assert.match(r.body.error, /judge's steps are missing/)
})

When('a page from another site tries to play a day and change the rules', async function (this: DepWorld) {
  await console_(this)
  this.notes.set('before', gameDoc(this))
  const evil = { origin: 'https://docs.example.com' }
  this.notes.set('refused', [
    await call(this, '/api/games/play', { document: GAME }, evil),
    await call(this, '/api/games/rules', { document: GAME, options: ['skip'] }, evil),
  ])
})

Then('both are refused', function (this: DepWorld) {
  for (const r of this.notes.get('refused') as Array<{ status: number }>) assert.equal(r.status, 403)
})

Then('no day was played and the game document is unchanged', function (this: DepWorld) {
  assert.equal(existsSync(join(this.root, '.dep-loop')), false)
  assert.equal(gameDoc(this), this.notes.get('before'))
})

Then('the console says it does not serve them', function (this: DepWorld) {
  assert.equal((this.result as { status: number }).status, 404)
})
