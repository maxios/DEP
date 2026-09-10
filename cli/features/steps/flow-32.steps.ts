import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { chmodSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { DepWorld, freshnessBody, unrelatedBody } from '../support/world'
import { openDocumentationSet } from '../../src/lib'
import type { Bundle, UsageReceipt, UsageReport } from '../../src/lib'

const A = 'docs/reference/freshness-a.md'
const B = 'docs/reference/freshness-b.md'

function twoNearEqualDocs(world: DepWorld) {
  world.docs.clear()
  world.addDoc({ path: A, type: 'reference', title: 'Freshness decided', body: freshnessBody() })
  world.addDoc({ path: B, type: 'reference', title: 'Freshness decided', body: freshnessBody('Freshness is decided this way for every document.') })
  world.addDoc({ path: 'docs/how-to/install.md', type: 'how-to', title: 'Install', body: unrelatedBody() })
}

function order(bundle: Bundle): string[] {
  return bundle.passages.map((p) => p.document)
}

Given('a project whose retrieval keeps a record of how bundles were used', function (this: DepWorld) {
  this.seedDefaultDocs()
})

Given('I received a bundle for a question', async function (this: DepWorld) {
  await this.ask()
  assert.ok(this.bundle, this.errorMessage())
})

When('I report which of its passages I actually used', async function (this: DepWorld) {
  const used = [this.bundle!.passages[0]!.id]
  this.notes.set('used', used)
  this.result = await this.watchingNetwork(() => this.set!.recordUsage(this.bundle!.id, used))
})

Then('the report is recorded against that question', function (this: DepWorld) {
  const receipt = this.result as UsageReceipt
  assert.equal(receipt.recorded, true, JSON.stringify(receipt))
  const report = this.set!.usageReport()
  for (const id of this.notes.get('used') as string[]) {
    assert.ok(report.passages[id], 'used passage not in the record')
    assert.ok(report.passages[id]!.questions.includes(this.bundle!.question))
    assert.equal(report.passages[id]!.used, 1)
  }
})

Then('I am told it was recorded', function (this: DepWorld) {
  const receipt = this.result as UsageReceipt
  assert.equal(receipt.recorded, true)
  assert.equal(typeof receipt.version, 'number')
})

Given('passages from one document have been reported as used for a kind of question many times', async function (this: DepWorld) {
  twoNearEqualDocs(this)
  await this.ask()
  assert.ok(this.bundle, this.errorMessage())
  const before = order(this.bundle!)
  assert.ok(before.indexOf(B) < before.indexOf(A), `expected B ahead of A before any use: ${before}`)
  for (let i = 0; i < 5; i++) {
    await this.ask()
    this.set!.recordUsage(this.bundle!.id, this.passagesFrom(A).map((p) => p.id))
  }
})

When('I ask a question of that kind again', async function (this: DepWorld) {
  await this.ask()
})

Then('those passages appear earlier in the bundle than they did before', function (this: DepWorld) {
  const now = order(this.bundle!)
  assert.ok(now.indexOf(A) >= 0 && now.indexOf(B) >= 0, `both must be served: ${now}`)
  assert.ok(now.indexOf(A) < now.indexOf(B), `A should now lead: ${now}`)
})

Then('the change is attributed to previous use', function (this: DepWorld) {
  const a = this.passagesFrom(A)[0]!
  const b = this.passagesFrom(B)[0]!
  assert.ok(a.signals.usage > 1, `A usage signal ${a.signals.usage}`)
  assert.equal(b.signals.usage, 1)
})

Given('the record holds enough history', async function (this: DepWorld) {
  twoNearEqualDocs(this)
  for (let i = 0; i < 6; i++) {
    await this.ask()
    this.set!.recordUsage(this.bundle!.id, this.passagesFrom(A).map((p) => p.id))
  }
})

When('I ask which knowledge is retrieved often and used rarely', function (this: DepWorld) {
  this.result = this.set!.usageReport()
})

Then('I am given those documents ordered by how often they are passed over', function (this: DepWorld) {
  const report = this.result as UsageReport
  assert.ok(report.passedOver.length > 0)
  assert.equal(report.passedOver[0]!.document, B)
  assert.equal(report.passedOver[0]!.passedOver, 6)
  for (let i = 1; i < report.passedOver.length; i++) assert.ok(report.passedOver[i]!.passedOver <= report.passedOver[i - 1]!.passedOver)
})

Then('each is offered as a candidate for rewriting or retiring', function (this: DepWorld) {
  for (const entry of (this.result as UsageReport).passedOver) assert.equal(entry.suggestion, 'rewrite-or-retire')
})

Given('nothing has ever been reported as used', function (this: DepWorld) {
  // the record starts empty
})

Then('the bundle is the same as it would be with no record kept at all', async function (this: DepWorld) {
  assert.ok(this.bundle, this.errorMessage())
  const plain = openDocumentationSet(this.root, { now: () => this.now, usage: false })
  this.extraSets.push(plain)
  const without = await plain.context(this.question, this.options)
  assert.deepEqual(this.bundle!.passages.map((p) => p.id), without.passages.map((p) => p.id))
  assert.equal(this.bundle!.usageRecordVersion, 0)
  for (const p of this.bundle!.passages) assert.equal(p.signals.usage, 1)
})

When('I clear the record of how bundles were used', async function (this: DepWorld) {
  await this.ask()
  this.set!.recordUsage(this.bundle!.id, [this.bundle!.passages[0]!.id])
  this.result = this.set!.clearUsage()
})

Then('later bundles are assembled as though nothing had ever been reported', async function (this: DepWorld) {
  await this.ask()
  assert.equal(this.bundle!.usageRecordVersion, 0)
  for (const p of this.bundle!.passages) assert.equal(p.signals.usage, 1)
})

Then('I am told the record was cleared', function (this: DepWorld) {
  assert.equal((this.result as { cleared: boolean }).cleared, true)
})

Given('knowledge has been reported as used', async function (this: DepWorld) {
  await this.ask()
  const id = this.bundle!.passages[0]!.id
  this.notes.set('usedId', id)
  this.set!.recordUsage(this.bundle!.id, [id])
})

When('the index is rebuilt in full', async function (this: DepWorld) {
  await this.set!.index({ force: true })
})

Then('the record still applies to the rebuilt knowledge', async function (this: DepWorld) {
  const id = this.notes.get('usedId') as string
  assert.ok(this.set!.usageReport().passages[id]!.used >= 1)
  await this.ask()
  const passage = this.bundle!.passages.find((p) => p.id === id)
  assert.ok(passage, 'the used passage lost its identity in the rebuild')
  assert.ok(passage!.signals.usage > 1)
})

When('I report use of a passage that was not in any bundle I received', async function (this: DepWorld) {
  await this.ask()
  this.error = undefined
  try {
    this.result = this.set!.recordUsage(this.bundle!.id, ['0123456789abcdef'])
  } catch (err) {
    this.error = err
  }
})

Then('the report is refused', function (this: DepWorld) {
  assert.ok(this.error, 'the report was accepted')
})

Then('I am told the passage cannot be matched to a bundle', function (this: DepWorld) {
  assert.ok(this.errorMessage().includes('cannot be matched to a bundle'), this.errorMessage())
})

Given('the project cannot be written to', async function (this: DepWorld) {
  await this.materialise()
  const record = join(this.root, '.dep-usage.json')
  writeFileSync(record, JSON.stringify({ version: 0, bundles: {}, passages: {} }))
  chmodSync(record, 0o444)
})

When('I report which passages I used', async function (this: DepWorld) {
  await this.ask()
  this.result = this.set!.recordUsage(this.bundle!.id, [this.bundle!.passages[0]!.id])
})

Then('I am told the report could not be recorded, and why', function (this: DepWorld) {
  const receipt = this.result as UsageReceipt
  assert.equal(receipt.recorded, false)
  assert.ok(receipt.reason && /EACCES|permission|denied/i.test(receipt.reason), JSON.stringify(receipt))
})

Then('later requests for context still succeed', async function (this: DepWorld) {
  await this.ask()
  assert.ok(this.bundle, this.errorMessage())
})

Then('I am not told again on every later report', function (this: DepWorld) {
  const again = this.set!.recordUsage(this.bundle!.id, [this.bundle!.passages[0]!.id])
  assert.equal(again.recorded, false)
  assert.equal(again.reason, undefined)
  assert.equal(again.silenced, true)
})

Given('I have reported which passages I used', async function (this: DepWorld) {
  await this.ask()
  this.result = await this.watchingNetwork(() => this.set!.recordUsage(this.bundle!.id, [this.bundle!.passages[0]!.id]))
})

When('the record is written', function (this: DepWorld) {
  assert.equal((this.result as UsageReceipt).recorded, true)
})

Then('it is written only within the project', function (this: DepWorld) {
  assert.ok(existsSync(join(this.root, '.dep-usage.json')))
  assert.ok(this.set!.usagePath!.startsWith(this.root))
})

Then('neither my questions nor the record are sent to any external service', function (this: DepWorld) {
  assert.deepEqual(this.fetchCalls, [])
})
