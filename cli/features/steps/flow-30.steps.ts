import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { chmodSync, writeFileSync } from 'fs'
import { join } from 'path'
import { DepWorld, CLI_ENTRY, unrelatedBody, daysAgo } from '../support/world'
import { openVectorDB, getMeta } from '../../src/vectorstore/db'
import type { IndexReport } from '../../src/lib'
import { notice } from './common.steps'

const DAY = 24 * 60 * 60 * 1000

function indexSnapshot(root: string) {
  const db = openVectorDB(root)
  try {
    const chunks = db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM chunks').get()!.n
    return { chunks, model: getMeta(db, 'model_name'), builtAt: getMeta(db, 'built_at') }
  } finally {
    db.close()
  }
}

Given('a project whose documents have already been indexed for retrieval', async function (this: DepWorld) {
  this.seedDefaultDocs()
  await this.materialise()
  this.notes.set('indexBefore', indexSnapshot(this.root))
})

Given('I have edited three documents out of two hundred', async function (this: DepWorld) {
  for (let i = this.docs.size; i < 200; i++) {
    this.addDoc({ path: `docs/reference/topic-${String(i).padStart(3, '0')}.md`, type: 'reference', title: `Topic ${i}`, body: unrelatedBody(`topic number ${i}`) })
  }
  this.writeProject()
  await this.index()
  const edited = ['docs/reference/topic-010.md', 'docs/reference/topic-020.md', 'docs/reference/topic-030.md']
  for (const path of edited) this.editDoc(path, ' Edited today.')
  this.notes.set('edited', edited)
})

When('I bring the index up to date', async function (this: DepWorld) {
  this.error = undefined
  try {
    this.result = await this.index()
  } catch (err) {
    this.error = err
  }
})

Then('I am told three documents were processed again', function (this: DepWorld) {
  const report = this.result as IndexReport
  assert.ok(report, this.errorMessage())
  assert.deepEqual([...report.processed].sort(), [...(this.notes.get('edited') as string[])].sort())
})

Then('I am told the rest were reused unchanged', function (this: DepWorld) {
  const report = this.result as IndexReport
  assert.equal(report.reused.length, 197)
})

Given('I have added a paragraph answering a question the set could not answer before', function (this: DepWorld) {
  this.notes.set('newQuestion', 'how are orphan documents detected')
  this.editDoc('docs/how-to/install.md', ' Orphan documents are detected by walking outward from every audience entry point; whatever stays unreachable is an orphan.')
})

When('I ask for context for that question', async function (this: DepWorld) {
  await this.ask(this.notes.get('newQuestion') as string)
})

Then('the new paragraph is present in the bundle', function (this: DepWorld) {
  assert.ok(this.bundle, this.errorMessage())
  const hit = this.bundle!.passages.find((p) => p.content.includes('Orphan documents are detected'))
  assert.ok(hit, `paragraph not served; passages: ${this.bundle!.passages.map((p) => p.document)}`)
  assert.equal(hit!.outOfSync, false)
})

Given('the project brings its index up to date whenever a commit lands', async function (this: DepWorld) {
  await this.materialise()
  assert.equal(this.git(['init', '-q']).code, 0)
  writeFileSync(join(this.root, '.gitignore'), '.dep-vectors.db*\n')
  const hook = this.set!.installIndexHook({ command: `${JSON.stringify(process.execPath)} run ${JSON.stringify(CLI_ENTRY)}` })
  this.notes.set('hook', hook)
  assert.equal(this.git(['add', '-A']).code, 0)
  const first = this.git(['commit', '-q', '-m', 'initial'])
  assert.equal(first.code, 0, first.stderr)
})

When('a commit changes two documents', function (this: DepWorld) {
  const changed = ['docs/how-to/install.md', 'docs/tutorials/first-document.md']
  for (const path of changed) this.editDoc(path, ' Changed in a commit.')
  this.notes.set('changed', changed)
  this.notes.set('builtBefore', indexSnapshot(this.root).builtAt)
  assert.equal(this.git(['add', '-A']).code, 0)
  const commit = this.git(['commit', '-q', '-m', 'change two documents'])
  assert.equal(commit.code, 0, commit.stderr)
  this.notes.set('commitOutput', commit.stdout + commit.stderr)
})

