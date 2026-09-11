import { Given, When, Then, After, type DataTable } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'fs'
import { join } from 'path'
import { DepWorld, DEFAULT_QUESTION, SCRATCH } from '../support/world'
import { McpClient } from '../support/mcp-client'
import { REVIEW_TREE, INSTALL_TREE } from './flow-31.steps'
import pkg from '../../package.json'

function client(world: DepWorld): McpClient {
  return world.notes.get('mcp') as McpClient
}

async function open(world: DepWorld): Promise<McpClient> {
  const existing = world.notes.get('mcp') as McpClient | undefined
  if (existing) return existing
  await world.materialise()
  const c = new McpClient(world.root)
  world.notes.set('mcp', c)
  return c
}

After(function (this: DepWorld) {
  (this.notes.get('mcp') as McpClient | undefined)?.close()
})

Given('the DEP MCP server is started for that project', function (this: DepWorld) {
  // started on first use, so later Givens can still shape the project
})

Given('the project declares decision procedures', function (this: DepWorld) {
  this.trees.set('review-freshness', REVIEW_TREE)
  this.trees.set('install-binary', INSTALL_TREE)
  this.written = false
})

When('I open a session with the server', async function (this: DepWorld) {
  const c = await open(this)
  this.result = (await c.initialize()).result
})

Given('I have opened a session with the server', async function (this: DepWorld) {
  const c = await open(this)
  this.result = (await c.initialize()).result
})

Then("I am told the server's name and version", function (this: DepWorld) {
  const r = this.result as any
  assert.equal(r.serverInfo.name, 'dep')
  assert.equal(r.serverInfo.version, pkg.version)
})

Then('I am told it offers tools', function (this: DepWorld) {
  assert.ok((this.result as any).capabilities.tools)
})

When('I ask which tools are offered', async function (this: DepWorld) {
  this.result = (await client(this).request('tools/list')).result
})

Then('each of these tools is offered, with a description and an input schema:', function (this: DepWorld, table: DataTable) {
  const tools = (this.result as any).tools as Array<{ name: string; description: string; inputSchema: any }>
  for (const { tool } of table.hashes()) {
    const found = tools.find((t) => t.name === tool)
    assert.ok(found, `${tool} not offered; offered: ${tools.map((t) => t.name)}`)
    assert.ok(found!.description.length > 20, `${tool} has no real description`)
    assert.equal(found!.inputSchema.type, 'object')
  }
})

When('I call {string} with a question and a budget', async function (this: DepWorld, tool: string) {
  this.result = (await client(this).call(tool, { question: DEFAULT_QUESTION, budget: 1500 })).result
})

Then('I receive a bundle whose passages fit the budget', function (this: DepWorld) {
  const r = this.result as any
  assert.ok(!r.isError, JSON.stringify(r))
  const bundle = r.structuredContent
  assert.ok(Array.isArray(bundle.passages) && bundle.passages.length > 0)
  assert.ok(bundle.budget.used <= 1500)
})

Then('the result is structured, not only prose', function (this: DepWorld) {
  const r = this.result as any
  assert.equal(typeof r.structuredContent, 'object')
  assert.equal(r.content[0].type, 'text')
})

When('I call {string} with a request in my own words', async function (this: DepWorld, tool: string) {
  this.result = (await client(this).call(tool, { query: 'review a document for freshness' })).result
})

Then('I am told the matching procedure and its entry step', function (this: DepWorld) {
  const r = this.result as any
  assert.ok(!r.isError, JSON.stringify(r))
  const best = r.structuredContent.matches[0]
  assert.equal(best.id, 'review-freshness')
  assert.equal(best.entry_node, 'check-freshness')
  this.notes.set('procedure', best)
})

When('I call {string} with that procedure and step', async function (this: DepWorld, tool: string) {
  const best = this.notes.get('procedure') as { id: string; entry_node: string }
  this.result = (await client(this).call(tool, { tree: best.id, node: best.entry_node })).result
})

Then('I receive that one step and nothing more', function (this: DepWorld) {
  const r = this.result as any
  assert.ok(!r.isError, JSON.stringify(r))
  assert.equal(r.structuredContent.node.id, 'check-freshness')
  assert.deepEqual(Object.keys(r.structuredContent).sort(), ['next', 'node', 'tree'])
})

