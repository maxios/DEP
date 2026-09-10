import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { DepWorld, freshnessBody, unrelatedBody } from '../support/world'
import { notice } from './common.steps'

Given('a project whose configuration declares its audiences', function (this: DepWorld) {
  this.seedDefaultDocs()
})

Given('whose documents declare the audiences they are written for', function (this: DepWorld) {
  // every fixture document declares its audiences in frontmatter
})

Given('documents in the set are written for different audiences', function (this: DepWorld) {
  this.docs.get('docs/explanation/freshness.md')!.audience = ['ai-agent']
  this.docs.get('docs/reference/lifecycle-states.md')!.audience = ['human-author']
  this.addDoc({ path: 'docs/reference/freshness-for-people.md', type: 'reference', title: 'Freshness, explained for people', audience: ['human-author'], body: freshnessBody() })
  this.written = false
})

When('I ask for context and declare the audience I am retrieving for', async function (this: DepWorld) {
  await this.ask(this.question, { ...this.options, audience: 'ai-agent' })
})

Then('every passage in the bundle comes from a document written for that audience', function (this: DepWorld) {
  assert.ok(this.bundle, this.errorMessage())
  assert.ok(this.bundle!.passages.length > 0, 'nothing served')
  for (const p of this.bundle!.passages) assert.ok(p.audience.includes('ai-agent'), `${p.document} is for ${p.audience}`)
})

Then('documents written only for other audiences are absent', function (this: DepWorld) {
  for (const [path, spec] of this.docs) {
    if (spec.audience && !spec.audience.includes('ai-agent')) {
      assert.equal(this.passagesFrom(path).length, 0, `${path} served although written for ${spec.audience}`)
    }
  }
})

When('I ask for context and confine the request to one part of the documentation set', async function (this: DepWorld) {
  this.notes.set('within', 'docs/reference')
  await this.ask(this.question, { ...this.options, within: 'docs/reference' })
})

Then('every passage comes from that part', function (this: DepWorld) {
  assert.ok(this.bundle, this.errorMessage())
  assert.ok(this.bundle!.passages.length > 0, 'nothing served')
  for (const p of this.bundle!.passages) assert.ok(p.document.startsWith('docs/reference/'), p.document)
})

Then('I am told how many documents were considered', function (this: DepWorld) {
  const within = this.notes.get('within') as string
  const expected = [...this.docs.keys()].filter((p) => p.startsWith(within + '/')).length
  assert.equal(this.bundle!.considered, expected)
})

When('I ask for context restricted by audience and by subject tag at once', async function (this: DepWorld) {
  this.docs.get('docs/reference/lifecycle-states.md')!.audience = ['ai-agent']
  this.docs.get('docs/reference/lifecycle-states.md')!.tags = ['lifecycle']
  this.addDoc({ path: 'docs/reference/freshness-for-people.md', type: 'reference', title: 'Freshness for people', audience: ['human-author'], tags: ['freshness'], body: freshnessBody() })
  this.notes.set('onlyAudience', 'docs/reference/lifecycle-states.md')
  this.notes.set('onlyTag', 'docs/reference/freshness-for-people.md')
  this.written = false
  await this.ask(this.question, { ...this.options, audience: 'ai-agent', tags: ['freshness'] })
})

Then('every passage satisfies both restrictions', function (this: DepWorld) {
  assert.ok(this.bundle, this.errorMessage())
  assert.ok(this.bundle!.passages.length > 0, 'nothing served')
  for (const p of this.bundle!.passages) {
    assert.ok(p.audience.includes('ai-agent'), p.document)
    assert.ok(p.tags.includes('freshness'), p.document)
  }
})

Then('a passage satisfying only one of them is absent', function (this: DepWorld) {
  assert.equal(this.passagesFrom(this.notes.get('onlyAudience') as string).length, 0)
  assert.equal(this.passagesFrom(this.notes.get('onlyTag') as string).length, 0)
})