Then('the index is brought up to date without my asking', async function (this: DepWorld) {
  const after = indexSnapshot(this.root)
  assert.notEqual(after.builtAt, this.notes.get('builtBefore'), 'index was not rebuilt by the commit')
  await this.ask()
  assert.ok(this.bundle, this.errorMessage())
  assert.ok(!this.bundle!.notices.some((n) => n.code === 'index-out-of-sync'), JSON.stringify(this.bundle!.notices))
})

Then('I am told which documents were processed again', function (this: DepWorld) {
  const output = this.notes.get('commitOutput') as string
  for (const path of this.notes.get('changed') as string[]) assert.ok(output.includes(path), `commit output does not name ${path}:\n${output}`)
})

Given('I have deleted a document', async function (this: DepWorld) {
  await this.materialise()
  this.subject = 'docs/reference/lifecycle-states.md'
  this.removeDoc(this.subject)
})

When('I ask a question that document used to answer', async function (this: DepWorld) {
  await this.ask()
})

Then('none of its passages are present in the bundle', function (this: DepWorld) {
  assert.ok(this.bundle, this.errorMessage())
  assert.equal(this.passagesFrom(this.subject).length, 0)
  assert.ok(!this.bundle!.notices.some((n) => n.code === 'index-behind'), 'index still behind')
})

Given('I have moved a document to a different part of the set', async function (this: DepWorld) {
  await this.materialise()
  const from = 'docs/reference/lifecycle-states.md'
  const to = 'docs/explanation/lifecycle-states.md'
  const spec = { ...this.docs.get(from)!, path: to, type: 'explanation' }
  this.removeDoc(from)
  this.addDoc(spec)
  this.writeDoc(spec)
  this.written = true
  this.notes.set('moved', { from, to })
})

When('I ask a question that document answers', async function (this: DepWorld) {
  await this.ask()
})

Then('its passages are present and name its new location', function (this: DepWorld) {
  const { to } = this.notes.get('moved') as { to: string }
  assert.ok(this.bundle, this.errorMessage())
  assert.ok(this.passagesFrom(to).length > 0, `nothing from ${to}; served ${this.bundle!.passages.map((p) => p.document)}`)
})

Then('no passage names its previous location', function (this: DepWorld) {
  const { from } = this.notes.get('moved') as { from: string }
  assert.equal(this.passagesFrom(from).length, 0)
})

Given('the index was built with a different retrieval method than the one now configured', async function (this: DepWorld) {
  await this.materialise()
  this.notes.set('indexBefore', indexSnapshot(this.root))
  this.vectorization = { provider: 'hash', model: '1024' }
  this.writeProject()
  this.opened = false
})

Then('I am told the index cannot be mixed with a different retrieval method', function (this: DepWorld) {
  assert.ok(this.error, 'update was not refused')
  assert.ok(this.errorMessage().includes('cannot be mixed'), this.errorMessage())
})

Then('I am told to rebuild it in full', function (this: DepWorld) {
  assert.ok(this.errorMessage().includes('rebuild it in full'), this.errorMessage())
})

Then('the existing index is left as it was', function (this: DepWorld) {
  assert.deepEqual(indexSnapshot(this.root), this.notes.get('indexBefore'))
})

Given('I interrupt the update partway through', async function (this: DepWorld) {
  await this.materialise()
  const added: string[] = []
  for (let i = 0; i < 10; i++) {
    const path = `docs/reference/late-${i}.md`
    this.addDoc({ path, type: 'reference', title: `Late ${i}`, body: unrelatedBody(`late topic ${i}`) })
    added.push(path)
  }
  this.writeProject()
  this.set!.refresh()
  const controller = new AbortController()
  const report = await this.set!.index({ signal: controller.signal, onProgress: () => controller.abort() })
  assert.equal(report.incomplete, true)
  this.notes.set('added', added)
  this.notes.set('partial', report)
})

