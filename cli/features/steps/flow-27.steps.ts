import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { DepWorld, freshnessBody, unrelatedBody } from '../support/world'
import { notice } from './common.steps'

const ANSWER = 'docs/explanation/freshness.md'

Given('a project whose documents declare typed relationships to each other', function (this: DepWorld) {
  this.seedDefaultDocs()
})

Given('the passage answering my question comes from a document that requires another document', function (this: DepWorld) {
  this.subject = 'docs/reference/verification-dates.md'
  this.addDoc({ path: this.subject, type: 'reference', title: 'Verification dates', body: unrelatedBody('recording verification dates in the metadata block') })
  this.relate(ANSWER, this.subject, 'REQUIRES')
})

Then('it appears before the passage that requires it', function (this: DepWorld) {
  const docs = this.bundle!.passages.map((p) => p.document)
  const required = docs.indexOf(this.subject)
  const dependent = docs.indexOf(ANSWER)
  assert.ok(required >= 0 && dependent >= 0, `both must be served: ${docs}`)
  assert.ok(required < dependent, `required at ${required}, dependent at ${dependent}`)
})

Given('two documents match my question equally well', function (this: DepWorld) {
  this.docs.clear()
  const body = freshnessBody()
  // The widely-required one sorts later by path, so only ranking can put it first.
  this.addDoc({ path: 'docs/reference/freshness-a.md', type: 'reference', title: 'Freshness decided', body })
  this.addDoc({ path: 'docs/reference/freshness-b.md', type: 'reference', title: 'Freshness decided', body })
  this.notes.set('first', 'docs/reference/freshness-b.md')
  this.notes.set('second', 'docs/reference/freshness-a.md')
})

Given('many other documents in the set require the first one', function (this: DepWorld) {
  for (let i = 0; i < 4; i++) {
    const path = `docs/how-to/procedure-${i}.md`
    this.addDoc({ path, type: 'how-to', title: `Procedure ${i}`, body: unrelatedBody(`procedure number ${i}`) })
    this.relate(path, this.notes.get('first') as string, 'REQUIRES')
  }
})

Given('nothing requires the second', function (this: DepWorld) {
  // no relationships point at it
})

Then('the first appears before the second in the bundle', function (this: DepWorld) {
  const docs = this.bundle!.passages.map((p) => p.document)
  const first = docs.indexOf(this.notes.get('first') as string)
  const second = docs.indexOf(this.notes.get('second') as string)
  assert.ok(first >= 0 && second >= 0, `both must be served: ${docs}`)
  assert.ok(first < second, `first at ${first}, second at ${second}`)
})

Then('if only one of them fits the budget, it is the first', async function (this: DepWorld) {
  const first = this.notes.get('first') as string
  const size = this.passagesFrom(first)[0]!.tokens
  await this.ask(this.question, { ...this.options, budget: size })
  assert.deepEqual(this.bundle!.passages.map((p) => p.document), [first])
})

When('I ask for context and declare how many relationships deep the expansion may reach', async function (this: DepWorld) {
  const chain = ['docs/reference/depth-1.md', 'docs/reference/depth-2.md', 'docs/reference/depth-3.md']
  chain.forEach((path, i) => this.addDoc({ path, type: 'reference', title: `Depth ${i + 1}`, body: unrelatedBody(`the topic at depth ${i + 1}`) }))
  this.relate(ANSWER, chain[0]!, 'REQUIRES')
  this.relate(chain[0]!, chain[1]!, 'REQUIRES')
  this.relate(chain[1]!, chain[2]!, 'REQUIRES')
  this.notes.set('chain', chain)
  this.options.depth = 2
  await this.ask(this.question, this.options)
})

Then('no passage in the bundle is further from a matched passage than the depth I declared', function (this: DepWorld) {
  const [d1, d2, d3] = this.notes.get('chain') as string[]
  assert.ok(this.passagesFrom(d1!).length > 0, 'depth 1 missing')
  assert.ok(this.passagesFrom(d2!).length > 0, 'depth 2 missing')
  assert.equal(this.passagesFrom(d3!).length, 0, 'depth 3 must be beyond reach')
})

Then('I am told how many passages were reached by expansion rather than by matching', function (this: DepWorld) {
  assert.equal(this.bundle!.reached.expanded, 2)
  assert.equal(this.bundle!.reached.matched, this.bundle!.passages.length - 2)
})

const RELATIONSHIPS = ['REQUIRES', 'TEACHES', 'EXPLAINS', 'USES', 'NEXT', 'INLINE']

Given('a matched document relates to a neighbouring document as {string}', function (this: DepWorld, relationship: string) {
  this.docs.clear()
  const matched = 'docs/explanation/freshness.md'
  let inline = ''
  for (const rel of RELATIONSHIPS) {
    const path = `docs/reference/${rel.toLowerCase()}-neighbour.md`
    this.addDoc({ path, type: 'reference', title: 'Neighbouring topic', body: unrelatedBody('a neighbouring topic that the matched document points at') })
    if (rel === 'INLINE') inline = ` See also [the neighbour](../reference/${rel.toLowerCase()}-neighbour.md).`
  }
  this.addDoc({ path: matched, type: 'explanation', title: 'How freshness is decided', body: freshnessBody() + inline })
  for (const rel of RELATIONSHIPS) if (rel !== 'INLINE') this.relate(matched, `docs/reference/${rel.toLowerCase()}-neighbour.md`, rel)
  this.notes.set('relationship', relationship)
  this.notes.set('matched', matched)
})

