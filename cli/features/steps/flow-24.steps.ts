import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { DepWorld, freshnessBody, unrelatedBody, faintBody } from '../support/world'
import { notice } from './common.steps'

const FAINT_DOCS = ['docs/reference/release-a.md', 'docs/reference/release-b.md', 'docs/reference/release-c.md']

Then("the bundle's total size is at or below the budget I declared", function (this: DepWorld) {
  const b = this.bundle!
  const total = b.passages.reduce((s, p) => s + p.tokens, 0)
  assert.ok(total <= b.budget.declared, `passages total ${total} > budget ${b.budget.declared}`)
  assert.ok(b.budget.used <= b.budget.declared)
  assert.equal(b.budget.used, total)
})

Then("the bundle's total size is at or below {string}", function (this: DepWorld, raw: string) {
  const b = this.bundle!
  const total = b.passages.reduce((s, p) => s + p.tokens, 0)
  assert.ok(total <= Number(raw), `passages total ${total} > ${raw}`)
})

Then('I am told how much of the budget the bundle consumed', function (this: DepWorld) {
  assert.equal(typeof this.bundle!.budget.used, 'number')
  assert.equal(typeof this.bundle!.budget.remaining, 'number')
})

Then('I am told the size of what I received', function (this: DepWorld) {
  assert.equal(typeof this.bundle!.budget.used, 'number')
})

Then('each passage names the document it came from', function (this: DepWorld) {
  for (const p of this.bundle!.passages) {
    assert.ok(p.document, 'passage without a document')
    assert.ok(this.docs.has(p.document), `unknown document ${p.document}`)
  }
})

Then('the passages are ordered by how much they contribute to answering it', function (this: DepWorld) {
  const scores = this.bundle!.passages.map((p) => p.score)
  for (let i = 1; i < scores.length; i++) {
    assert.ok(scores[i]! <= scores[i - 1]!, `passages not ordered by score: ${scores}`)
  }
})

Then('a consumer that reads only the beginning of the bundle loses the least useful part', function (this: DepWorld) {
  const scores = this.bundle!.passages.map((p) => p.score)
  const last = scores[scores.length - 1]!
  assert.ok(scores.every((s) => s >= last))
})

Given('only two passages in the set are relevant to my question', function (this: DepWorld) {
  this.docs.clear()
  this.addDoc({ path: 'docs/explanation/freshness.md', type: 'explanation', title: 'How freshness is decided', body: freshnessBody() })
  this.addDoc({ path: 'docs/reference/lifecycle-states.md', type: 'reference', title: 'Lifecycle states', body: freshnessBody('The three states are fresh, aging and stale.') })
  const topics = ['installing the binary', 'writing a tutorial', 'the release process', 'the plugin marketplace', 'shell completion', 'the colour palette of graph drawings']
  topics.forEach((t, i) => this.addDoc({ path: `docs/how-to/other-${i}.md`, type: 'how-to', title: `About ${t}`, body: unrelatedBody(t) }))
  this.notes.set('relevant', ['docs/explanation/freshness.md', 'docs/reference/lifecycle-states.md'])
})

Given('I declare a budget large enough for twenty', function (this: DepWorld) {
  this.options.budget = 8000
})

Then('I receive only those two passages', function (this: DepWorld) {
  const docs = this.bundle!.passages.map((p) => p.document).sort()
  assert.deepEqual(docs, (this.notes.get('relevant') as string[]).sort())
})

Then('I am told the budget was not exhausted', function (this: DepWorld) {
  assert.ok(this.bundle!.budget.remaining > 0)
  assert.ok(this.bundle!.budget.used < this.bundle!.budget.declared)
})

Then('no weakly-related passage is added to consume the remaining budget', function (this: DepWorld) {
  const relevant = new Set(this.notes.get('relevant') as string[])
  for (const p of this.bundle!.passages) assert.ok(relevant.has(p.document), `weak passage included: ${p.document}`)
})

When('I ask for context and request a machine-readable answer', async function (this: DepWorld) {
  await this.materialise()
  this.runCli(['context', this.question, '--budget', '8000', '--json', '--root', this.root])
})

Then('I receive the bundle as structured data', function (this: DepWorld) {
  assert.equal(this.cli!.code, 0, this.cli!.stderr)
  const parsed = JSON.parse(this.cli!.stdout)
  assert.ok(Array.isArray(parsed.passages))
  this.result = parsed
})

Then('each passage carries its source, its size, its freshness and why it was chosen', function (this: DepWorld) {
  const parsed = this.result as any
  assert.ok(parsed.passages.length > 0)
  for (const p of parsed.passages) {
    assert.equal(typeof p.document, 'string')
    assert.equal(typeof p.tokens, 'number')
    assert.equal(typeof p.freshness.state, 'string')
    assert.equal(typeof p.reason.kind, 'string')
  }
})

Given('I declare a relevance floor', function (this: DepWorld) {
  this.options.minScore = 0.3
})

Given('several passages match my question only faintly', function (this: DepWorld) {
  FAINT_DOCS.forEach((path, i) => this.addDoc({ path, type: 'reference', title: `Release ${i + 1}`, body: faintBody() }))
  this.notes.set('absent', FAINT_DOCS)
})

Then('they are absent even though the budget could have held them', function (this: DepWorld) {
  assert.ok(this.bundle!.budget.remaining > 1000, `remaining budget ${this.bundle!.budget.remaining} could not have held them`)
})

Given('the single most relevant passage is larger than the budget I declared', function (this: DepWorld) {
  this.options.budget = 12
})

Then('I am told that no passage fits the declared budget', function (this: DepWorld) {
  notice(this, 'nothing-fits')
})

Then('I am told the smallest budget that would return something', function (this: DepWorld) {
  const n = notice(this, 'nothing-fits') as any
  assert.equal(typeof n.smallestBudget, 'number')
  assert.ok(n.smallestBudget > this.bundle!.budget.declared)
})

Then('I do not receive a truncated passage presented as whole', function (this: DepWorld) {
  assert.equal(this.bundle!.passages.length, 0)
})

Then('I am told plainly that nothing matched', function (this: DepWorld) {
  notice(this, 'no-match')
})

Then('I still receive a bundle ranked by wording alone', function (this: DepWorld) {
  assert.ok(this.bundle, `no bundle; error: ${this.errorMessage()}`)
  assert.equal(this.bundle!.ranking, 'keyword-only')
  assert.ok(this.bundle!.passages.length > 0)
})

Then('I am told the bundle was assembled without meaning-based ranking', function (this: DepWorld) {
  notice(this, 'keyword-only')
})

Then('I am told how to build the index', function (this: DepWorld) {
  const n = notice(this, 'keyword-only') as any
  assert.ok(String(n.hint ?? n.message).includes('dep vectorize'), JSON.stringify(n))
})
