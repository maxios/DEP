import { Given, When, Then, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { DepWorld, DEFAULT_QUESTION } from '../support/world'
import { McpClient } from '../support/mcp-client'
import type { TraceEntry } from '../../src/lib'

const AWKWARD = 'a client\n{"t":"req"} "quoted"'

function clients(world: DepWorld): Map<string, McpClient> {
  let open = world.notes.get('clients') as Map<string, McpClient> | undefined
  if (!open) {
    open = new Map()
    world.notes.set('clients', open)
  }
  return open
}

async function connect(world: DepWorld, name: string | null): Promise<McpClient> {
  await world.materialise()
  const client = new McpClient(world.root)
  await client.initialize(name)
  clients(world).set(name ?? '(unnamed)', client)
  world.notes.set('lastClient', client)
  return client
}

function record(world: DepWorld): TraceEntry[] {
  return world.set!.traceReport().entries
}

After(function (this: DepWorld) {
  for (const client of clients(this).values()) client.close()
})

Given('an agent client that calls itself {string}', async function (this: DepWorld, name: string) {
  await connect(this, name)
})

Given('another agent client that calls itself {string}', async function (this: DepWorld, name: string) {
  await connect(this, name)
})

Given('an agent client that does not name itself', async function (this: DepWorld) {
  await connect(this, null)
})

Given('an agent client whose name contains a newline and a quote', async function (this: DepWorld) {
  await connect(this, AWKWARD)
})

When('it asks for context', async function (this: DepWorld) {
  const client = this.notes.get('lastClient') as McpClient
  const reply = await client.call('dep_context', { question: DEFAULT_QUESTION, budget: 2000 })
  assert.ok(!reply.error, JSON.stringify(reply.error))
})

When('each of them asks for context', async function (this: DepWorld) {
  for (const [name, client] of clients(this)) {
    const reply = await client.call('dep_context', { question: `${DEFAULT_QUESTION} for ${name}`, budget: 2000 })
    assert.ok(!reply.error, JSON.stringify(reply.error))
  }
})

When('I ask for context from the command line', async function (this: DepWorld) {
  await this.materialise()
  await connect(this, 'desktop-client')
  const client = this.notes.get('lastClient') as McpClient
  await client.call('dep_context', { question: DEFAULT_QUESTION, budget: 2000 })
  const run = await this.runCliAsync(['context', DEFAULT_QUESTION, '--budget', '2000', '--root', this.root])
  assert.equal(run.code, 0, run.stderr)
})

Then('the record attributes the request to {string}', function (this: DepWorld, name: string) {
  const callers = record(this).map((e) => e.caller)
  assert.ok(callers.includes(name), `${name} is not among ${JSON.stringify(callers)}`)
})

Then('I can read back what {string} asked for on its own', function (this: DepWorld, name: string) {
  const only = this.set!.traceReport({ caller: name })
  assert.ok(only.entries.length > 0, `nothing recorded for ${name}`)
  this.notes.set('only', only.entries)
})

Then('nothing {string} asked for is among it', function (this: DepWorld, other: string) {
  for (const entry of this.notes.get('only') as TraceEntry[]) {
    assert.notEqual(entry.caller, other)
    assert.ok(!entry.question.includes(other), `${other}'s question leaked into the other consumer's requests`)
  }
})

Then('the record attributes the request to the command line', function (this: DepWorld) {
  const callers = record(this).map((e) => e.caller)
  assert.ok(callers.some((c) => c.startsWith('cli')), `no command-line request among ${JSON.stringify(callers)}`)
})

Then('it is told apart from what an agent client asked for', function (this: DepWorld) {
  const callers = new Set(record(this).map((e) => e.caller))
  assert.ok(callers.size >= 2, `everything was attributed to ${JSON.stringify([...callers])}`)
  assert.ok([...callers].some((c) => c.startsWith('cli')))
  assert.ok(callers.has('desktop-client'))
})

Then('the request is in the record', function (this: DepWorld) {
  assert.equal(record(this).length, 1, JSON.stringify(record(this).map((e) => e.caller)))
})

Then('it is attributed to an unnamed consumer', function (this: DepWorld) {
  const [entry] = record(this)
  assert.ok(entry, 'nothing was recorded')
  assert.ok(entry!.caller.length > 0, 'the consumer has no name at all')
  assert.ok(!entry!.caller.includes('undefined'), entry!.caller)
})

Then('the record still reads back as one request', function (this: DepWorld) {
  assert.equal(record(this).length, 1, `the record was torn into ${record(this).length} entries`)
})

Then('the name is kept exactly as the client gave it', function (this: DepWorld) {
  const [entry] = record(this)
  assert.ok(entry!.caller.includes(AWKWARD), JSON.stringify(entry!.caller))
})
