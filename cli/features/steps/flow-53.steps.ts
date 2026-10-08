import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { appendFileSync, cpSync, existsSync, mkdtempSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { SCRATCH, type DepWorld } from '../support/world'
import { openDocumentationSet, DepError, type DocumentationSet, type Proposal } from '../../src/lib'
import { startConsole, type ConsoleServer } from '../../src/console/server'
import { Store, loadGame, renderLearned, writeLearned } from '../../../packages/loop/src/index'
import { play, GAME_DOC } from './flow-51.steps'

const LEARNED = 'docs/reference/what-the-agent-learned.md'
const OUTSIDE = '../outside-what-the-agent-learned.md'

const root = (world: DepWorld) => world.notes.get('root53') as string
const set = (world: DepWorld) => world.notes.get('set53') as DocumentationSet
const proposed = (world: DepWorld) => world.notes.get('proposed') as string
const onDisk = (world: DepWorld) => readFileSync(join(root(world), LEARNED), 'utf-8')

async function decide(world: DepWorld, decision: 'accept' | 'reject', headers: Record<string, string> = {}): Promise<Response> {
  const server = world.notes.get('console') as ConsoleServer
  const reply = await fetch(new URL('/api/proposals', server.url), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ document: LEARNED, decision }),
  })
  world.result = reply
  return reply
}

Given('the agent has proposed what it learned', async function (this: DepWorld) {
  const played = await play(this)
  // each scenario reviews in its own copy of the played project
  const dir = mkdtempSync(join(SCRATCH, 'review-'))
  cpSync(played.root, dir, { recursive: true, filter: (src) => !src.includes('.dep-proposals') && !src.endsWith('.dep-trace.jsonl') })
  const loaded = loadGame(join(dir, GAME_DOC), dir)

  // what it had learned halfway through has already landed; what it knows now is proposed
  const earlier = Store.rebuild(played.store.log.slice(0, Math.floor(played.store.log.length / 2)))
  writeLearned({ store: earlier, loaded, root: dir, path: LEARNED })
  const now = renderLearned({ store: played.store, loaded, root: dir, path: LEARNED })
  assert.ok(now.text, 'the agent had nothing new to propose')

  const docs = openDocumentationSet(dir)
  docs.propose(LEARNED, now.text!, { from: `loop: ${loaded.game.id}` })
  const server = await startConsole(dir, { port: 0 })
  const servers = (this.notes.get('servers') as ConsoleServer[] | undefined) ?? []
  servers.push(server)
  this.notes.set('servers', servers)
  this.notes.set('console', server)
  this.notes.set('root53', dir)
  this.notes.set('set53', docs)
  this.notes.set('proposed', now.text)
  this.notes.set('earlier', onDisk(this))
})

Then('the documentation set does not contain it yet', function (this: DepWorld) {
  assert.notEqual(onDisk(this), proposed(this), 'what was proposed is already in the documentation')
  assert.equal(onDisk(this), this.notes.get('earlier'), 'the document is not the one that was there before')
})

Then('it is waiting for review, with who proposed it', function (this: DepWorld) {
  const waiting = set(this).proposals()
  assert.equal(waiting.length, 1)
  assert.equal(waiting[0]!.document, LEARNED)
  assert.equal(waiting[0]!.from, 'loop: game.requests')
})

When('I ask the console what is waiting for review', async function (this: DepWorld) {
  const server = this.notes.get('console') as ConsoleServer
  const reply = await fetch(new URL('/api/proposals', server.url))
  assert.equal(reply.status, 200)
  this.result = await reply.json()
})

Then('I see the document as it is now and as it would be', function (this: DepWorld) {
  const { proposals } = this.result as { proposals: Proposal[] }
  const p = proposals.find((x) => x.document === LEARNED)
  assert.ok(p, JSON.stringify(proposals.map((x) => x.document)))
  assert.equal(p!.current, this.notes.get('earlier'))
  assert.equal(p!.proposed, proposed(this))
  assert.equal(p!.changedSince, false)
})

When('I accept the proposal from the console', async function (this: DepWorld) {
  await decide(this, 'accept')
})

When('I reject the proposal from the console', async function (this: DepWorld) {
  const reply = await decide(this, 'reject')
  assert.equal(reply.status, 200, await reply.clone().text())
})

Then('the documentation set contains what it learned', function (this: DepWorld) {
  const reply = this.result as Response
  assert.equal(reply.status, 200)
  assert.equal(onDisk(this), proposed(this))
  set(this).refresh()
  this.result = set(this).validate()
  this.notes.set('report', { path: LEARNED })
})

Then('nothing is waiting for review', function (this: DepWorld) {
  assert.deepEqual(set(this).proposals().map((p) => p.document), [])
})

Given('the document it would replace was changed after it was proposed', function (this: DepWorld) {
  appendFileSync(join(root(this), LEARNED), '\nThe refuse advice is too narrow — ask me.\n')
})

Then('I am told the document changed since it was proposed', async function (this: DepWorld) {
  const reply = this.result as Response
  assert.equal(reply.status, 409)
  const body = await reply.json() as { error: string }
  assert.match(body.error, /changed after this was proposed/)
})

Then('the changed document is still there', function (this: DepWorld) {
  assert.ok(onDisk(this).includes('ask me.'), 'the change was overwritten')
})

Then('the proposal is still waiting for review', function (this: DepWorld) {
  assert.deepEqual(set(this).proposals().map((p) => p.document), [LEARNED])
})

When('something proposes a document outside the project', function (this: DepWorld) {
  try {
    set(this).propose(OUTSIDE, '# not ours\n', { from: 'loop' })
  } catch (err) {
    this.error = err
  }
})

Then('the proposal is refused', function (this: DepWorld) {
  assert.ok(this.error instanceof DepError, 'the proposal was accepted')
  assert.equal((this.error as DepError).code, 'OUTSIDE_SET')
})

Then('nothing outside the project was written', function (this: DepWorld) {
  assert.equal(existsSync(resolve(root(this), OUTSIDE)), false)
  assert.ok(set(this).proposals().every((p) => p.document === LEARNED))
})

When('a page from another site tries to accept the proposal', async function (this: DepWorld) {
  await decide(this, 'accept', { origin: 'https://docs.example.com' })
})
