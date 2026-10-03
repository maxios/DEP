import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { DepWorld, daysAgo, freshnessBody } from '../support/world'

const SUBJECT = 'docs/reference/lifecycle-states.md'
const TARGET = 'docs/explanation/freshness.md'
const OUTSIDE = '../outside-the-project.md'

function url(world: DepWorld, path: string): URL {
  return new URL(path, (world.notes.get('console') as { url: string }).url)
}

async function amend(world: DepWorld, body: Record<string, unknown>, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(url(world, '/api/amend'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

async function change(world: DepWorld, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  world.notes.set('before', world.readDoc(String(body.document ?? SUBJECT)))
  world.result = await amend(world, body, headers)
  return world.result as Response
}

async function doc(world: DepWorld, path: string = SUBJECT): Promise<any> {
  const reply = await fetch(url(world, '/api/document?path=' + encodeURIComponent(path)))
  assert.equal(reply.status, 200, `asking for ${path} answered ${reply.status}`)
  return reply.json()
}

Given('a document that is past its review date', async function (this: DepWorld) {
  this.addDoc({
    path: SUBJECT,
    type: 'reference',
    title: 'Lifecycle states',
    tags: ['lifecycle'],
    lastVerified: daysAgo(400, this.now),
    body: freshnessBody('The three states are fresh, aging and stale.'),
  })
  this.writeDoc(this.docs.get(SUBJECT)!)
  // the console notices the file through a watcher; give it a moment to catch up
  const deadline = Date.now() + 3000
  let before = await doc(this)
  while (before.lifecycle !== 'STALE' && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100))
    before = await doc(this)
  }
  assert.equal(before.lifecycle, 'STALE', `the fixture is ${before.lifecycle}, not stale`)
})

When('I mark it reviewed from the console', async function (this: DepWorld) {
  const reply = await change(this, { document: SUBJECT, bump: true })
  assert.equal(reply.status, 200, await reply.text())
})

Then('the console counts it as fresh again', async function (this: DepWorld) {
  const after = await doc(this)
  assert.equal(after.lifecycle, 'FRESH', JSON.stringify(after.freshness))
})

Then("the document's own file records the new review date", function (this: DepWorld) {
  const text = this.readDoc(SUBJECT)
  const match = /last_verified:\s*(\S+)/.exec(text)
  assert.ok(match, 'no last_verified in the file')
  const written = Date.parse(match![1]!.replace(/['"]/g, ''))
  assert.ok(Date.now() - written < 5 * 60 * 1000, `the file still says ${match![1]}`)
})

When('I set a document\'s confidence to {string} from the console', async function (this: DepWorld, value: string) {
  await change(this, { document: SUBJECT, set: { confidence: value } })
})

Then('the console reports that confidence', async function (this: DepWorld) {
  assert.equal((this.result as Response).status, 200)
  const after = await doc(this)
  assert.equal(after.confidence, 'low')
})

Then("the document's own file records it", function (this: DepWorld) {
  assert.ok(/confidence:\s*low/.test(this.readDoc(SUBJECT)), this.readDoc(SUBJECT).slice(0, 400))
})

When('I add the tag {string} to a document from the console', async function (this: DepWorld, tag: string) {
  const reply = await change(this, { document: SUBJECT, tags: { add: [tag] } })
  assert.equal(reply.status, 200, await reply.text())
})

When('I take the tag {string} off the same document from the console', async function (this: DepWorld, tag: string) {
  const reply = await change(this, { document: SUBJECT, tags: { remove: [tag] } })
  assert.equal(reply.status, 200, await reply.text())
})

Then('the document carries only the tags I left on it', async function (this: DepWorld) {
  const after = await doc(this)
  assert.ok(after.tags.includes('reviewed'), JSON.stringify(after.tags))
  assert.ok(!after.tags.includes('lifecycle'), JSON.stringify(after.tags))
})

When('I link a document to another as REQUIRES from the console', async function (this: DepWorld) {
  const reply = await change(this, { document: SUBJECT, link: { target: TARGET, rel: 'REQUIRES' } })
  assert.equal(reply.status, 200, await reply.text())
})

Then('the graph holds that link', async function (this: DepWorld) {
  const graph = await (await fetch(url(this, '/api/graph'))).json() as { edges: Array<{ source: string; target: string; rel: string }> }
  const edge = graph.edges.find((e) => e.source === SUBJECT && e.target === TARGET && e.rel === 'REQUIRES')
  assert.ok(edge, `no REQUIRES from ${SUBJECT} to ${TARGET} in ${JSON.stringify(graph.edges)}`)
})

Then('the document it points at counts it as incoming', async function (this: DepWorld) {
  const target = await doc(this, TARGET)
  const back = target.backlinks.find((l: { source: string; rel: string }) => l.source === SUBJECT && l.rel === 'REQUIRES')
  assert.ok(back, JSON.stringify(target.backlinks))
})

When('I link a document to one that is not in the set from the console', async function (this: DepWorld) {
  await change(this, { document: SUBJECT, link: { target: 'docs/reference/no-such-document.md', rel: 'REQUIRES' } })
})

When('I try to change a file outside the project from the console', async function (this: DepWorld) {
  const outside = join(this.root, '..', 'outside-the-project.md')
  writeFileSync(outside, '---\ndep:\n  type: reference\n---\n\n# Outside\n')
  this.notes.set('outsideBefore', readFileSync(outside, 'utf-8'))
  this.notes.set('before', this.readDoc(SUBJECT))
  this.result = await amend(this, { document: OUTSIDE, set: { confidence: 'low' } })
})

When('another site asks the console to change a document', async function (this: DepWorld) {
  await change(this, { document: SUBJECT, set: { confidence: 'low' } }, { origin: 'https://not-your-machine.example' })
})

When('a request arrives addressed to a host that is not this machine', async function (this: DepWorld) {
  await change(this, { document: SUBJECT, set: { confidence: 'low' } }, { host: 'docs.example.com' })
})

Then('the change is refused', async function (this: DepWorld) {
  const reply = this.result as Response
  assert.ok([400, 403, 404].includes(reply.status), `the console answered ${reply.status}`)
  const body = await reply.json() as { error?: string }
  assert.ok(body.error, `no reason given: ${JSON.stringify(body)}`)
  assert.ok(!/is not something the console serves/.test(body.error!), 'there is no way to change a document at all')
  this.notes.set('body', body)
  return
})

Then('I am told which values are allowed', function (this: DepWorld) {
  const body = this.notes.get('body') as { error?: string }
  assert.ok(body.error && /high|medium|low/.test(body.error), JSON.stringify(body))
})

Then('the document is left as it was', function (this: DepWorld) {
  assert.equal(this.readDoc(SUBJECT), this.notes.get('before'))
})

Then('the file outside the project is untouched', function (this: DepWorld) {
  const outside = join(this.root, '..', 'outside-the-project.md')
  assert.ok(existsSync(outside))
  assert.equal(readFileSync(outside, 'utf-8'), this.notes.get('outsideBefore'))
})
