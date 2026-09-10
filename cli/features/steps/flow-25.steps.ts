import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { DepWorld, daysAgo, freshnessBody, unrelatedBody } from '../support/world'
import { notice } from './common.steps'

/** reference cadence is 30 days: ≤30 fresh, ≤60 ageing, beyond that stale */
const FRESH_AGE = 1
const AGEING_AGE = 45
const STALE_AGE = 400

Given('a project whose documents declare when they were last verified', function (this: DepWorld) {
  this.seedDefaultDocs()
})

Given('whose configuration declares a review cadence per document type', function (this: DepWorld) {
  this.cadence = { tutorial: 90, 'how-to': 60, reference: 30, explanation: 180, 'decision-record': 365 }
})

Given('a document that is past its review cadence matches my question', function (this: DepWorld) {
  this.subject = 'docs/reference/old-freshness.md'
  this.addDoc({ path: this.subject, type: 'reference', title: 'Freshness, as it used to be decided', lastVerified: daysAgo(STALE_AGE, this.now), body: freshnessBody() })
})

Given('a document approaching its review cadence matches my question', function (this: DepWorld) {
  this.subject = 'docs/reference/ageing-freshness.md'
  this.addDoc({ path: this.subject, type: 'reference', title: 'Freshness, decided last season', lastVerified: daysAgo(AGEING_AGE, this.now), body: freshnessBody() })
})

Given('expired documents match my question', function (this: DepWorld) {
  const paths = ['docs/reference/expired-a.md', 'docs/reference/expired-b.md']
  paths.forEach((path, i) => this.addDoc({ path, type: 'reference', title: `Expired freshness notes ${i + 1}`, lastVerified: daysAgo(STALE_AGE + i, this.now), body: freshnessBody() }))
  this.notes.set('expired', paths)
})

When('I ask for context and declare that expired knowledge is acceptable', async function (this: DepWorld) {
  await this.ask(this.question, { ...this.options, freshness: 'include-stale' })
})

When('I ask for context without declaring a freshness preference', async function (this: DepWorld) {
  const { freshness: _omit, ...rest } = this.options
  await this.ask(this.question, rest)
})

When('I ask for context without declaring that expired knowledge is acceptable', async function (this: DepWorld) {
  const { freshness: _omit, ...rest } = this.options
  await this.ask(this.question, rest)
})

When('I ask for context declaring a freshness preference the product does not define', async function (this: DepWorld) {
  await this.ask(this.question, { ...this.options, freshness: 'whenever' as never })
})

Then('its passages are absent from the bundle', function (this: DepWorld) {
  assert.ok(this.bundle, `no bundle; error: ${this.errorMessage()}`)
  assert.equal(this.passagesFrom(this.subject).length, 0, `${this.subject} was served`)
})

Then('its passages are present in the bundle', function (this: DepWorld) {
  assert.ok(this.bundle, `no bundle; error: ${this.errorMessage()}`)
  assert.ok(this.passagesFrom(this.subject).length > 0, `${this.subject} not served; passages: ${this.bundle!.passages.map((p) => p.document)}`)
})

Then('I am told a matching document was withheld for being past its review date', function (this: DepWorld) {
  const n = notice(this, 'withheld-stale') as any
  assert.ok((n.documents as string[]).includes(this.subject))
  assert.ok(this.bundle!.withheld.some((w) => w.document === this.subject && w.reason === 'stale'))
})

Then('each carries the date it was last verified', function (this: DepWorld) {
  const subjects = (this.notes.get('expired') as string[] | undefined) ?? [this.subject]
  for (const path of subjects) for (const p of this.passagesFrom(path)) {
    assert.ok(p.freshness.lastVerified, `${path} carries no verification date`)
  }
})

Then('each is marked as approaching its review date', function (this: DepWorld) {
  for (const p of this.passagesFrom(this.subject)) assert.equal(p.freshness.state, 'aging')
})

Then('their passages are present in the bundle', function (this: DepWorld) {
  for (const path of this.notes.get('expired') as string[]) {
    assert.ok(this.passagesFrom(path).length > 0, `${path} not served`)
  }
})

Then('each is marked as past its review date', function (this: DepWorld) {
  const subjects = (this.notes.get('expired') as string[] | undefined) ?? [this.subject]
  for (const path of subjects) for (const p of this.passagesFrom(path)) assert.equal(p.freshness.state, 'stale')
})

Given('a matching document whose freshness is {string}', function (this: DepWorld, state: string) {
  const age = state === 'fresh' ? FRESH_AGE : state === 'ageing' ? AGEING_AGE : STALE_AGE
  this.subject = `docs/reference/${state}-doc.md`
  this.addDoc({ path: this.subject, type: 'reference', title: `Freshness decided (${state})`, lastVerified: daysAgo(age, this.now), body: freshnessBody() })
})

