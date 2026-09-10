import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { Given, Then, When } from '@cucumber/cucumber'
import { assertContains, assertEqual, assertMatches, assertTrue } from '../support/expect.ts'
import type { DepWorld } from '../support/world.ts'

interface BacklinksJson {
  path: string
  backlinks: Array<{ source: string; target: string; rel: string }>
}

const SUBJECT = 'subject-document'

// ── Given ──────────────────────────────────────────────────────────────────

Given('several documents point at {string} with different relationships', function (this: DepWorld, path: string) {
  this.project.seedStandard()
  // The standard set already points at the metadata schema with TEACHES and
  // REQUIRES; add a third relationship so the grouping has something to group.
  this.project.addDoc({
    path: 'docs/explanation/what-metadata-is-for.md',
    type: 'explanation',
    title: 'What Metadata Is For',
    links: [{ target: path, rel: 'EXPLAINS' }],
    body: 'Why every document carries a metadata block.',
  })
  this.note(SUBJECT, path)
  this.note('expected-rels', ['TEACHES', 'REQUIRES', 'EXPLAINS'])
})

Given('no document points at {string}', function (this: DepWorld, path: string) {
  this.project.writeDocspec()
  this.project.addDoc({
    path,
    type: 'reference',
    title: 'DEP Metadata Schema',
    body: 'Nothing in the set points at this document.',
  })
  this.note(SUBJECT, path)
})

Given('another document links to {string} in its prose only', function (this: DepWorld, path: string) {
  this.project.seedStandard()
  this.project.addDoc({
    path: 'docs/reference/prose-only-linker.md',
    title: 'A Document That Links in Prose',
    body: 'The fields are listed in [the metadata schema](./metadata-schema.md).',
  })
  this.note(SUBJECT, path)
  this.note('prose-linker', 'docs/reference/prose-only-linker.md')
})

Given('I am not standing at the project root', function (this: DepWorld) {
  this.project.seedStandard()
  const workingDir = join(this.project.root, 'docs', 'reference')
  mkdirSync(workingDir, { recursive: true })
  this.note('cwd', workingDir)
  this.note(SUBJECT, 'docs/reference/metadata-schema.md')
})

Given('{string} is not part of the documentation set', function (this: DepWorld, path: string) {
  this.project.seedStandard()
  assertTrue(!this.project.exists(path), `Expected ${path} not to exist.`)
  this.note(SUBJECT, path)
})

// ── When ───────────────────────────────────────────────────────────────────

When('I ask what points at that document', async function (this: DepWorld) {
  await this.runInProject(['backlinks', this.recall<string>(SUBJECT)])
})

When('I ask what points at a document using a path relative to the project root', async function (this: DepWorld) {
  await this.runInProject(['backlinks', this.recall<string>(SUBJECT)], { cwd: this.recall<string>('cwd') })
})

When('I ask what points at it', async function (this: DepWorld) {
  await this.runInProject(['backlinks', this.recall<string>(SUBJECT)])
})

When('I ask what points at a document in machine-readable form', async function (this: DepWorld) {
  this.project.seedStandard()
  this.note(SUBJECT, 'docs/reference/metadata-schema.md')
  await this.runInProject(['backlinks', 'docs/reference/metadata-schema.md', '--json'])
})

// ── Then ───────────────────────────────────────────────────────────────────

Then('the sources are grouped under the relationship they use', function (this: DepWorld) {
  assertContains(this.output, `Backlinks for ${this.recall<string>(SUBJECT)}:`, 'Expected a heading naming the document.')
  for (const rel of this.recall<string[]>('expected-rels')) {
    assertMatches(this.output, new RegExp(`^\\s+${rel}:$`, 'm'), `Expected a "${rel}" group.`)
  }
})

Then('every source document is named', function (this: DepWorld) {
  for (const source of [
    'docs/tutorials/write-your-first-dep-document.md',
    'docs/how-to/validate-a-document.md',
    'docs/explanation/what-metadata-is-for.md',
  ]) {
    assertMatches(this.output, new RegExp(`←\\s+${source.replace(/[.]/g, '\\.')}`), `Expected ${source} to be named.`)
  }
})

Then('I am told no incoming links were found for it', function (this: DepWorld) {
  assertContains(
    this.output,
    `No backlinks found for ${this.recall<string>(SUBJECT)}`,
    'Expected to be told there are no incoming links.',
  )
})

Then('that document is listed under the untyped relationship', function (this: DepWorld) {
  assertMatches(this.output, /^\s+INLINE:$/m, 'Expected an untyped-relationship group.')
  assertContains(this.output, this.recall<string>('prose-linker'), 'Expected the prose linker to be listed.')
})

Then('the answer is about that document', function (this: DepWorld) {
  assertContains(
    this.output,
    `Backlinks for ${this.recall<string>(SUBJECT)}`,
    'Expected the answer to be about the named document.',
  )
})

Then('I am told the document was not found in the graph, naming it', function (this: DepWorld) {
  assertContains(this.output, 'Document not found in graph', 'Expected to be told the document is not in the graph.')
  assertContains(this.output, this.recall<string>(SUBJECT), 'Expected the document to be named.')
})

Then("I receive the document's path and each incoming link with its source and relationship", function (this: DepWorld) {
  const report = this.json<BacklinksJson>()
  assertEqual(report.path, this.recall<string>(SUBJECT), 'Expected the path of the document asked about.')
  assertTrue(report.backlinks.length > 0, 'Expected at least one incoming link.')
  for (const link of report.backlinks) {
    assertTrue(typeof link.source === 'string', 'Expected the source of each incoming link.')
    assertTrue(typeof link.rel === 'string', 'Expected the relationship of each incoming link.')
    assertEqual(link.target, report.path, 'Expected each incoming link to point at the document.')
  }
})