When('I ask for context with a budget that can hold only some of the candidates', async function (this: DepWorld) {
  await this.ask(this.question, { ...this.options, budget: 8000 })
  const matched = this.passagesFrom(this.notes.get('matched') as string)[0]!
  const neighbour = this.bundle!.passages.find((p) => p.document !== matched.document)!
  await this.ask(this.question, { ...this.options, budget: matched.tokens + 3 * neighbour.tokens })
})

Then("the neighbour's chance of being pulled in is {string}", function (this: DepWorld, influence: string) {
  const rel = this.notes.get('relationship') as string
  const path = `docs/reference/${rel.toLowerCase()}-neighbour.md`
  const neighbours = this.bundle!.passages.filter((p) => p.document !== this.notes.get('matched')).map((p) => p.document)
  const served = neighbours.includes(path)
  switch (influence) {
    case 'strongest':
      assert.ok(served, `${rel} neighbour absent: ${neighbours}`)
      assert.equal(neighbours[0], path, `${rel} must come first among neighbours: ${neighbours}`)
      break
    case 'strong':
      assert.ok(served, `${rel} neighbour absent: ${neighbours}`)
      break
    default:
      assert.ok(!served, `${rel} neighbour (${influence}) should not fit: ${neighbours}`)
  }
})

Given('a matched passage requires more knowledge than the budget can hold', function (this: DepWorld) {
  const chain = ['docs/reference/needed-1.md', 'docs/reference/needed-2.md', 'docs/reference/needed-3.md']
  chain.forEach((path, i) => {
    this.addDoc({ path, type: 'reference', title: `Needed ${i + 1}`, body: unrelatedBody(`background number ${i + 1}`) })
    this.relate(ANSWER, path, 'REQUIRES')
  })
  this.notes.set('chain', chain)
  this.notes.set('tightBudget', true)
})

Then("the bundle's total size is still at or below the budget", async function (this: DepWorld) {
  if (this.notes.get('tightBudget')) {
    const answer = this.passagesFrom(ANSWER)[0]!
    await this.ask(this.question, { ...this.options, budget: answer.tokens + 20 })
  }
  const total = this.bundle!.passages.reduce((s, p) => s + p.tokens, 0)
  assert.ok(total <= this.bundle!.budget.declared, `${total} > ${this.bundle!.budget.declared}`)
})

Then('I am told the prerequisite chain did not fit', function (this: DepWorld) {
  notice(this, 'chain-truncated')
})

Then('I am given the ordered list of what was left out', function (this: DepWorld) {
  const n = notice(this, 'chain-truncated') as any
  assert.deepEqual(n.omitted, this.notes.get('chain'))
})

Given('two documents each require the other', function (this: DepWorld) {
  this.docs.clear()
  this.addDoc({ path: 'docs/reference/loop-a.md', type: 'reference', title: 'How freshness is decided', body: freshnessBody() })
  this.addDoc({ path: 'docs/reference/loop-b.md', type: 'reference', title: 'Loop B', body: unrelatedBody('the other half of a circular explanation') })
  this.relate('docs/reference/loop-a.md', 'docs/reference/loop-b.md', 'REQUIRES')
  this.relate('docs/reference/loop-b.md', 'docs/reference/loop-a.md', 'REQUIRES')
})

Given('one of them matches my question', function (this: DepWorld) {
  // loop-a carries the freshness explanation
})

Then('the bundle is still produced', function (this: DepWorld) {
  assert.ok(this.bundle, `no bundle; error: ${this.errorMessage()}`)
  assert.ok(this.bundle!.passages.length > 0)
})

Then('each document appears at most once', function (this: DepWorld) {
  const docs = this.bundle!.passages.map((p) => p.document)
  assert.equal(new Set(docs).size, docs.length, `duplicates in ${docs}`)
})

Then('I am told the requirement chain closes on itself', function (this: DepWorld) {
  notice(this, 'requirement-cycle')
})

Given('a matched document requires a document that is absent from the set', function (this: DepWorld) {
  this.relate(ANSWER, 'docs/reference/ghost.md', 'REQUIRES')
})

Then('I am told which required document could not be found', function (this: DepWorld) {
  const n = notice(this, 'missing-prerequisite') as any
  assert.equal(n.required, 'docs/reference/ghost.md')
})

When('I ask for context declaring an expansion depth of {string}', async function (this: DepWorld, raw: string) {
  const depth = /^-?\d+$/.test(raw) ? Number(raw) : raw
  await this.ask(this.question, { ...this.options, depth: depth as unknown as number })
})

When('I ask for context and decline expansion along relationships', async function (this: DepWorld) {
  this.subject = 'docs/reference/verification-dates.md'
  this.addDoc({ path: this.subject, type: 'reference', title: 'Verification dates', body: unrelatedBody('recording verification dates') })
  this.relate(ANSWER, this.subject, 'REQUIRES')
  await this.ask(this.question, { ...this.options, expand: false })
})

Then('every passage in the bundle is there because it matched my question', function (this: DepWorld) {
  assert.ok(this.bundle!.passages.length > 0)
  for (const p of this.bundle!.passages) assert.equal(p.reason.kind, 'match', p.document)
})

Then('no passage is present solely because another passage requires it', function (this: DepWorld) {
  assert.equal(this.passagesFrom(this.subject).length, 0)
})