Given('a second project configured for DEP', function (this: DepWorld) {
  this.notes.set('second', this.openSecondProject())
})

When('I call {string} naming the second project\'s root', async function (this: DepWorld, tool: string) {
  const second = this.notes.get('second') as { root: string }
  this.result = (await client(this).call(tool, { root: second.root })).result
})

Then('the result draws only on the second project', function (this: DepWorld) {
  const second = this.notes.get('second') as { root: string; docs: string[] }
  const r = this.result as any
  assert.ok(!r.isError, JSON.stringify(r))
  assert.equal(r.structuredContent.root, second.root)
  const paths = r.structuredContent.documents.map((d: any) => d.path)
  assert.ok(paths.length > 0)
  for (const p of paths) assert.ok(second.docs.includes(p), `${p} is not in the second project`)
})

When('I call {string} with a budget of {string}', async function (this: DepWorld, tool: string, budget: string) {
  this.result = (await client(this).call(tool, { question: DEFAULT_QUESTION, budget })).result
})

Then('the call is reported as an error that says {string}', function (this: DepWorld, text: string) {
  const r = this.result as any
  assert.equal(r.isError, true, JSON.stringify(r))
  assert.ok(r.content[0].text.includes(text), r.content[0].text)
})

Then('the session is still usable', async function (this: DepWorld) {
  const reply = await client(this).request('ping')
  assert.deepEqual(reply.result, {})
})

When('I call a tool the server does not offer', async function (this: DepWorld) {
  this.result = await client(this).call('dep_teleport', {})
})

Then('I am told the tool is unknown', function (this: DepWorld) {
  const reply = this.result as any
  assert.ok(reply.error, JSON.stringify(reply))
  assert.ok(reply.error.message.includes('unknown tool'), reply.error.message)
})

When('I call {string} naming a root that holds no DEP configuration', async function (this: DepWorld, tool: string) {
  const empty = mkdtempSync(join(SCRATCH, 'empty-'))
  this.result = (await client(this).call(tool, { root: empty })).result
})

When('I send the initialised notification', function (this: DepWorld) {
  const c = client(this)
  this.notes.set('unsolicitedBefore', c.unsolicited.length)
  c.notify('notifications/initialized')
})

Then('nothing is sent back for it', async function (this: DepWorld) {
  await new Promise((r) => setTimeout(r, 300))
  assert.equal(client(this).unsolicited.length, this.notes.get('unsolicitedBefore'))
})

When('I send a ping', async function (this: DepWorld) {
  this.result = (await client(this).request('ping')).result
})

Then('I receive an empty result', function (this: DepWorld) {
  assert.deepEqual(this.result, {})
})

When('I ask the CLI for the desktop client configuration for the project', async function (this: DepWorld) {
  await this.materialise()
  await this.runCliAsync(['mcp', '--print-config', '--root', this.root])
})

Then("I am given configuration whose command is the CLI itself and whose arguments name the project's root", function (this: DepWorld) {
  assert.equal(this.cli!.code, 0, this.cli!.stderr)
  const config = JSON.parse(this.cli!.stdout)
  const entry = config.mcpServers.dep
  assert.equal(entry.command, process.execPath)
  assert.ok(entry.args.includes('mcp'))
  assert.ok(entry.args.includes('--root') && entry.args.includes(this.root), JSON.stringify(entry.args))
  this.result = entry
})

Then('the configuration depends on no other runtime', function (this: DepWorld) {
  const entry = this.result as { command: string; args: string[] }
  assert.ok(!/npx|npm|node$/.test(entry.command), entry.command)
  assert.ok(!entry.args.some((a) => /npx|@maxios\/dep-mcp/.test(a)), JSON.stringify(entry.args))
})

Then('I am told whether a release check ran, and why not if it did not', async function (this: DepWorld) {
  const c = client(this)
  await new Promise((r) => setTimeout(r, 200))
  assert.match(c.stderr, /release check|upgraded dep/, c.stderr)
  assert.match(c.stderr, /skipped: running from source|is current|skipped: already checked today|could not be reached/, c.stderr)
})
