import { When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { DepWorld, DEFAULT_QUESTION } from '../support/world'
import { openDocumentationSet } from '../../src/lib'
import type { McpClient } from '../support/mcp-client'
import type { TraceEntry } from '../../src/lib'

function client(world: DepWorld): McpClient {
  return world.notes.get('lastClient') as McpClient
}

function payload(reply: { result?: any }): any {
  const text = reply.result?.content?.[0]?.text
  return typeof text === 'string' ? JSON.parse(text) : reply.result
}

function record(world: DepWorld): TraceEntry[] {
  const reader = openDocumentationSet(world.root, { now: () => world.now, trace: { record: false } })
  world.extraSets.push(reader)
  return reader.traceReport().entries
}

async function askOverMcp(world: DepWorld): Promise<any> {
  const reply = await client(world).call('dep_context', { question: DEFAULT_QUESTION, budget: 2000 })
  assert.ok(!reply.error, JSON.stringify(reply.error))
  const bundle = payload(reply)
  assert.ok(bundle.id, 'the answer carries no request id to report against')
  assert.ok(bundle.passages.length > 1, 'the fixture offered too little to pass anything over')
  world.notes.set('bundle', bundle)
  return bundle
}

When('it asks for context and reports which passages it used', async function (this: DepWorld) {
  const bundle = await askOverMcp(this)
  const used = [bundle.passages[0].id]
  this.notes.set('used', used)
  const reply = await client(this).call('dep_report_usage', { bundle: bundle.id, used })
  assert.ok(!reply.error, JSON.stringify(reply.error))
  this.result = payload(reply)
})

When('it asks for context and reports that it used none of it', async function (this: DepWorld) {
  const bundle = await askOverMcp(this)
  this.notes.set('used', [])
  const reply = await client(this).call('dep_report_usage', { bundle: bundle.id, used: [] })
  assert.ok(!reply.error, JSON.stringify(reply.error))
  this.result = payload(reply)
})

When('it reports use against a request the set never answered', async function (this: DepWorld) {
  await this.materialise()
  const reply = await client(this).call('dep_report_usage', { bundle: 'a1b2c3d4e5f60718', used: ['deadbeefdeadbeef'] })
  this.result = reply
})

When('it asks for context and reports a passage that was not in the answer', async function (this: DepWorld) {
  const bundle = await askOverMcp(this)
  this.result = await client(this).call('dep_report_usage', { bundle: bundle.id, used: ['0123456789abcdef'] })
})

When("I report from the command line which passages that answer's context was used for", async function (this: DepWorld) {
  const entry = record(this).filter((e) => e.kind === 'context').at(-1)
  assert.ok(entry, 'the command-line request is not in the record')
  const used = [entry!.offered[0]!.id]
  this.notes.set('used', used)
  const run = await this.runCliAsync(['report', entry!.id, '--used', used.join(','), '--root', this.root, '--json'])
  assert.equal(run.code, 0, run.stderr)
  this.result = JSON.parse(run.stdout)
})

Then('the record shows those passages as used', function (this: DepWorld) {
  const used = this.notes.get('used') as string[]
  const entries = record(this)
  const entry = entries.find((e) => used.every((id) => e.used.includes(id)) && e.used.length === used.length)
  assert.ok(entry, `no request in the record carries ${JSON.stringify(used)}; record is ${JSON.stringify(entries.map((e) => e.used))}`)
  this.notes.set('entry', entry)
})

Then('the passages it passed over are not shown as used', function (this: DepWorld) {
  const entry = this.notes.get('entry') as TraceEntry
  const used = this.notes.get('used') as string[]
  const passedOver = entry.offered.map((p) => p.id).filter((id) => !used.includes(id))
  assert.ok(passedOver.length > 0, 'nothing was passed over, so the fixture proves nothing')
  for (const id of passedOver) assert.ok(!entry.used.includes(id), `${id} was not used but is marked used`)
})

Then('I am told how many of the offered passages were used', function (this: DepWorld) {
  const receipt = this.result as Record<string, any>
  assert.equal(receipt.recorded, true, JSON.stringify(receipt))
  assert.equal(receipt.used, (this.notes.get('used') as string[]).length)
  assert.equal(receipt.offered, (this.notes.get('bundle') as any).passages.length)
  assert.ok(receipt.offered > receipt.used, JSON.stringify(receipt))
})

Then('I am told the request cannot be matched', function (this: DepWorld) {
  const text = JSON.stringify(this.result)
  assert.ok(/cannot be matched to a bundle/i.test(text), text)
})

Then('I am told the passage cannot be matched', function (this: DepWorld) {
  const text = JSON.stringify(this.result)
  assert.ok(/passage .* cannot be matched/i.test(text), text)
})

Then('the record shows the request with nothing used', function (this: DepWorld) {
  const bundle = this.notes.get('bundle') as any
  const entry = record(this).find((e) => e.id === bundle.id)
  assert.ok(entry, 'the request left the record')
  assert.deepEqual(entry!.used, [])
})

Then('the request itself is still in the record', function (this: DepWorld) {
  const bundle = this.notes.get('bundle') as any
  const entry = record(this).find((e) => e.id === bundle.id)
  assert.ok(entry, 'the request left the record')
  assert.ok(entry!.offered.length > 0, 'the request lost what it offered')
})

Then('the report is turned down', function (this: DepWorld) {
  const reply = this.result as { error?: unknown; result?: { isError?: boolean } }
  const refused = Boolean(reply.error) || Boolean(reply.result && reply.result.isError)
  assert.ok(refused, `the report was accepted: ${JSON.stringify(this.result)}`)
})
