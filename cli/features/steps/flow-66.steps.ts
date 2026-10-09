import { Given, When, Then, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import type { DepWorld } from '../support/world'
import { startConsole, type ConsoleServer } from '../../src/console/server'
import { describeGame } from '../../../packages/loop/src/game/room'
import { loadGame } from '../../../packages/loop/src/game/game'
import { judge } from '../../../packages/loop/src/game/suite'
import { findTemplate, ruleFor } from '../../../packages/loop/src/index'

const REPO = resolve(import.meta.dir, '..', '..', '..')
const NAMES = ['tester', 'react-component', 'code-reviewer', 'api-change']

After(async function (this: DepWorld) {
  const server = this.notes.get('templateConsole') as ConsoleServer | undefined
  if (server) await server.stop()
})

/** The project on disk; with Cucumber, its node_modules holds one the judge can run. */
async function project(world: DepWorld): Promise<string> {
  if (world.notes.get('ready')) return world.root
  await world.materialise()
  if (world.notes.get('cucumber') !== false && !existsSync(join(world.root, 'node_modules'))) {
    symlinkSync(join(REPO, 'packages/loop/node_modules'), join(world.root, 'node_modules'))
  }
  world.notes.set('ready', true)
  return world.root
}

async function console_(world: DepWorld): Promise<ConsoleServer> {
  const existing = world.notes.get('templateConsole') as ConsoleServer | undefined
  if (existing) return existing
  const server = await startConsole(await project(world), { port: 0 })
  world.notes.set('templateConsole', server)
  return server
}

async function start(world: DepWorld, template: string) {
  const root = await project(world)
  const cli = world.runCli(['game', 'new', '--template', template, '--json', '--root', root])
  const out = cli.stdout.trim() ? JSON.parse(cli.stdout) : {}
  world.notes.set('started', { ...out, code: cli.code })
  if (out.document) world.notes.set('document', out.document)
  world.notes.set('template', template)
  return out
}

const started = (world: DepWorld) => world.notes.get('started') as { code: number; document: string; files: string[]; playable: boolean; why: string | null; error?: string }
const gameDocument = (world: DepWorld) => readFileSync(join(world.root, world.notes.get('document') as string), 'utf-8')

Given('a project whose configuration turns the loop on, with Cucumber installed', function (this: DepWorld) {
  this.loop = { enabled: true }
  this.seedDefaultDocs()
  this.notes.set('cucumber', true)
})

Given('a project whose configuration turns the loop on, without Cucumber installed', function (this: DepWorld) {
  this.notes.set('cucumber', false)
})

When('I list the game templates', async function (this: DepWorld) {
  const cli = this.runCli(['game', 'templates', '--json', '--root', await project(this)])
  assert.equal(cli.code, 0, cli.stderr)
  this.notes.set('templates', JSON.parse(cli.stdout).templates)
})

Then('I see templates for a tester, a React component author, a code reviewer and an API author', function (this: DepWorld) {
  const templates = this.notes.get('templates') as Array<{ name: string }>
  assert.deepEqual(templates.map((t) => t.name), NAMES)
})

Then('each says what it teaches, its options, and how many levels it has', function (this: DepWorld) {
  for (const t of this.notes.get('templates') as Array<{ name: string; teaches: string; options: string[]; levels: number; dimensions: Array<{ values: string[] }> }>) {
    assert.ok(t.teaches.length > 30, `${t.name} does not say what it teaches`)
    assert.ok(t.options.length >= 4, `${t.name} offers too few options`)
    assert.equal(t.levels, t.dimensions.reduce((n, d) => n * d.values.length, 1), `${t.name}: one level per situation`)
  }
})

When('I start a game from the {string} template', async function (this: DepWorld, template: string) {
  await start(this, template)
})

When('I start a game from the {string} template again', async function (this: DepWorld, template: string) {
  await start(this, template)
})

Given('a game started from the {string} template', async function (this: DepWorld, template: string) {
  await start(this, template)
  assert.equal(started(this).code, 0, JSON.stringify(started(this)))
})

Then("the project has the game's document, its scenarios and its judge", function (this: DepWorld) {
  const s = started(this)
  assert.equal(s.code, 0, JSON.stringify(s))
  for (const f of [s.document, ...s.files]) assert.ok(existsSync(join(this.root, f)), `${f} was not written`)
  assert.ok(s.files.some((f) => f.endsWith('.feature')) && s.files.some((f) => f.endsWith('.steps.ts')))
})

Then('the game passes every check and can be played', function (this: DepWorld) {
  const game = describeGame(this.root, started(this).document)
  assert.ok(game.checks.every((c) => c.passed), JSON.stringify(game.checks))
  assert.equal(game.playable, true)
})

Then('the game document states the policy its judge holds', function (this: DepWorld) {
  const template = findTemplate(this.notes.get('template') as string)
  const stated = describeGame(this.root, started(this).document).policy.map((p) => p.then.replace(/`/g, ''))
  assert.deepEqual(stated, [...template.rules.map((r) => r.then), template.otherwise.then])
  assert.ok(describeGame(this.root, started(this).document).policy.every((p) => p.when.length > 0))
})

/** Answer every level of the started game, then let its judge rule. */
function answerAll(world: DepWorld, choose: (situation: Record<string, string>) => string) {
  const name = world.notes.get('template') as string
  const { game, levels } = loadGame(join(world.root, started(world).document), world.root)
  const dir = join(game.arena, 'choices')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  for (const level of levels) {
    writeFileSync(join(dir, `${level.id.replace(/[^A-Za-z0-9]+/g, '_')}.json`), JSON.stringify({ option: choose(level.key.features as Record<string, string>) }))
  }
  const verdicts = judge(world.root, game, levels)
  return { name, total: levels.length, passed: [...verdicts.values()].filter((v) => v === 'passed').length }
}

When('every level is answered the way the stated policy says', function (this: DepWorld) {
  const template = findTemplate(this.notes.get('template') as string)
  this.notes.set('verdict', answerAll(this, (s) => ruleFor(template, s).then))
})

Then('every level passes', function (this: DepWorld) {
  const v = this.notes.get('verdict') as { passed: number; total: number }
  assert.equal(v.passed, v.total)
})

Then('answering every level with the same option does not', function (this: DepWorld) {
  const template = findTemplate(this.notes.get('template') as string)
  for (const option of template.options) {
    const v = answerAll(this, () => option)
    assert.ok(v.passed < v.total, `always choosing ${option} passes every level: the game teaches nothing`)
  }
})

When('I ask the console for the game templates', async function (this: DepWorld) {
  const server = await console_(this)
  const reply = await fetch(new URL('/api/games/templates', server.url))
  assert.equal(reply.status, 200)
  this.notes.set('templates', (await reply.json() as { templates: unknown[] }).templates)
})

When('I start a game from the {string} template from the console', async function (this: DepWorld, template: string) {
  const server = await console_(this)
  const reply = await fetch(new URL('/api/games/new', server.url), {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ template }),
  })
  this.notes.set('created', { status: reply.status, body: await reply.json() })
})

Then('the console lists the new game, and it can be played', async function (this: DepWorld) {
  assert.equal((this.notes.get('templates') as unknown[]).length, NAMES.length)
  const created = this.notes.get('created') as { status: number; body: any }
  assert.equal(created.status, 200, JSON.stringify(created.body))
  const server = await console_(this)
  const games = (await (await fetch(new URL('/api/games', server.url))).json() as { games: Array<{ id: string; playable: boolean }> }).games
  const game = games.find((g) => g.id === 'game.tester')
  assert.ok(game, 'the new game is not listed')
  assert.equal(game.playable, true)
})

Given('its policy has been changed by hand', function (this: DepWorld) {
  const changed = gameDocument(this).replace('| When | Then |', '| When (as our team decided) | Then |')
  writeFileSync(join(this.root, this.notes.get('document') as string), changed)
  this.notes.set('changed', changed)
})

Then('I am told the game already exists', function (this: DepWorld) {
  const s = started(this)
  assert.notEqual(s.code, 0)
  assert.match(s.error ?? '', /already exists/)
})

Then('the changed policy is kept', function (this: DepWorld) {
  assert.equal(gameDocument(this), this.notes.get('changed'))
})

Then('I am told there is no such template, with the list of templates', function (this: DepWorld) {
  const s = started(this)
  assert.notEqual(s.code, 0)
  assert.match(s.error ?? '', new RegExp(`no "poet" template; there are: ${NAMES.join(', ')}`))
})

Then('no game is written', function (this: DepWorld) {
  assert.equal(existsSync(join(this.root, 'games')), false, 'an arena was written')
  assert.equal(existsSync(join(this.root, 'docs', 'games')), false, 'a game document was written')
})

Then('the game cannot be played, because its judge cannot be run', function (this: DepWorld) {
  const s = started(this)
  assert.equal(s.code, 0, 'the game was not started at all')
  assert.equal(s.playable, false)
  assert.match(s.why ?? '', /judge cannot be run/)
})

Then('I am told how to install what the judge needs', function (this: DepWorld) {
  assert.match(started(this).why ?? '', /bun add -d @cucumber\/cucumber/)
})

When('a page from another site tries to start a game from the {string} template', async function (this: DepWorld, template: string) {
  const server = await console_(this)
  this.result = await fetch(new URL('/api/games/new', server.url), {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://docs.example.com' }, body: JSON.stringify({ template }),
  })
})
