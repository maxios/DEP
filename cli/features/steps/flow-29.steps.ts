import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { DepWorld, DEFAULT_QUESTION } from '../support/world'
import { openDocumentationSet, DepError } from '../../src/lib'
import type { Bundle, DocumentationSet } from '../../src/lib'

Given('I have added DEP to my project as a dependency', function (this: DepWorld) {
  // the step definitions import the library the way an application would
})

When('I ask for context from my own code', async function (this: DepWorld) {
  await this.materialise()
  await this.countingProcesses(() => this.capturingOutput(() => this.ask()))
})

Then('I receive the bundle as a value I can work with', function (this: DepWorld) {
  assert.ok(this.bundle, this.errorMessage())
  assert.ok(Array.isArray(this.bundle!.passages))
  assert.equal(typeof this.bundle!.budget.used, 'number')
})

Then('no separate process is started on my behalf', function (this: DepWorld) {
  assert.equal(this.spawnCalls, 0)
})

Given('I have opened a documentation set', async function (this: DepWorld) {
  await this.materialise()
})

When('I ask twenty questions against it in one run', async function (this: DepWorld) {
  const set = this.set!
  this.notes.set('loadsBefore', set.stats.loads)
  const bundles: Bundle[] = []
  for (let i = 0; i < 20; i++) {
    bundles.push(await set.context(i % 2 === 0 ? DEFAULT_QUESTION : 'what are the lifecycle states', { budget: 4000 }))
  }
  this.notes.set('bundles', bundles)
})

Then('every answer reflects the same documentation set', function (this: DepWorld) {
  const bundles = this.notes.get('bundles') as Bundle[]
  assert.equal(bundles.length, 20)
  const builtAt = bundles[0]!.index.builtAt
  for (const b of bundles) {
    assert.equal(b.index.builtAt, builtAt)
    assert.equal(b.considered, bundles[0]!.considered)
  }
})

Then('the set is not re-read from disk for each question', function (this: DepWorld) {
  assert.equal(this.set!.stats.loads, this.notes.get('loadsBefore'))
})

Given('the same project, question, budget and restrictions', async function (this: DepWorld) {
  await this.materialise()
  this.options = { budget: 3000, audience: 'ai-agent' }
})

When('I ask for context through the command and through my own code', async function (this: DepWorld) {
  this.runCli(['context', this.question, '--budget', '3000', '--audience', 'ai-agent', '--json', '--root', this.root])
  await this.ask(this.question, this.options)
})

Then('both produce the same passages in the same order', function (this: DepWorld) {
  assert.equal(this.cli!.code, 0, this.cli!.stderr)
  const fromCli = JSON.parse(this.cli!.stdout) as Bundle
  assert.ok(this.bundle, this.errorMessage())
  assert.deepEqual(fromCli.passages.map((p) => p.id), this.bundle!.passages.map((p) => p.id))
  assert.equal(fromCli.id, this.bundle!.id)
})

When('I request {string} from my own code', async function (this: DepWorld, capability: string) {
  await this.materialise()
  const set = this.set!
  this.result = await this.capturingOutput(async () => {
    switch (capability) {
      case 'a budgeted context bundle': return set.context(DEFAULT_QUESTION, { budget: 4000 })
      case 'a search over the set': return set.search(DEFAULT_QUESTION)
      case 'the documentation graph': return set.graph()
      case 'a validation verdict': return set.validate()
      case "a document's metadata": return set.metadata('docs/explanation/freshness.md')
      default: throw new Error(`unknown capability ${capability}`)
    }
  })
})

Then('I receive the result as a value', function (this: DepWorld) {
  assert.ok(this.result !== undefined && this.result !== null)
  assert.equal(typeof this.result, 'object')
})

Then("nothing is written to my program's output stream", function (this: DepWorld) {
  assert.deepEqual(this.captured.stdout, [])
  assert.deepEqual(this.captured.stderr, [])
})

When('I ask for context with a budget my program computed wrongly', async function (this: DepWorld) {
  await this.materialise()
  await this.capturingOutput(() => this.ask(this.question, { budget: Number.NaN }))
})

Then('I am handed a failure I can catch and recover from', function (this: DepWorld) {
  assert.ok(this.depError, `expected a DepError, got ${this.errorMessage() || 'nothing'}`)
  assert.ok(this.depError!.code)
})

