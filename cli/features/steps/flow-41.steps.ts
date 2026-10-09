import { Given, When, Then, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { DepWorld, DEFAULT_QUESTION, freshnessBody, daysAgo } from '../support/world'
import { openDocumentationSet } from '../../src/lib'
import { startConsole } from '../../src/console/server'
import type { ConsoleServer } from '../../src/console/server'

const ADDED = 'docs/reference/added-later.md'

function running(world: DepWorld): ConsoleServer {
  return world.notes.get('console') as ConsoleServer
}

async function get(world: DepWorld, path: string): Promise<Response> {
  return fetch(new URL(path, running(world).url))
}

async function json(world: DepWorld, path: string): Promise<any> {
  const reply = await get(world, path)
  assert.equal(reply.status, 200, `${path} answered ${reply.status}`)
  return reply.json()
}

async function open(world: DepWorld, options: { port?: number } = {}): Promise<ConsoleServer> {
  await world.materialise()
  const server = await startConsole(world.root, options)
  const open = (world.notes.get('servers') as ConsoleServer[] | undefined) ?? []
  open.push(server)
  world.notes.set('servers', open)
  world.notes.set('console', server)
  return server
}

After(async function (this: DepWorld) {
  for (const server of (this.notes.get('servers') as ConsoleServer[] | undefined) ?? []) {
    try { await server.stop() } catch {}
  }
})

When('I start a console for the project', async function (this: DepWorld) {
  this.result = await open(this, { port: 0 })
})

When('I start a console without naming a port', async function (this: DepWorld) {
  this.result = await open(this)
})

Given('a running console', async function (this: DepWorld) {
  await open(this, { port: 0 })
})

Then('I am told where to open it', function (this: DepWorld) {
  const server = this.result as ConsoleServer
  const url = new URL(server.url)
  assert.equal(url.protocol, 'http:')
  assert.ok(Number(url.port) > 0, server.url)
})

Then('I am told which port it took', function (this: DepWorld) {
  const server = this.result as ConsoleServer
  assert.ok(server.port > 0)
  assert.ok(server.url.includes(String(server.port)))
})

Then('opening it gives me the console', async function (this: DepWorld) {
  const reply = await get(this, '/')
  assert.equal(reply.status, 200)
  assert.ok((reply.headers.get('content-type') ?? '').includes('text/html'))
  const page = await reply.text()
  assert.ok(page.includes('<title>'), 'not a page')
  assert.ok(/dep/i.test(page), 'the page does not name the project')
})

// ── the graph ───────────────────────────────────────────────────────────

When('I ask it for the graph', async function (this: DepWorld) {
  this.result = await json(this, '/api/graph')
})

Then('I am given every document in the set', function (this: DepWorld) {
  const graph = this.result as { nodes: Array<{ path: string }> }
  const served = new Set(graph.nodes.map((n) => n.path))
  for (const path of this.docs.keys()) assert.ok(served.has(path), `${path} is missing`)
  assert.equal(served.size, this.docs.size)
})

Then('each one carries its type, its lifecycle and its links', function (this: DepWorld) {
  const graph = this.result as { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> }
  for (const node of graph.nodes) {
    assert.ok(typeof node.type === 'string' && node.type, JSON.stringify(node))
    assert.ok(['FRESH', 'AGING', 'STALE'].includes(String(node.lifecycle)), JSON.stringify(node))
    assert.equal(typeof node.inbound, 'number')
    assert.equal(typeof node.outbound, 'number')
  }
  for (const edge of graph.edges) {
    assert.ok(typeof edge.source === 'string' && typeof edge.target === 'string' && typeof edge.rel === 'string')
  }
})

// ── health ──────────────────────────────────────────────────────────────

When('I ask it how the set validates', async function (this: DepWorld) {
  this.result = await json(this, '/api/validate')
})

Then('I am given a verdict for every document and for the set as a whole', function (this: DepWorld) {
  const report = this.result as { documents: Array<{ path: string; status: string }>; graph: Array<{ name: string; passed: boolean }> }
  assert.equal(report.documents.length, this.docs.size)
  for (const doc of report.documents) assert.ok(['PASS', 'WARN', 'FAIL'].includes(doc.status), JSON.stringify(doc))
  assert.ok(report.graph.length > 0, 'no verdict on the set as a whole')
})

// ── one document ────────────────────────────────────────────────────────

When('I ask it for a document in the set', async function (this: DepWorld) {
  this.subject = 'docs/explanation/freshness.md'
  this.result = await json(this, `/api/document?path=${encodeURIComponent(this.subject)}`)
})

Then("I am given that document's metadata, its freshness and what links to it", function (this: DepWorld) {
  const doc = this.result as Record<string, any>
  assert.equal(doc.path, this.subject)
  assert.equal(doc.type, 'explanation')
  assert.ok(doc.owner, 'no owner')
  assert.ok(['fresh', 'aging', 'stale', 'unknown'].includes(doc.freshness?.state), JSON.stringify(doc.freshness))
  assert.ok(Array.isArray(doc.backlinks), 'no backlinks')
  assert.ok(Array.isArray(doc.forwardLinks), 'no forward links')
  assert.ok(typeof doc.content === 'string' && doc.content.length > 0, 'no content')
})

When('I ask it for a document that is not in the set', async function (this: DepWorld) {
  this.result = await get(this, '/api/document?path=docs/reference/no-such-document.md')
})

Then('I am told it is not a document in the set', async function (this: DepWorld) {
  const reply = this.result as Response
  assert.equal(reply.status, 404)
  const body = await reply.json() as { error: string }
  assert.ok(/not a document in the set/i.test(body.error), JSON.stringify(body))
})

// ── the record of requests ──────────────────────────────────────────────

Given('an agent has asked the set a question', async function (this: DepWorld) {
  await this.materialise()
  const agent = openDocumentationSet(this.root, { now: () => this.now, caller: 'an-agent' })
  this.extraSets.push(agent)
  const bundle = await agent.context(DEFAULT_QUESTION, { budget: 2000 })
  this.notes.set('askedId', bundle.id)
  agent.close()
})

When('I ask it for the record of requests', async function (this: DepWorld) {
  this.result = await json(this, '/api/trace')
})

Then('I am given that request, with what it offered and who asked for it', function (this: DepWorld) {
  const record = this.result as { entries: Array<Record<string, any>> }
  const entry = record.entries.find((e) => e.id === this.notes.get('askedId'))
  assert.ok(entry, `the request is not in ${JSON.stringify(record.entries.map((e) => e.id))}`)
  assert.equal(entry!.caller, 'an-agent')
  assert.equal(entry!.question, DEFAULT_QUESTION)
  assert.ok(entry!.offered.length > 0, 'nothing was recorded as offered')
  assert.ok(entry!.offered.every((p: Record<string, unknown>) => typeof p.document === 'string' && typeof p.reason === 'string'))
})

// ── keeping up ──────────────────────────────────────────────────────────

When('a document is added to the project', async function (this: DepWorld) {
  this.addDoc({ path: ADDED, type: 'reference', title: 'Added later', body: freshnessBody('This document arrived while the console was running.') })
  this.writeDoc(this.docs.get(ADDED)!)
})

Then('the console serves the new document without being restarted', async function (this: DepWorld) {
  const deadline = Date.now() + 5000
  let paths: string[] = []
  while (Date.now() < deadline) {
    const graph = await json(this, '/api/graph') as { nodes: Array<{ path: string }> }
    paths = graph.nodes.map((n) => n.path)
    if (paths.includes(ADDED)) return
    await new Promise((r) => setTimeout(r, 100))
  }
  assert.fail(`the console never noticed ${ADDED}; it serves ${JSON.stringify(paths)}`)
})

// ── ports ───────────────────────────────────────────────────────────────

When('I start another console on the same port', async function (this: DepWorld) {
  this.error = undefined
  try {
    await open(this, { port: running(this).port })
  } catch (err) {
    this.error = err
  }
})

Then('I am told that port is already taken', function (this: DepWorld) {
  assert.ok(this.error, 'a second console took the same port')
  assert.ok(/already (taken|in use)/i.test(this.errorMessage()), this.errorMessage())
})

Then('the console that was already running still answers', async function (this: DepWorld) {
  const servers = this.notes.get('servers') as ConsoleServer[]
  const first = servers[0]!
  const reply = await fetch(new URL('/api/graph', first.url))
  assert.equal(reply.status, 200)
})

// ── only this machine ───────────────────────────────────────────────────

Then('it accepts connections only from this machine', function (this: DepWorld) {
  const server = running(this)
  assert.equal(server.hostname, '127.0.0.1', server.hostname)
  assert.ok(server.url.startsWith('http://127.0.0.1:'), server.url)
})

When('I ask it for a file outside the project', async function (this: DepWorld) {
  writeFileSync(join(this.root, '..', 'outside-the-project.txt'), 'a secret')
  this.result = await get(this, '/api/document?path=../outside-the-project.txt')
})

Then('the console refuses it', function (this: DepWorld) {
  const reply = this.result as Response
  assert.ok(reply.status === 400 || reply.status === 404, `answered ${reply.status}`)
})

Then('the file is not served', async function (this: DepWorld) {
  const reply = this.result as Response
  const body = await reply.text()
  assert.ok(!body.includes('a secret'), 'the file was served')
})

// ── procedures ──────────────────────────────────────────────────────────

When('I ask it for the procedures', async function (this: DepWorld) {
  this.result = await json(this, '/api/procedures')
})

Then('I am given each procedure, its steps and where it hands off to', function (this: DepWorld) {
  const payload = this.result as { trees: Array<Record<string, any>> }
  assert.ok(payload.trees.length > 0, 'no procedures were served')
  for (const tree of payload.trees) {
    assert.ok(tree.id && tree.trigger && tree.entry, JSON.stringify(tree))
    assert.ok(Array.isArray(tree.steps) && tree.steps.length > 0, `${tree.id} has no steps`)
    assert.ok(Array.isArray(tree.handsOffTo), `${tree.id} does not say where it hands off`)
    for (const step of tree.steps) {
      assert.ok(step.id, JSON.stringify(step))
      assert.ok(['observe', 'decide', 'act', 'delegate'].includes(step.type), JSON.stringify(step))
    }
  }
})

// ── the console does not disturb what it watches ────────────────────────

When('I leave the console running and watch the record', async function (this: DepWorld) {
  this.notes.set('before', (await json(this, '/api/trace')).entries.length)
  for (let i = 0; i < 4; i++) {
    await json(this, '/api/graph')
    await json(this, '/api/validate')
    await json(this, '/api/trace')
  }
  this.result = await json(this, '/api/trace')
})

Then('it still holds only what the agents asked for', function (this: DepWorld) {
  const record = this.result as { entries: Array<Record<string, any>> }
  assert.equal(record.entries.length, this.notes.get('before'))
  assert.ok(record.entries.length > 0, 'the agent request vanished too')
})

Then('nothing the console itself asked for is in it', function (this: DepWorld) {
  const record = this.result as { entries: Array<Record<string, any>> }
  for (const entry of record.entries) assert.notEqual(entry.caller, 'console')
})

Given("a document past its review date that answers the agent's question", function (this: DepWorld) {
  if (this.docs.size === 0) this.seedDefaultDocs()
  this.docs.get('docs/reference/lifecycle-states.md')!.lastVerified = daysAgo(400, this.now)
})

Then('I am given what was kept from the agent, because it is past its review date', function (this: DepWorld) {
  const record = this.result as { entries: Array<Record<string, any>> }
  const entry = record.entries.find((e) => e.id === this.notes.get('askedId'))!
  const kept = (entry.withheld ?? []) as Array<{ document: string; reason: string; lastVerified: string | null }>
  const stale = kept.find((w) => w.document === 'docs/reference/lifecycle-states.md')
  assert.ok(stale, `nothing was recorded as kept from the agent: ${JSON.stringify(entry.withheld)}`)
  assert.equal(stale!.reason, 'stale')
  assert.ok(stale!.lastVerified, 'the record does not say when it was last verified')
})
