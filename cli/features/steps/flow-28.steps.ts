import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { DepWorld } from '../support/world'
import { notice } from './common.steps'

Then('each passage names its source document and the section within it', function (this: DepWorld) {
  assert.ok(this.bundle, this.errorMessage())
  assert.ok(this.bundle!.passages.length > 0)
  for (const p of this.bundle!.passages) {
    assert.ok(p.document.length > 0)
    assert.ok(p.section.length > 0)
  }
})

Then('each passage carries the size it contributed to the budget', function (this: DepWorld) {
  for (const p of this.bundle!.passages) assert.ok(p.tokens > 0)
  assert.equal(this.bundle!.budget.used, this.bundle!.passages.reduce((s, p) => s + p.tokens, 0))
})

Then('each passage declares whether it matched my question directly, was required by another passage, or was reached by expanding from one', function (this: DepWorld) {
  for (const p of this.bundle!.passages) assert.ok(['match', 'required-by', 'expanded-from'].includes(p.reason.kind), p.reason.kind)
})

Then('a passage present only as background is not presented as an answer', function (this: DepWorld) {
  const background = this.passagesFrom(this.notes.get('background') as string)
  assert.ok(background.length > 0, 'background passage was not served')
  for (const p of background) {
    assert.notEqual(p.reason.kind, 'match')
    assert.ok(p.reason.via, 'background passage does not say what it supports')
  }
})

Given('I have answered a question from a bundle', async function (this: DepWorld) {
  await this.ask()
  assert.ok(this.bundle, this.errorMessage())
})

When('I am asked where the answer came from', function (this: DepWorld) {
  // the bundle already carries the answer
})

Then('I can name the document and section behind each part of it', function (this: DepWorld) {
  for (const p of this.bundle!.passages) {
    assert.ok(p.document && p.section)
    assert.ok(this.docs.has(p.document))
  }
})

Then('I can state when each was last verified', function (this: DepWorld) {
  for (const p of this.bundle!.passages) assert.ok(p.freshness.lastVerified)
})

Given('the documentation set and the index have not changed', async function (this: DepWorld) {
  await this.materialise()
})

When('I ask the same question with the same budget and restrictions twice', async function (this: DepWorld) {
  await this.ask(this.question, { budget: 2000, audience: 'ai-agent' })
  await this.ask(this.question, { budget: 2000, audience: 'ai-agent' })
})

Then('I receive the same passages in the same order both times', function (this: DepWorld) {
  assert.ok(this.previousBundle && this.bundle)
  assert.deepEqual(this.bundle!.passages.map((p) => p.id), this.previousBundle!.passages.map((p) => p.id))
  assert.equal(this.bundle!.id, this.previousBundle!.id)
})

Given('a document was edited after the index was last built', async function (this: DepWorld) {
  await this.materialise()
  this.subject = 'docs/explanation/freshness.md'
  this.editDoc(this.subject, ' This sentence was added after the index was built.')
})

When('a passage from that document is selected for a bundle', async function (this: DepWorld) {
  await this.ask()
  assert.ok(this.passagesFrom(this.subject).length > 0, `${this.subject} not served`)
})

Then('that passage is marked as possibly out of step with its document', function (this: DepWorld) {
  for (const p of this.passagesFrom(this.subject)) assert.equal(p.outOfSync, true)
})

Then('I am told how to bring the index up to date', function (this: DepWorld) {
  const n = notice(this, 'index-out-of-sync') as any
  assert.ok(String(n.hint).includes('dep vectorize'))
})

Then('I am told when the index it was drawn from was last built', function (this: DepWorld) {
  assert.ok(this.bundle, this.errorMessage())
  assert.ok(this.bundle!.index.builtAt, 'no builtAt')
  assert.ok(!isNaN(new Date(this.bundle!.index.builtAt!).getTime()))
})

Given('a matched document declares no owner', function (this: DepWorld) {
  this.subject = 'docs/explanation/freshness.md'
  this.docs.get(this.subject)!.owner = null
  this.written = false
})

Then("the passage names the project's fallback owner", function (this: DepWorld) {
  const passages = this.passagesFrom(this.subject)
  assert.ok(passages.length > 0)
  for (const p of passages) assert.equal(p.owner.id, this.fallbackOwner)
})

Then('it is marked as inheriting that owner rather than declaring one', function (this: DepWorld) {
  for (const p of this.passagesFrom(this.subject)) assert.equal(p.owner.inherited, true)
})

Given('the index still holds passages from a document that no longer exists', async function (this: DepWorld) {
  await this.materialise()
  const gone = 'docs/reference/lifecycle-states.md'
  this.removeDoc(gone)
  this.notes.set('absent', [gone])
})

Then('I am told the index is behind the documentation set', function (this: DepWorld) {
  const n = notice(this, 'index-behind') as any
  assert.deepEqual(n.documents, this.notes.get('absent'))
})

When('I ask for context and request the passages without their provenance', async function (this: DepWorld) {
  await this.ask(this.question, { ...this.options, provenance: false })
})

Then('I am told provenance is part of every bundle', function (this: DepWorld) {
  assert.ok(this.errorMessage().includes('provenance is part of every bundle'), this.errorMessage())
})

Then('a bundle is never produced with passages that cannot be traced', function (this: DepWorld) {
  assert.equal(this.bundle, undefined)
})