Then('it is {string}', function (this: DepWorld, treatment: string) {
  const passages = this.passagesFrom(this.subject)
  switch (treatment) {
    case 'served without a freshness remark':
      assert.ok(passages.length > 0, 'not served')
      for (const p of passages) { assert.equal(p.freshness.state, 'fresh'); assert.equal(p.freshness.note, undefined) }
      break
    case 'served and marked as ageing':
      assert.ok(passages.length > 0, 'not served')
      for (const p of passages) assert.equal(p.freshness.state, 'aging')
      break
    case 'withheld and reported as withheld':
      assert.equal(passages.length, 0, 'was served')
      assert.ok(this.bundle!.withheld.some((w) => w.document === this.subject))
      break
    default:
      assert.fail(`unknown treatment ${treatment}`)
  }
})

Given('a matching document that declares confidence {string}', function (this: DepWorld, confidence: string) {
  this.subject = 'docs/reference/confident.md'
  this.addDoc({ path: this.subject, type: 'reference', title: 'Freshness decided, with confidence', confidence, body: freshnessBody() })
})

Then('its passages carry the declared confidence {string}', function (this: DepWorld, confidence: string) {
  const passages = this.passagesFrom(this.subject)
  assert.ok(passages.length > 0, 'not served')
  for (const p of passages) assert.equal(p.confidence, confidence)
})

Given('a fresh passage is selected for the bundle', function (this: DepWorld) {
  this.notes.set('fresh', 'docs/explanation/freshness.md')
})

Given('a document it requires is past its review date', function (this: DepWorld) {
  this.subject = 'docs/reference/required-old.md'
  this.addDoc({ path: this.subject, type: 'reference', title: 'Verification dates', lastVerified: daysAgo(STALE_AGE, this.now), body: unrelatedBody('recording verification dates in the metadata block') })
  this.relate(this.notes.get('fresh') as string, this.subject, 'REQUIRES')
})

Then('the required document is present in the bundle', function (this: DepWorld) {
  assert.ok(this.passagesFrom(this.subject).length > 0, `${this.subject} not served; passages: ${this.bundle!.passages.map((p) => p.document)}`)
})

Then('it is marked as past its review date', function (this: DepWorld) {
  for (const p of this.passagesFrom(this.subject)) assert.equal(p.freshness.state, 'stale')
})

Then('I am told it was included because a served passage requires it', function (this: DepWorld) {
  const [p] = this.passagesFrom(this.subject)
  assert.ok(p)
  assert.equal(p!.reason.kind, 'required-by')
  assert.equal(p!.reason.via, this.notes.get('fresh'))
  assert.ok(String(p!.freshness.note).includes('requires'))
})

Given('every document matching my question is past its review date', function (this: DepWorld) {
  this.docs.clear()
  const paths = ['docs/reference/expired-a.md', 'docs/reference/expired-b.md']
  paths.forEach((path, i) => this.addDoc({ path, type: 'reference', title: `Expired freshness notes ${i + 1}`, lastVerified: daysAgo(STALE_AGE + i * 10, this.now), body: freshnessBody() }))
  this.addDoc({ path: 'docs/how-to/install.md', type: 'how-to', title: 'Install the binary', body: unrelatedBody() })
  this.notes.set('expired', paths)
})

Then('I am told matches exist but all of them have expired', function (this: DepWorld) {
  notice(this, 'all-stale')
})

Then('I am told the most recent verification date among them', function (this: DepWorld) {
  const n = notice(this, 'all-stale') as any
  const latest = (this.notes.get('expired') as string[]).map((p) => this.docs.get(p)!.lastVerified!).sort().pop()
  assert.equal(n.latestVerified, latest)
})

Given('a document declares a verification date later than today', function (this: DepWorld) {
  this.subject = 'docs/reference/from-the-future.md'
  this.addDoc({ path: this.subject, type: 'reference', title: 'Freshness decided tomorrow', lastVerified: daysAgo(-30, this.now), body: freshnessBody() })
})

Then('it is treated as verified now', function (this: DepWorld) {
  const passages = this.passagesFrom(this.subject)
  assert.ok(passages.length > 0, 'not served')
  for (const p of passages) assert.equal(p.freshness.state, 'fresh')
})

Then('I am told its verification date is later than today', function (this: DepWorld) {
  const n = notice(this, 'future-verified') as any
  assert.equal(n.document, this.subject)
})

Given("the project's configuration declares no review cadence for a matched document's type", function (this: DepWorld) {
  this.subject = 'docs/explanation/freshness.md'
  delete this.cadence['explanation']
  this.written = false
})

Then('each is marked as having unknown freshness', function (this: DepWorld) {
  for (const p of this.passagesFrom(this.subject)) assert.equal(p.freshness.state, 'unknown')
})

Then('I am told which cadence the configuration is missing', function (this: DepWorld) {
  const n = notice(this, 'missing-cadence') as any
  assert.equal(n.type, 'explanation')
})

Then('I am told which freshness preferences are accepted', function (this: DepWorld) {
  const m = this.errorMessage()
  assert.ok(m.includes('withhold-stale') && m.includes('include-stale') && m.includes('fresh-only'), m)
})
