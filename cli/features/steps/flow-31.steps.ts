import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { chmodSync, existsSync } from 'fs'
import { join } from 'path'
import { DepWorld } from '../support/world'
import type { ProcedureStep, ProcedureSession } from '../../src/lib'

const TREE = 'review-freshness'

function tree(id: string, trigger: string, entry: string, body: string): string {
  return `---
dap:
  id: ${id}
  version: 1
  trigger: "${trigger}"
  audience: [ai-agent]
  owner: "@fixture"
  created: 2026-01-01T00:00:00Z
  last_verified: 2026-09-01T00:00:00Z
  confidence: high
  depends_on: []
  tags: [fixture]
  entry_node: ${entry}
---

# ${id}

${body}
`
}

const REVIEW_TREE = tree(TREE, 'review a document for freshness', 'check-freshness', `
## check-freshness [?]

Find out how a document's freshness is decided, and whether this document is past its review date.

- **method**: tool_call
- **tool**: dep_query
- **args**: { "flags": "--lifecycle STALE" }
- **outputs**: stale_docs
- **next**: decide-action

## decide-action [>]

Route on whether the document turned out to be stale.

| condition | next |
| --- | --- |
| \`stale_docs > 0\` | mark-verified |
| \`_otherwise\` | hand-off |

## mark-verified [!]

Re-verify the document: check the freshness rules, decide whether it is still correct, and record today as its last verified date.

- **action_type**: tool_call
- **tool**: dep_bump
- **params**: { "file": "{{ doc }}" }
- **terminal**: true

## hand-off [@]

Hand over to the installation procedure, which installs the binary on the machine.

- **delegate_to**: dap://install-binary.md
- **on_return**: mark-verified
`)

const INSTALL_TREE = tree('install-binary', 'install the binary', 'fetch-binary', `
## fetch-binary [?]

Install the binary on the machine by following the installation steps, then confirm the installed version.

- **method**: tool_call
- **tool**: shell
- **args**: { "cmd": "dep --version" }
- **outputs**: version
- **next**: done

## done [!]

Installation finished.

- **action_type**: intent
- **intent**: report_success
- **params**: { "message": "installed" }
- **terminal**: true
`)

function result(world: DepWorld): ProcedureStep {
  assert.ok(world.result, `no step result; error: ${world.errorMessage()}`)
  return world.result as ProcedureStep
}

async function step(world: DepWorld, treeId: string, nodeId: string, options: { budget?: number; session?: ProcedureSession }) {
  world.error = undefined
  world.result = undefined
  try {
    world.result = await world.set!.procedureStep(treeId, nodeId, options)
  } catch (err) {
    world.error = err
  }
  return world.result as ProcedureStep | undefined
}

Given('a project that declares decision procedures', function (this: DepWorld) {
  this.seedDefaultDocs()
  this.trees.set(TREE, REVIEW_TREE)
  this.trees.set('install-binary', INSTALL_TREE)
})

Given('a documentation set indexed for retrieval', function (this: DepWorld) {
  this.wantIndex = true
})

When('I ask for one step of a procedure and declare a budget for its supporting knowledge', async function (this: DepWorld) {
  await this.materialise()
  this.notes.set('declared', 600)
  await step(this, TREE, 'check-freshness', { budget: 600 })
})

Then('I receive the step in full', function (this: DepWorld) {
  const r = result(this)
  assert.ok(r.step.id)
  assert.ok(r.step.type)
  assert.ok(r.step.description.length > 0)
  assert.ok(r.step.tokens > 0)
})

Then('I still receive the step in full', function (this: DepWorld) {
  const r = result(this)
  assert.ok(r.step.id)
  assert.ok(r.step.description.length > 0)
  assert.equal(this.error, undefined)
})

Then('I receive supporting passages that fit within the declared budget', function (this: DepWorld) {
  const r = result(this)
  assert.ok(r.support.passages.length > 0, JSON.stringify(r.notices))
  const total = r.support.passages.reduce((s, p) => s + p.tokens, 0)
  assert.equal(r.support.budget.used, total)
  assert.ok(r.step.tokens + total <= (this.notes.get('declared') as number))
})

Then('each supporting passage says which part of the step it supports', function (this: DepWorld) {
  for (const p of result(this).support.passages) assert.ok(['description', 'prompt', 'summary'].includes(p.supports), p.supports)
})

Given('I declare a budget for the whole procedure rather than for one step', async function (this: DepWorld) {
  await this.materialise()
  this.notes.set('session', this.set!.procedureSession({ budget: 1000 }))
})

When('I walk from step to step', async function (this: DepWorld) {
  const session = this.notes.get('session') as ProcedureSession
  const results: ProcedureStep[] = []
  for (const id of ['check-freshness', 'decide-action', 'mark-verified']) {
    results.push((await step(this, TREE, id, { session }))!)
  }
  this.notes.set('walk', results)
})

Then('the knowledge accumulated across the steps stays within that budget', function (this: DepWorld) {
  const results = this.notes.get('walk') as ProcedureStep[]
  const session = this.notes.get('session') as ProcedureSession
  const total = results.flatMap((r) => r.support.passages).reduce((s, p) => s + p.tokens, 0)
  assert.ok(total > 0, 'nothing was supplied across the walk')
  assert.ok(total <= 1000)
  assert.equal(session.used, total)
})

Then('I am told how much of it remains as I go', function (this: DepWorld) {
  const results = this.notes.get('walk') as ProcedureStep[]
  let last = Infinity
  for (const r of results) {
    assert.ok(r.session, 'no session state reported')
    assert.equal(r.session!.remaining, r.session!.declared - r.session!.used)
    assert.ok(r.session!.remaining <= last)
    last = r.session!.remaining
  }
})

