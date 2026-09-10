import { Given, Then, When } from '@cucumber/cucumber'
import { assertContains, assertEqual, assertIncludesAll, assertTrue } from '../support/expect.ts'
import type { DepWorld } from '../support/world.ts'
import { SUBJECT_FILE } from './common.steps.ts'

interface LinkJson {
  path: string
  action: 'added' | 'updated' | 'removed'
  target?: string
  rel?: string
  links: Array<{ target: string; rel: string }>
}

const SOURCE = 'docs/reference/metadata-schema.md'
const TARGET = 'docs/reference/types.md'

function subject(world: DepWorld): string {
  return world.notes.has(SUBJECT_FILE) ? world.recall<string>(SUBJECT_FILE) : SOURCE
}

function declaredLinks(world: DepWorld): Array<{ target: string; rel: string }> {
  return (world.project.metadataOf(subject(world)).links ?? []) as Array<{ target: string; rel: string }>
}

/**
 * Put the source document in front of the scenario with the relationships it
 * starts from — declared through the CLI, so that the target a later step
 * names is written exactly as the document declares it.
 */
async function withLinks(world: DepWorld, links: Array<{ target: string; rel: string }>): Promise<void> {
  world.project.seedStandard()
  world.project.addDoc({
    path: SOURCE,
    type: 'reference',
    audience: ['ai-generator', 'ai-agent', 'human-author'],
    confidence: 'medium',
    tags: ['metadata', 'schema'],
    title: 'DEP Metadata Schema',
    body: 'Every field of the metadata block, with its constraints.',
  })
  world.note(SUBJECT_FILE, SOURCE)
  for (const link of links) {
    await world.runQuiet(['link', SOURCE, '--target', link.target, '--rel', link.rel])
  }
  world.note('file-before', world.project.read(SOURCE))
}

// ── Given ──────────────────────────────────────────────────────────────────

Given('{string} declares no relationships', async function (this: DepWorld, path: string) {
  assertEqual(path, SOURCE, 'The fixture builds its relationships on the metadata schema document.')
  await withLinks(this, [])
  assertEqual(declaredLinks(this).length, 0, 'Expected the document to start with no relationships.')
})

Given('a document declares that it teaches another document', async function (this: DepWorld) {
  await withLinks(this, [{ target: TARGET, rel: 'TEACHES' }])
  this.note('target', TARGET)
})

Given('a document already declares that it teaches another document', async function (this: DepWorld) {
  await withLinks(this, [{ target: TARGET, rel: 'TEACHES' }])
  this.note('target', TARGET)
})

Given('a document declares a relationship to another document', async function (this: DepWorld) {
  await withLinks(this, [{ target: TARGET, rel: 'USES' }])
  this.note('target', TARGET)
})

Given('the project declares its own relationship name', async function (this: DepWorld) {
  this.project.configure({ customRelationships: [{ id: 'SUPERSEDES', meaning: 'Replaces an earlier document' }] })
  await withLinks(this, [])
  this.note('custom-rel', 'SUPERSEDES')
})

Given('a document declares no relationship to {string}', async function (this: DepWorld, target: string) {
  await withLinks(this, [])
  this.note('target', target)
})

Given('I declare that one document requires another', async function (this: DepWorld) {
  await withLinks(this, [])
  await this.runInProject(['link', SOURCE, '--target', `./${TARGET.split('/').pop()}`, '--rel', 'REQUIRES'])
  this.note('target', TARGET)
})

// ── When ───────────────────────────────────────────────────────────────────

When('I declare that it teaches {string}', async function (this: DepWorld, target: string) {
  this.note('target', target)
  this.note('rel', 'TEACHES')
  await this.runInProject(['link', subject(this), '--target', target, '--rel', 'TEACHES'])
})

When('I declare a relationship of {string} to another document', async function (this: DepWorld, rel: string) {
  if (!this.notes.has(SUBJECT_FILE)) await withLinks(this, [])
  this.note('target', TARGET)
  this.note('rel', rel)
  await this.runInProject(['link', subject(this), '--target', TARGET, '--rel', rel])
})

When('I declare that it requires that same document', async function (this: DepWorld) {
  this.note('rel', 'REQUIRES')
  await this.runInProject(['link', subject(this), '--target', this.recall<string>('target'), '--rel', 'REQUIRES'])
})

When('I remove the relationship to that document', async function (this: DepWorld) {
  await this.runInProject(['link', subject(this), '--target', this.recall<string>('target'), '--remove'])
})

When('I declare a relationship using that name', async function (this: DepWorld) {
  const rel = this.recall<string>('custom-rel')
  this.note('target', TARGET)
  this.note('rel', rel)
  await this.runInProject(['link', subject(this), '--target', TARGET, '--rel', rel])
})

When('I declare a relationship to a target without naming its kind', async function (this: DepWorld) {
  await withLinks(this, [])
  await this.runInProject(['link', subject(this), '--target', TARGET])
})

When("I ask to change a document's relationships without naming a target", async function (this: DepWorld) {
  await withLinks(this, [])
  await this.runInProject(['link', subject(this), '--rel', 'TEACHES'])
})

When('I declare that same relationship again', async function (this: DepWorld) {
  this.note('rel', 'TEACHES')
  await this.runInProject(['link', subject(this), '--target', this.recall<string>('target'), '--rel', 'TEACHES'])
})

When('I ask what points at the target document', async function (this: DepWorld) {
  await this.runInProject(['backlinks', this.recall<string>('target')])
})