Then('my program keeps running', function (this: DepWorld) {
  assert.ok(this.error instanceof Error)
})

Given('I point at a directory that holds no DEP configuration', function (this: DepWorld) {
  this.configured = false
  this.writeProject()
})

When('I open it from my own code', function (this: DepWorld) {
  this.error = undefined
  try {
    this.set = openDocumentationSet(this.root)
  } catch (err) {
    this.error = err
  }
})

Then('I am handed a failure naming the missing configuration', function (this: DepWorld) {
  assert.ok(this.depError)
  assert.equal(this.depError!.code, 'CONFIG_MISSING')
  assert.ok(this.errorMessage().includes('.docspec'))
})

When('I open a location that is not a directory', function (this: DepWorld) {
  this.ensureRoot()
  const file = join(this.root, 'not-a-directory.txt')
  writeFileSync(file, 'just a file')
  this.notes.set('location', file)
  this.error = undefined
  try {
    openDocumentationSet(file)
  } catch (err) {
    this.error = err
  }
})

Then('I am handed a failure naming the location', function (this: DepWorld) {
  assert.ok(this.depError)
  assert.ok(this.errorMessage().includes(this.notes.get('location') as string), this.errorMessage())
})

Given('I have opened two different documentation sets in one program', async function (this: DepWorld) {
  await this.materialise()
  const second = this.openSecondProject()
  this.notes.set('second', second)
})

When('I ask a question against each of them', async function (this: DepWorld) {
  const second = this.notes.get('second') as { set: DocumentationSet }
  this.notes.set('answerA', await this.set!.context(DEFAULT_QUESTION, { budget: 4000 }))
  this.notes.set('answerB', await second.set.context('how do I install the binary', { budget: 4000 }))
})

Then('each answer draws only on its own set', function (this: DepWorld) {
  const a = this.notes.get('answerA') as Bundle
  const b = this.notes.get('answerB') as Bundle
  const second = this.notes.get('second') as { docs: string[] }
  assert.ok(a.passages.length > 0 && b.passages.length > 0)
  for (const p of a.passages) assert.ok(this.docs.has(p.document), `A served ${p.document}`)
  for (const p of b.passages) assert.ok(second.docs.includes(p.document), `B served ${p.document}`)
})

Then("neither set's configuration affects the other", async function (this: DepWorld) {
  const second = this.notes.get('second') as { set: DocumentationSet }
  await assert.rejects(() => second.set.context(DEFAULT_QUESTION, { audience: 'ai-agent' }), (err: unknown) => {
    assert.ok(err instanceof DepError && err.code === 'UNKNOWN_AUDIENCE')
    assert.ok(err.message.includes('reviewer') && !err.message.includes('human-author'))
    return true
  })
  await assert.rejects(() => this.set!.context(DEFAULT_QUESTION, { audience: 'reviewer' }), (err: unknown) => {
    assert.ok(err instanceof DepError && err.code === 'UNKNOWN_AUDIENCE')
    assert.ok(err.message.includes('ai-agent') && !err.message.includes('reviewer,'))
    return true
  })
})

Given('I have chosen the retrieval method that runs on my own machine', function (this: DepWorld) {
  this.vectorization = { provider: 'hash' }
})

Then('no request leaves the machine', function (this: DepWorld) {
  assert.ok(this.bundle, this.errorMessage())
  assert.deepEqual(this.fetchCalls, [])
})

Then('my question is not sent to any external service', function (this: DepWorld) {
  assert.deepEqual(this.fetchCalls, [])
})

Given('I have chosen a retrieval method provided by an external service', async function (this: DepWorld) {
  await this.materialise()
  this.vectorization = { provider: 'openai' }
  this.writeProject()
  this.opened = false
})

Given('I have not supplied credentials for it', function (this: DepWorld) {
  this.withoutEnv('DEP_OPENAI_API_KEY', 'OPENAI_API_KEY')
})

Then('I am told which credential is missing', function (this: DepWorld) {
  assert.ok(this.depError, `expected a refusal, got ${this.errorMessage() || 'a bundle'}`)
  assert.equal(this.depError!.code, 'CREDENTIAL_MISSING')
  assert.ok(this.errorMessage().includes('DEP_OPENAI_API_KEY'), this.errorMessage())
})