Given('a passage was supplied at an earlier step', async function (this: DepWorld) {
  await this.materialise()
  const session = this.set!.procedureSession({ budget: 5000 })
  this.notes.set('session', session)
  const first = (await step(this, TREE, 'check-freshness', { session }))!
  assert.ok(first.support.passages.length > 0, 'nothing supplied at the first step')
  this.notes.set('first', first)
})

When('a later step would draw on the same passage', async function (this: DepWorld) {
  await step(this, TREE, 'mark-verified', { session: this.notes.get('session') as ProcedureSession })
})

Then('it is not supplied again', function (this: DepWorld) {
  const first = this.notes.get('first') as ProcedureStep
  const earlier = new Set(first.support.passages.map((p) => p.id))
  for (const p of result(this).support.passages) assert.ok(!earlier.has(p.id), `${p.document} supplied twice`)
})

Then('I am told it was already supplied', function (this: DepWorld) {
  const first = this.notes.get('first') as ProcedureStep
  const earlier = new Set(first.support.passages.map((p) => p.id))
  const already = result(this).support.alreadySupplied
  assert.ok(already.length > 0, 'nothing reported as already supplied')
  for (const a of already) {
    assert.ok(earlier.has(a.id))
    assert.equal(a.step, 'check-freshness')
  }
})

Given("the step's own content is larger than the budget I declared", function (this: DepWorld) {
  this.notes.set('declared', 5)
})

When('I ask for that step', async function (this: DepWorld) {
  await this.materialise()
  await step(this, TREE, 'check-freshness', { budget: this.notes.get('declared') as number })
})

Then('I receive no supporting passages', function (this: DepWorld) {
  assert.equal(result(this).support.passages.length, 0)
})

Then('I am told the step alone exceeded the declared budget', function (this: DepWorld) {
  assert.ok(result(this).notices.some((n) => n.code === 'step-exceeds-budget'), JSON.stringify(result(this).notices))
})

Given("the procedure's budget is exhausted", async function (this: DepWorld) {
  await this.materialise()
  const session = this.set!.procedureSession({ budget: 1 })
  this.notes.set('session', session)
  await step(this, TREE, 'check-freshness', { session })
})

When('I ask for the next step', async function (this: DepWorld) {
  await step(this, TREE, 'mark-verified', { session: this.notes.get('session') as ProcedureSession })
})

Then('I am told no further supporting knowledge can be supplied', function (this: DepWorld) {
  assert.ok(result(this).notices.some((n) => n.code === 'budget-exhausted'), JSON.stringify(result(this).notices))
})

Then('I can continue the procedure', function (this: DepWorld) {
  const r = result(this)
  assert.equal(this.error, undefined)
  assert.ok(r.step.id)
  assert.ok(Array.isArray(r.next))
})

Given('a step hands control to a different procedure', async function (this: DepWorld) {
  await this.materialise()
  const session = this.set!.procedureSession({ budget: 1000 })
  this.notes.set('session', session)
  const handoff = (await step(this, TREE, 'hand-off', { session }))!
  assert.ok(handoff.handoff, 'no handoff reported')
  assert.equal(handoff.handoff!.tree, 'install-binary')
  assert.ok(handoff.support.passages.length > 0, 'nothing supplied at the hand-off step')
  this.notes.set('before', handoff)
})

When('I follow the handoff', async function (this: DepWorld) {
  const before = this.notes.get('before') as ProcedureStep
  await step(this, before.handoff!.tree, before.handoff!.entry, { session: this.notes.get('session') as ProcedureSession })
})

Then('the remaining budget carries into the procedure I was handed to', function (this: DepWorld) {
  const before = this.notes.get('before') as ProcedureStep
  const after = result(this)
  assert.equal(after.tree, 'install-binary')
  assert.equal(after.session!.declared, 1000)
  assert.ok(after.session!.used >= before.session!.used)
  assert.equal(after.session!.remaining, 1000 - after.session!.used)
})

Then('knowledge already supplied is not supplied again on the other side', function (this: DepWorld) {
  const before = this.notes.get('before') as ProcedureStep
  const earlier = new Set(before.support.passages.map((p) => p.id))
  const after = result(this)
  for (const p of after.support.passages) assert.ok(!earlier.has(p.id), `${p.document} supplied twice`)
  assert.ok(after.support.alreadySupplied.some((a) => earlier.has(a.id) && a.tree === TREE), JSON.stringify(after.support.alreadySupplied))
})

When('I ask for a step that the named procedure does not declare', async function (this: DepWorld) {
  await this.materialise()
  await step(this, TREE, 'no-such-step', { budget: 600 })
})

Then('I am told which steps the procedure declares', function (this: DepWorld) {
  const m = this.errorMessage()
  for (const id of ['check-freshness', 'decide-action', 'mark-verified', 'hand-off']) assert.ok(m.includes(id), `${m} does not name ${id}`)
})

Given('the documentation set cannot be retrieved from', async function (this: DepWorld) {
  await this.materialise()
  // the index exists but cannot be opened
  for (const suffix of ['', '-wal', '-shm']) {
    const file = join(this.root, `.dep-vectors.db${suffix}`)
    if (existsSync(file)) chmodSync(file, 0o000)
  }
})

When('I ask for a step of a procedure', async function (this: DepWorld) {
  await step(this, TREE, 'check-freshness', { budget: 600 })
})

Then('I am told no supporting knowledge could be retrieved, and why', function (this: DepWorld) {
  const n = result(this).notices.find((n) => n.code === 'support-unavailable') as any
  assert.ok(n, JSON.stringify(result(this).notices))
  assert.ok(typeof n.reason === 'string' && n.reason.length > 0)
})