When('I ask for context restricted to documents of type {string}', async function (this: DepWorld, type: string) {
  this.addDoc({ path: 'docs/tutorials/freshness-tutorial.md', type: 'tutorial', title: 'Learn how freshness is decided', body: freshnessBody() })
  this.addDoc({ path: 'docs/how-to/check-freshness.md', type: 'how-to', title: 'Check how freshness was decided', body: freshnessBody() })
  this.addDoc({ path: 'docs/decision-records/adopt-cadence.md', type: 'decision-record', title: 'Decide freshness by cadence', body: freshnessBody() })
  await this.ask(this.question, { ...this.options, type })
})

Then('every passage comes from a document of type {string}', function (this: DepWorld, type: string) {
  assert.ok(this.bundle, this.errorMessage())
  assert.ok(this.bundle!.passages.length > 0, `nothing served for type ${type}`)
  for (const p of this.bundle!.passages) assert.equal(p.type, type, p.document)
})

Given('a document that satisfies my restriction is a weaker match than many documents that do not', function (this: DepWorld) {
  this.docs.clear()
  for (let i = 0; i < 25; i++) {
    this.addDoc({ path: `docs/explanation/freshness-${String(i).padStart(2, '0')}.md`, type: 'explanation', title: 'How freshness is decided', audience: ['ai-agent'], tags: ['freshness'], body: freshnessBody(`Variant ${i} of the same explanation, decided the same way.`) })
  }
  this.subject = 'docs/reference/notes-for-people.md'
  this.addDoc({ path: this.subject, type: 'reference', title: 'Notes', audience: ['human-author'], body: freshnessBody() })
})

When('I ask for context with that restriction', async function (this: DepWorld) {
  await this.ask(this.question, { ...this.options, audience: 'human-author' })
})

Then('that document is still considered for the bundle', function (this: DepWorld) {
  assert.ok(this.bundle, this.errorMessage())
  assert.ok(this.bundle!.considered >= 1)
})

Then('it is present if it is relevant enough to earn its place', function (this: DepWorld) {
  assert.ok(this.passagesFrom(this.subject).length > 0, `${this.subject} absent; served: ${this.bundle!.passages.map((p) => p.document)}`)
})

Then('the restriction is applied before the field is narrowed, not after', function (this: DepWorld) {
  const satisfying = [...this.docs.values()].filter((d) => (d.audience ?? []).includes('human-author')).length
  assert.equal(this.bundle!.considered, satisfying)
})

When('I ask for context with a restriction no document satisfies', async function (this: DepWorld) {
  await this.ask(this.question, { ...this.options, tags: ['no-such-subject'] })
})

Then('I am told the restriction excluded every candidate', function (this: DepWorld) {
  notice(this, 'restriction-excluded-all')
  assert.equal(this.bundle!.considered, 0)
})

Given('a project whose configuration declares no audiences', function (this: DepWorld) {
  this.audiences = []
  this.docs.clear()
  this.addDoc({ path: 'docs/explanation/freshness.md', type: 'explanation', title: 'How freshness is decided', audience: [], body: freshnessBody() })
  this.addDoc({ path: 'docs/how-to/install.md', type: 'how-to', title: 'Install', audience: [], body: unrelatedBody() })
})

When('I ask for context restricted to an audience', async function (this: DepWorld) {
  await this.ask(this.question, { ...this.options, audience: 'ai-agent' })
})

Then('I am told the project declares no audiences to restrict by', function (this: DepWorld) {
  assert.ok(this.errorMessage().includes('declares no audiences'), this.errorMessage())
})

Then('I am told an unrestricted request would still succeed', function (this: DepWorld) {
  assert.ok(this.errorMessage().includes('unrestricted request would still succeed'), this.errorMessage())
})

When("I ask for context declaring an audience absent from the project's configuration", async function (this: DepWorld) {
  await this.ask(this.question, { ...this.options, audience: 'robot-overlord' })
})

Then('I am told which audiences the project declares', function (this: DepWorld) {
  const m = this.errorMessage()
  for (const a of this.audiences) assert.ok(m.includes(a.id), `${m} does not name ${a.id}`)
})

When('I ask for context restricted to a type the protocol does not define', async function (this: DepWorld) {
  await this.ask(this.question, { ...this.options, type: 'manual' })
})

Then('I am told the five accepted types', function (this: DepWorld) {
  const m = this.errorMessage()
  for (const t of ['tutorial', 'how-to', 'reference', 'explanation', 'decision-record']) assert.ok(m.includes(t), `${m} does not name ${t}`)
})