When('I declare a relationship on it', async function (this: DepWorld) {
  this.note('target', TARGET)
  this.note('rel', 'TEACHES')
  await this.runInProject(['link', subject(this), '--target', TARGET, '--rel', 'TEACHES'])
})

When('I declare a relationship in machine-readable form', async function (this: DepWorld) {
  await withLinks(this, [])
  this.note('target', TARGET)
  this.note('rel', 'TEACHES')
  await this.runInProject(['link', subject(this), '--target', TARGET, '--rel', 'TEACHES', '--json'])
})

// ── Then ───────────────────────────────────────────────────────────────────

Then('I am shown the relationship as added, with its target and relationship name', function (this: DepWorld) {
  assertContains(
    this.output,
    `added link → ${this.recall<string>('target')} [${this.recall<string>('rel')}]`,
    'Expected the added relationship to be shown.',
  )
})

Then('I am told how many relationships the document now declares', function (this: DepWorld) {
  assertContains(this.output, `${declaredLinks(this).length} link(s) total`, 'Expected the resulting count.')
})

Then('the document declares that relationship', function (this: DepWorld) {
  const links = declaredLinks(this)
  assertTrue(
    links.some((l) => l.target === this.recall<string>('target') && l.rel === this.recall<string>('rel')),
    `Expected the relationship on disk, got: ${JSON.stringify(links)}`,
  )
})

Then('the relationship is recorded as {string}', function (this: DepWorld, rel: string) {
  const links = declaredLinks(this)
  assertTrue(links.some((l) => l.rel === rel), `Expected a relationship of "${rel}", got: ${JSON.stringify(links)}`)
})

Then('I am shown the relationship as updated', function (this: DepWorld) {
  assertContains(this.output, 'updated link →', 'Expected the relationship to be shown as updated.')
})

Then('the document declares one relationship to that target, of the new kind', function (this: DepWorld) {
  const target = this.recall<string>('target')
  const toTarget = declaredLinks(this).filter((l) => l.target === target)
  assertEqual(toTarget.length, 1, 'Expected a single relationship to that target.')
  assertEqual(toTarget[0]!.rel, this.recall<string>('rel'), 'Expected the new kind.')
})

Then('I am shown the relationship as removed', function (this: DepWorld) {
  assertContains(this.output, `removed link → ${this.recall<string>('target')}`, 'Expected the removal to be shown.')
})

Then('I am told how many relationships remain', function (this: DepWorld) {
  assertContains(this.output, `${declaredLinks(this).length} link(s) remaining`, 'Expected the remaining count.')
})

Then('the document no longer declares it', function (this: DepWorld) {
  const target = this.recall<string>('target')
  assertTrue(!declaredLinks(this).some((l) => l.target === target), 'Expected the relationship to be gone.')
})

Then('the relationship is recorded', function (this: DepWorld) {
  const links = declaredLinks(this)
  assertTrue(
    links.some((l) => l.rel === this.recall<string>('rel')),
    `Expected the relationship on disk, got: ${JSON.stringify(links)}`,
  )
})

Then('I am told the relationship is invalid and which relationships are allowed', function (this: DepWorld) {
  assertContains(this.output, 'Invalid relationship "MENTIONS"', 'Expected the relationship to be refused.')
  assertIncludesAll(
    this.output,
    ['TEACHES', 'USES', 'EXPLAINS', 'DECIDES', 'REQUIRES', 'NEXT'],
    'Expected the allowed relationships to be listed.',
  )
})

Then('I am told the kind is required and which kinds are valid', function (this: DepWorld) {
  assertContains(this.output, '--rel is required when adding a link', 'Expected the kind to be required.')
  assertIncludesAll(
    this.output,
    ['TEACHES', 'USES', 'EXPLAINS', 'DECIDES', 'REQUIRES', 'NEXT'],
    'Expected the valid kinds to be listed.',
  )
})

Then('I am shown how to name a target and a kind, with an example', function (this: DepWorld) {
  assertContains(this.output, 'Usage: dep link <file> --target <path> --rel <REL>', 'Expected the usage line.')
  assertContains(this.output, 'Example:', 'Expected an example.')
})

Then('I am told the relationship already exists', function (this: DepWorld) {
  assertContains(
    this.output,
    `Link to "${this.recall<string>('target')}" with rel "TEACHES" already exists`,
    'Expected the duplicate to be refused.',
  )
})

Then('I am told no such relationship was found, naming the document and the target', function (this: DepWorld) {
  assertContains(this.output, `No link to "${this.recall<string>('target')}" found`, 'Expected the missing relationship to be reported.')
  assertContains(this.output, subject(this), 'Expected the document to be named.')
})

Then('the source document is listed under the prerequisite relationship', function (this: DepWorld) {
  assertContains(this.output, 'REQUIRES:', 'Expected the prerequisite grouping.')
  assertContains(this.output, subject(this), 'Expected the source document to be listed.')
})

Then(
  "I receive the document path, whether the relationship was added, updated or removed, and the document's resulting relationships",
  function (this: DepWorld) {
    const report = this.json<LinkJson>()
    assertEqual(report.path, subject(this), 'Expected the path of the changed document.')
    assertTrue(['added', 'updated', 'removed'].includes(report.action), `Expected an action, got "${report.action}".`)
    assertTrue(Array.isArray(report.links), 'Expected the resulting relationships.')
    assertTrue(
      report.links.some((l) => l.target === this.recall<string>('target')),
      'Expected the declared relationship among the results.',
    )
  },
)