When('I ask for context afterwards', async function (this: DepWorld) {
  await this.ask()
})

Then('I still receive a bundle from the knowledge indexed before the interruption', function (this: DepWorld) {
  assert.ok(this.bundle, this.errorMessage())
  assert.ok(this.bundle!.passages.length > 0)
  assert.equal(this.bundle!.index.present, true)
})

Then('I am told the index is incomplete', function (this: DepWorld) {
  notice(this, 'index-incomplete')
})

Then('running the update again resumes from where it stopped', async function (this: DepWorld) {
  const partial = this.notes.get('partial') as IndexReport
  const added = this.notes.get('added') as string[]
  const report = await this.set!.index()
  assert.equal(report.incomplete, false)
  const remaining = added.filter((p) => !partial.processed.includes(p))
  assert.deepEqual([...report.processed].sort(), remaining.sort())
  for (const done of partial.processed) assert.ok(report.reused.includes(done), `${done} was processed twice`)
})

Given('one document in the set cannot be read', async function (this: DepWorld) {
  await this.materialise()
  this.subject = 'docs/reference/sealed.md'
  this.addDoc({ path: this.subject, type: 'reference', title: 'Sealed', body: unrelatedBody('a sealed topic') })
  this.addDoc({ path: 'docs/reference/open.md', type: 'reference', title: 'Open', body: unrelatedBody('an open topic') })
  this.writeProject()
  chmodSync(join(this.root, this.subject), 0o000)
})

Then('the remaining documents are still processed', function (this: DepWorld) {
  const report = this.result as IndexReport
  assert.ok(report, this.errorMessage())
  assert.ok(report.processed.includes('docs/reference/open.md'), JSON.stringify(report))
})

Then('I am told which document could not be read', function (this: DepWorld) {
  const report = this.result as IndexReport
  assert.ok(report.unreadable.includes(this.subject), JSON.stringify(report.unreadable))
})

Given('a document has passed its review cadence overnight', async function (this: DepWorld) {
  await this.materialise()
  this.subject = 'docs/reference/lifecycle-states.md'
  const spec = this.docs.get(this.subject)!
  spec.lastVerified = daysAgo(60, this.now) // exactly at the ageing limit today, past it tomorrow
  this.writeDoc(spec)
  await this.index()
  this.notes.set('builtBefore', indexSnapshot(this.root).builtAt)
})

When('I ask for context the next day', async function (this: DepWorld) {
  this.now = new Date(this.now.getTime() + DAY)
  await this.ask()
})

Then('it is treated as past its review date', function (this: DepWorld) {
  assert.ok(this.bundle, this.errorMessage())
  assert.equal(this.passagesFrom(this.subject).length, 0)
  assert.ok(this.bundle!.withheld.some((w) => w.document === this.subject && w.reason === 'stale'), JSON.stringify(this.bundle!.withheld))
})

Then('no re-indexing was needed for that to happen', function (this: DepWorld) {
  assert.equal(this.bundle!.index.builtAt, this.notes.get('builtBefore'))
  assert.ok(!this.bundle!.notices.some((n) => n.code === 'index-out-of-sync'))
})

When('I confine the update to a document that is not part of the documentation set', async function (this: DepWorld) {
  await this.materialise()
  this.notes.set('indexBefore', indexSnapshot(this.root))
  writeFileSync(join(this.root, 'README.md'), '# Not a DEP document\n')
  this.error = undefined
  try {
    this.result = await this.set!.index({ only: 'README.md' })
  } catch (err) {
    this.error = err
  }
})

Then('I am told the document is outside the set', function (this: DepWorld) {
  assert.ok(this.error, 'update was not refused')
  assert.ok(this.errorMessage().includes('outside the documentation set'), this.errorMessage())
})
