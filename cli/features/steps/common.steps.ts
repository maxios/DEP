import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { DepWorld, DEFAULT_QUESTION, UNCOVERED_QUESTION } from '../support/world'

// ── project ──────────────────────────────────────────────────────────────

Given('a project configured for DEP', function (this: DepWorld) {
  this.configured = true
  this.seedDefaultDocs()
})

Given('a project configured for DEP and indexed for retrieval', function (this: DepWorld) {
  this.configured = true
  this.wantIndex = true
  this.seedDefaultDocs()
})

Given('its documents have been indexed for meaning-based retrieval', function (this: DepWorld) {
  this.wantIndex = true
})

Given('a project that holds no DEP configuration', function (this: DepWorld) {
  this.configured = false
  this.written = false
})

Given('the set has never been indexed for meaning', function (this: DepWorld) {
  this.wantIndex = false
  this.dropIndex()
})

// ── budget ───────────────────────────────────────────────────────────────

Given('I declare a budget of {int} tokens', function (this: DepWorld, budget: number) {
  this.options.budget = budget
})

Given('I declare a budget', function (this: DepWorld) {
  this.options.budget = 8000
})

Given('I declare a budget of {string}', function (this: DepWorld, raw: string) {
  this.options.budget = Number(raw)
})

// ── asking ───────────────────────────────────────────────────────────────

When('I ask for context', async function (this: DepWorld) {
  await this.ask()
})

When('I ask for context for {string}', async function (this: DepWorld, question: string) {
  this.question = question
  await this.ask(question)
})

When('I ask for context for a question', async function (this: DepWorld) {
  await this.ask(DEFAULT_QUESTION)
})

When('I ask for context for a question the set covers well', async function (this: DepWorld) {
  await this.ask(DEFAULT_QUESTION)
})

When('I ask for context for a subject the set does not cover', async function (this: DepWorld) {
  await this.ask(UNCOVERED_QUESTION)
})

When('I ask for context with a budget of {string}', async function (this: DepWorld, raw: string) {
  const budget = /^-?\d+$/.test(raw) ? Number(raw) : raw
  await this.ask(this.question, { ...this.options, budget: budget as unknown as number })
})

// ── generic verdicts ─────────────────────────────────────────────────────

Then('I receive a bundle of passages', function (this: DepWorld) {
  assert.ok(this.bundle, `no bundle; error was: ${this.errorMessage()}`)
  assert.ok(this.bundle!.passages.length > 0, 'bundle has no passages')
})

Then('I receive an empty bundle', function (this: DepWorld) {
  assert.ok(this.bundle, `no bundle; error was: ${this.errorMessage()}`)
  assert.equal(this.bundle!.passages.length, 0, `expected no passages, got ${this.bundle!.passages.map((p) => p.document)}`)
})

Then('the request is refused', function (this: DepWorld) {
  assert.ok(this.error, 'expected the request to be refused, but it succeeded')
  assert.equal(this.bundle, undefined)
})

Then('I am told {string}', function (this: DepWorld, text: string) {
  const message = this.errorMessage()
  assert.ok(message.includes(text), `expected message to include "${text}", got "${message}"`)
})

Then('no bundle is produced', function (this: DepWorld) {
  assert.equal(this.bundle, undefined)
})

Then('this is reported as an answer, not as a failure', function (this: DepWorld) {
  assert.equal(this.error, undefined, `unexpected failure: ${this.errorMessage()}`)
  assert.ok(this.bundle)
})

Then('I am told which configuration file is missing', function (this: DepWorld) {
  assert.ok(this.error, 'expected an error')
  assert.ok(this.errorMessage().includes('.docspec'), `message does not name .docspec: ${this.errorMessage()}`)
})

export function notice(world: DepWorld, code: string) {
  const found = world.bundle?.notices.find((n) => n.code === code)
  assert.ok(found, `expected a "${code}" notice, got: ${JSON.stringify(world.bundle?.notices)}`)
  return found!
}
