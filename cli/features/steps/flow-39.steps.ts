import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { chmodSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { DepWorld, DEFAULT_QUESTION } from '../support/world'
import { openDocumentationSet } from '../../src/lib'
import type { Bundle, TraceEntry, TraceOffered, TraceReport } from '../../src/lib'
import { REVIEW_TREE } from './flow-31.steps'

const THREE = [DEFAULT_QUESTION, 'what are the lifecycle states', 'how do I install the binary']
const TRACE_FILE = '.dep-trace.jsonl'

function report(world: DepWorld): TraceReport {
  return world.result as TraceReport
}

function entries(world: DepWorld): TraceEntry[] {
  return report(world).entries
}

Given('a project whose retrieval keeps a record of the requests it answers', function (this: DepWorld) {
  this.seedDefaultDocs()
})

Given('a project that keeps no record of the requests it answers', function (this: DepWorld) {
  this.seedDefaultDocs()
  this.trace = false
})

// ── order and timing ────────────────────────────────────────────────────

When('I ask three questions one after another', async function (this: DepWorld) {
  for (const question of THREE) {
    await this.ask(question)
    assert.ok(this.bundle, this.errorMessage())
  }
  this.result = this.set!.traceReport()
})

Then('the record holds all three in the order I asked them', function (this: DepWorld) {
  assert.deepEqual(entries(this).map((e) => e.question), THREE)
})

Then('each entry carries the moment it was answered', function (this: DepWorld) {
  let previous = 0
  for (const entry of entries(this)) {
    const at = Date.parse(entry.at)
    assert.ok(Number.isFinite(at), `not a time: ${entry.at}`)
    assert.ok(at >= previous, 'entries are not in the order they were answered')
    previous = at
  }
})

// ── what a request offered ──────────────────────────────────────────────

Then('the record of that request names the passages it offered me', function (this: DepWorld) {
  this.result = this.set!.traceReport()
  const entry = entries(this).at(-1)!
  assert.equal(entry.id, this.bundle!.id)
  assert.deepEqual(
    entry.offered.map((p: TraceOffered) => p.id).sort(),
    this.bundle!.passages.map((p) => p.id).sort()
  )
  for (const offered of entry.offered) {
    const passage = this.bundle!.passages.find((p) => p.id === offered.id)!
    assert.equal(offered.document, passage.document)
    assert.equal(offered.section, passage.section)
  }
})

Then('the record says why each passage was included', function (this: DepWorld) {
  for (const offered of entries(this).at(-1)!.offered) {
    const passage = this.bundle!.passages.find((p) => p.id === offered.id)!
    assert.equal(offered.reason, passage.reason.kind)
  }
})

Then('the record says how much of my declared budget it filled', function (this: DepWorld) {
  const entry = entries(this).at(-1)!
  assert.ok(entry.budget, 'no budget on the entry')
  assert.equal(entry.budget!.declared, this.bundle!.budget.declared)
  assert.equal(entry.budget!.used, this.bundle!.budget.used)
})

// ── use reported afterwards ─────────────────────────────────────────────

Then('the record of that request separates what I used from what I passed over', function (this: DepWorld) {
  this.result = this.set!.traceReport()
  const entry = entries(this).find((e) => e.id === this.bundle!.id)
  assert.ok(entry, 'the request is not in the record')
  const used = this.notes.get('used') as string[]
  assert.deepEqual(entry!.used.sort(), [...used].sort())
  const passedOver = entry!.offered.map((p: TraceOffered) => p.id).filter((id: string) => !used.includes(id))
  assert.ok(passedOver.length > 0, 'the fixture offered nothing to pass over')
  for (const id of passedOver) assert.ok(!entry!.used.includes(id))
})

// ── who asked ───────────────────────────────────────────────────────────

Given('two consumers that identify themselves differently', async function (this: DepWorld) {
  await this.materialise()
  this.notes.set('callers', ['desktop-client', 'review-script'])
})

When('each of them asks a question', async function (this: DepWorld) {
  for (const caller of this.notes.get('callers') as string[]) {
    const set = openDocumentationSet(this.root, { now: () => this.now, caller })
    this.extraSets.push(set)
    await set.context(`${DEFAULT_QUESTION} for ${caller}`, {})
  }
  this.result = this.set!.traceReport()
})

Then('the record attributes each request to the consumer that made it', function (this: DepWorld) {
  const callers = this.notes.get('callers') as string[]
  const found = entries(this).map((e) => e.caller)
  for (const caller of callers) assert.ok(found.includes(caller), `${caller} is not in ${JSON.stringify(found)}`)
})

Then('I can read back the requests of one consumer alone', function (this: DepWorld) {
  const [first] = this.notes.get('callers') as string[]
  const only = this.set!.traceReport({ caller: first })
  assert.ok(only.entries.length > 0, 'no requests for that consumer')
  for (const entry of only.entries) assert.equal(entry.caller, first)
})

// ── separate runs ───────────────────────────────────────────────────────

Given('a consumer asked a question in one run', async function (this: DepWorld) {
  await this.materialise()
  const first = openDocumentationSet(this.root, { now: () => this.now, caller: 'first-run' })
  this.extraSets.push(first)
  await first.context(DEFAULT_QUESTION, {})
  first.close()
})

Given('another consumer asked a question in a later run', async function (this: DepWorld) {
  const second = openDocumentationSet(this.root, { now: () => this.now, caller: 'second-run' })
  this.extraSets.push(second)
  await second.context('what are the lifecycle states', {})
  second.close()
})

When('I read the record', async function (this: DepWorld) {
  await this.materialise()
  this.result = this.set!.traceReport()
})

Then('it holds both, in the order they were answered', function (this: DepWorld) {
  assert.deepEqual(entries(this).map((e) => e.caller), ['first-run', 'second-run'])
})

// ── every kind of request ───────────────────────────────────────────────

When('I search', async function (this: DepWorld) {
  await this.materialise()
  this.result = await this.set!.search(DEFAULT_QUESTION, {})
})

When('I take a step through a procedure', async function (this: DepWorld) {
  this.trees.set('review-freshness', REVIEW_TREE)
  await this.materialise()
  this.result = await this.set!.procedureStep('review-freshness', 'check-freshness', { budget: 2000 })
})

When('I validate the documentation set', async function (this: DepWorld) {
  await this.materialise()
  this.result = this.set!.validate()
})

Then('the record holds one entry for it', function (this: DepWorld) {
  const record = this.set!.traceReport()
  assert.equal(record.entries.length, 1, `expected one entry, got ${JSON.stringify(record.entries.map((e) => e.kind))}`)
  this.result = record
})

Then('the entry says which kind of request it was', function (this: DepWorld) {
  const kinds = ['context', 'search', 'procedure', 'validate']
  const entry = entries(this)[0]!
  assert.ok(kinds.includes(entry.kind), `unknown kind: ${entry.kind}`)
})

// ── reading while answering ─────────────────────────────────────────────

Given('a consumer is asking questions continuously', async function (this: DepWorld) {
  await this.materialise()
  const consumer = openDocumentationSet(this.root, { now: () => this.now, caller: 'busy-agent' })
  this.extraSets.push(consumer)
  this.notes.set('consumer', consumer)
  let stopped = false
  this.notes.set('stop', () => { stopped = true })
  const asking = (async () => {
    let answered = 0
    while (!stopped && answered < 50) {
      await consumer.context(`${DEFAULT_QUESTION} ${answered}`, {})
      answered++
    }
    return answered
  })()
  this.notes.set('asking', asking)
  // let a few land before the record is read
  while ((this.set!.traceReport().entries.length) < 2 && !stopped) await new Promise((r) => setTimeout(r, 5))
})

When('I read the record without interrupting it', function (this: DepWorld) {
  this.result = this.set!.traceReport()
})

Then('I am given the requests answered so far', function (this: DepWorld) {
  assert.ok(entries(this).length >= 2, 'the record was empty while requests were being answered')
  for (const entry of entries(this)) assert.equal(entry.caller, 'busy-agent')
})

Then("the consumer's later requests still succeed", async function (this: DepWorld) {
  ;(this.notes.get('stop') as () => void)()
  const answered = await (this.notes.get('asking') as Promise<number>)
  assert.ok(answered > entries(this).length - 1, 'the consumer stopped being answered')
  const after = this.set!.traceReport()
  assert.ok(after.entries.length >= entries(this).length, 'the record stopped growing')
})

// ── keeping no record ───────────────────────────────────────────────────

Then('the bundle is the same as it would be with the record kept', async function (this: DepWorld) {
  assert.ok(this.bundle, this.errorMessage())
  // before the comparison set answers anything and writes a record of its own
  this.notes.set('recordAfterRequest', existsSync(join(this.root, TRACE_FILE)))
  const kept = openDocumentationSet(this.root, { now: () => this.now })
  this.extraSets.push(kept)
  const other = await kept.context(this.question, this.options)
  assert.deepEqual(this.bundle!.passages.map((p) => p.id), other.passages.map((p) => p.id))
})

Then('nothing about the request is kept', function (this: DepWorld) {
  assert.equal(this.set!.tracePath, null)
  assert.deepEqual(this.set!.traceReport().entries, [])
  assert.equal(this.notes.get('recordAfterRequest'), false, 'a record was written anyway')
})

// ── the bound ───────────────────────────────────────────────────────────

Given('more requests have been answered than the record keeps', async function (this: DepWorld) {
  this.trace = { keep: 3 }
  await this.materialise()
  for (let i = 0; i < 8; i++) await this.set!.context(`${DEFAULT_QUESTION} ${i}`, {})
  this.notes.set('asked', 8)
})

Then('I am given the most recent ones', function (this: DepWorld) {
  const kept = entries(this)
  assert.equal(kept.length, 3)
  assert.deepEqual(kept.map((e) => e.question), [5, 6, 7].map((i) => `${DEFAULT_QUESTION} ${i}`))
})

Then('I am told that older ones were dropped', function (this: DepWorld) {
  assert.equal(report(this).dropped, (this.notes.get('asked') as number) - 3)
})

// ── clearing ────────────────────────────────────────────────────────────

When('I clear the record of requests', async function (this: DepWorld) {
  await this.ask()
  assert.ok(this.bundle, this.errorMessage())
  this.result = this.set!.clearTrace()
})

Then('reading the record returns nothing', function (this: DepWorld) {
  const record = this.set!.traceReport()
  assert.deepEqual(record.entries, [])
  assert.equal(record.dropped, 0)
})

// ── a refused request ───────────────────────────────────────────────────

When('I ask for context in a way that is refused', async function (this: DepWorld) {
  await this.materialise()
  this.error = undefined
  try {
    await this.set!.context(DEFAULT_QUESTION, { budget: -1 })
  } catch (err) {
    this.error = err
  }
  assert.ok(this.error, 'the request was answered')
})

Then('the record holds the refused request', function (this: DepWorld) {
  this.result = this.set!.traceReport()
  const entry = entries(this).at(-1)
  assert.ok(entry, 'the refused request is not in the record')
  assert.equal(entry!.question, DEFAULT_QUESTION)
  assert.equal(entry!.outcome, 'refused')
})

Then('the entry says it was refused, and why', function (this: DepWorld) {
  const entry = entries(this).at(-1)!
  assert.ok(entry.error, 'no reason was kept')
  assert.equal(entry.error!.code, 'INVALID_BUDGET')
  assert.ok(entry.error!.message.length > 0)
})

// ── a consumer that never asked ─────────────────────────────────────────

Given('requests have been recorded', async function (this: DepWorld) {
  await this.ask()
  assert.ok(this.bundle, this.errorMessage())
})

When('I read back the requests of a consumer that never asked anything', function (this: DepWorld) {
  this.notes.set('before', this.set!.traceReport().entries.length)
  this.result = this.set!.traceReport({ caller: 'nobody-at-all' })
})

Then('I am given nothing, and told so', function (this: DepWorld) {
  assert.deepEqual(entries(this), [])
  assert.equal(report(this).caller, 'nobody-at-all')
})

Then('the record is left as it was', function (this: DepWorld) {
  assert.equal(this.set!.traceReport().entries.length, this.notes.get('before'))
})

// ── the record cannot be written ────────────────────────────────────────

Given('the record cannot be written', async function (this: DepWorld) {
  await this.materialise()
  const record = join(this.root, TRACE_FILE)
  writeFileSync(record, '')
  chmodSync(record, 0o444)
})

Then('I still receive the bundle', function (this: DepWorld) {
  assert.ok(this.bundle, this.errorMessage())
  assert.ok(this.bundle!.passages.length > 0)
})

Then('I am told the request could not be recorded, and why', function (this: DepWorld) {
  const notice = (this.bundle as Bundle).notices.find((n) => n.code === 'trace-not-recorded')
  assert.ok(notice, `no notice: ${JSON.stringify(this.bundle!.notices)}`)
  assert.ok(/EACCES|permission|denied/i.test(notice!.message), notice!.message)
})

Then('I am not told again on every later request', async function (this: DepWorld) {
  const again = await this.set!.context(DEFAULT_QUESTION, {})
  assert.equal(again.notices.find((n) => n.code === 'trace-not-recorded'), undefined)
})

// ── the record stays here ───────────────────────────────────────────────

Then('the record is kept only inside the project', function (this: DepWorld) {
  assert.ok(this.set!.tracePath, 'no record was kept')
  assert.ok(this.set!.tracePath!.startsWith(this.root), this.set!.tracePath!)
  assert.ok(existsSync(join(this.root, TRACE_FILE)))
})
