import { Given, Then, When } from '@cucumber/cucumber'
import { assertContains, assertEqual, assertIncludesAll, assertTrue } from '../support/expect.ts'
import type { DepWorld } from '../support/world.ts'
import { SUBJECT_FILE } from './common.steps.ts'

interface SetJson {
  path: string
  changes: Array<{ field: string; old: unknown; new: unknown }>
  dry: boolean
}

const SCHEMA_DOC = 'docs/reference/metadata-schema.md'

function subject(world: DepWorld): string {
  return world.notes.has(SUBJECT_FILE) ? world.recall<string>(SUBJECT_FILE) : SCHEMA_DOC
}

// ── Given ──────────────────────────────────────────────────────────────────

Given('{string} declares a confidence of {string}', function (this: DepWorld, path: string, confidence: string) {
  this.project.seedStandard()
  assertEqual(this.project.metadataOf(path).confidence, confidence, `Expected ${path} to start at that confidence.`)
  this.note(SUBJECT_FILE, path)
})

Given('a document declares a confidence of {string}', function (this: DepWorld, confidence: string) {
  this.project.seedStandard()
  assertEqual(this.project.metadataOf(SCHEMA_DOC).confidence, confidence, 'Expected the document to start there.')
  this.note(SUBJECT_FILE, SCHEMA_DOC)
})

Given('a document that declares no tags', function (this: DepWorld) {
  this.project.seedStandard()
  const path = 'docs/reference/untagged.md'
  this.project.addDoc({ path, title: 'An Untagged Reference', body: 'No tags on this one.', omit: ['tags'] })
  this.note(SUBJECT_FILE, path)
})

Given('the project declares its own document type', function (this: DepWorld) {
  this.project.configure({ customTypes: [{ id: 'runbook', extends: 'how-to' }] })
  this.project.seedStandard()
  this.note('custom-type', 'runbook')
  this.note(SUBJECT_FILE, SCHEMA_DOC)
})

Given(/^"(a markdown file .+)"$/, function (this: DepWorld, fileState: string) {
  this.project.seedStandard()
  const path = 'docs/reference/not-a-dep-document.md'
  if (fileState === 'a markdown file with no frontmatter at all') {
    this.project.addPlainMarkdown(path)
  } else if (fileState === 'a markdown file whose frontmatter has no DEP metadata') {
    this.project.addNonDepFrontmatter(path)
  } else {
    throw new Error(`No fixture for the file state "${fileState}".`)
  }
  this.note(SUBJECT_FILE, path)
})

Given('a document with prose, code samples and links', function (this: DepWorld) {
  this.project.seedStandard()
  const path = 'docs/reference/rich-document.md'
  this.project.addDoc({
    path,
    title: 'A Document With Everything In It',
    body: [
      'Some prose that must survive a metadata change.',
      '',
      '```bash',
      'dep validate --root .',
      '```',
      '',
      'And [a link to the type signatures](./types.md).',
    ].join('\n'),
  })
  this.note(SUBJECT_FILE, path)
  this.note('body-before', this.project.bodyOf(path))
})

// ── When ───────────────────────────────────────────────────────────────────

When('I declare its confidence to be {string}', async function (this: DepWorld, confidence: string) {
  this.note('field', 'confidence')
  this.note('value', confidence)
  await this.runInProject(['set', subject(this), '--confidence', confidence])
})

When("I declare a document's confidence to be {string} and its owner to be {string}", async function (
  this: DepWorld,
  confidence: string,
  owner: string,
) {
  this.project.seedStandard()
  this.note(SUBJECT_FILE, SCHEMA_DOC)
  this.note('changes', [
    ['confidence', confidence],
    ['owner', owner],
  ])
  this.note('expected-on-disk', [
    ['confidence', confidence],
    ['owner', owner],
  ])
  await this.runInProject(['set', SCHEMA_DOC, '--confidence', confidence, '--owner', owner])
})

When("I declare a document's {string} to be {string}", async function (this: DepWorld, field: string, value: string) {
  if (!this.project.seeded) this.project.seedStandard()
  const path = subject(this)
  this.note(SUBJECT_FILE, path)
  this.note('field', field)
  this.note('value', value)
  this.note('file-before', this.project.read(path))
  await this.runInProject(['set', path, `--${field}`, value])
})

When('I preview declaring its confidence to be {string}', async function (this: DepWorld, confidence: string) {
  this.note('field', 'confidence')
  this.note('value', confidence)
  await this.runInProject(['set', subject(this), '--confidence', confidence, '--dry'])
})

When('I declare its tags to be {string}', async function (this: DepWorld, tags: string) {
  this.note('field', 'tags')
  this.note('value', tags)
  await this.runInProject(['set', subject(this), '--tags', tags])
})

When("I declare a document's type to be that type", async function (this: DepWorld) {
  const type = this.recall<string>('custom-type')
  this.note('field', 'type')
  this.note('value', type)
  await this.runInProject(['set', subject(this), '--type', type])
})

When('I ask to change a document without naming any field', async function (this: DepWorld) {
  this.project.seedStandard()
  await this.runInProject(['set', SCHEMA_DOC])
})

When('I declare a metadata field on it', async function (this: DepWorld) {
  this.note('field', 'confidence')
  this.note('value', 'low')
  await this.runInProject(['set', subject(this), '--confidence', 'low'])
})

When('I declare a metadata field in machine-readable form', async function (this: DepWorld) {
  this.project.seedStandard()
  this.note(SUBJECT_FILE, SCHEMA_DOC)
  await this.runInProject(['set', SCHEMA_DOC, '--confidence', 'low', '--json'])
})

// ── Then ───────────────────────────────────────────────────────────────────

Then('I am shown the document and its confidence changing from {string} to {string}', function (
  this: DepWorld,
  from: string,
  to: string,
) {
  assertContains(this.output, subject(this), 'Expected the document to be named.')
  assertContains(this.output, `confidence: ${from} → ${to}`, 'Expected the change to be shown.')
})

Then('the document now declares a confidence of {string}', function (this: DepWorld, confidence: string) {
  assertEqual(this.project.metadataOf(subject(this)).confidence, confidence, 'Expected the new confidence on disk.')
})

Then('I am shown both changes', function (this: DepWorld) {
  for (const [field, value] of this.recall<Array<[string, string]>>('changes')) {
    assertContains(this.output, `${field}:`, `Expected the ${field} change to be shown.`)
    assertContains(this.output, `→ ${value}`, `Expected the new ${field} to be shown.`)
  }
})

Then('the document records {string} as a list of the separate entries', function (this: DepWorld, field: string) {
  const value = this.recall<string>('value')
  const recorded = this.project.metadataOf(subject(this))[field]
  assertTrue(Array.isArray(recorded), `Expected ${field} to be recorded as a list, got: ${JSON.stringify(recorded)}`)
  assertEqual((recorded as string[]).join(','), value.split(',').map((v) => v.trim()).join(','), 'Expected one entry per value.')
})

Then('I am told the document was not modified', function (this: DepWorld) {
  assertContains(this.output, 'Dry run — file not modified.', 'Expected to be told nothing was written.')
})

Then('I am shown what the change would be', function (this: DepWorld) {
  assertContains(this.output, `${this.recall<string>('field')}:`, 'Expected the field of the previewed change.')
  assertContains(this.output, `→ ${this.recall<string>('value')}`, 'Expected the previewed new value.')
})

Then('the document still declares a confidence of {string}', function (this: DepWorld, confidence: string) {
  assertEqual(this.project.metadataOf(subject(this)).confidence, confidence, 'Expected the document to be untouched.')
})

Then('I am shown the field changing from unset to {string}', function (this: DepWorld, value: string) {
  assertContains(this.output, `${this.recall<string>('field')}: unset → ${value}`, 'Expected the change from unset.')
})

Then('I am told the value is invalid and which values are allowed', function (this: DepWorld) {
  const field = this.recall<string>('field')
  const value = this.recall<string>('value')
  assertContains(this.output, 'Invalid', 'Expected the value to be refused as invalid.')
  assertContains(this.output, value, 'Expected the refused value to be named.')
  if (field === 'created' || field === 'last_verified') {
    assertContains(this.output, 'ISO 8601', 'Expected the allowed date form to be named.')
  } else {
    assertContains(this.output, ':', 'Expected the allowed values to be listed.')
    assertTrue(/Must be one of|Valid:/.test(this.output), `Expected the allowed values to be listed:\n${this.output}`)
  }
})

Then('I am told {string} is not a known metadata field', function (this: DepWorld, field: string) {
  assertContains(this.output, `Unknown metadata field: ${field}`, 'Expected the unknown field to be refused.')
})

Then('I am told which fields are known', function (this: DepWorld) {
  assertIncludesAll(
    this.output,
    ['type', 'audience', 'owner', 'created', 'last_verified', 'confidence', 'depends_on', 'tags'],
    'Expected the known fields to be listed.',
  )
})

Then('the change is recorded', function (this: DepWorld) {
  assertEqual(
    String(this.project.metadataOf(subject(this))[this.recall<string>('field')]),
    this.recall<string>('value'),
    'Expected the change on disk.',
  )
})

Then('I am shown how to name a field and an example', function (this: DepWorld) {
  assertContains(this.output, 'Usage: dep set <file> --<field> <value>', 'Expected the usage line.')
  assertContains(this.output, 'Example:', 'Expected an example.')
})

Then('I am told {string}, naming the file', function (this: DepWorld, message: string) {
  assertContains(this.output, message, 'Expected that message.')
  assertContains(this.output, subject(this), 'Expected the file to be named.')
})

Then('its prose, code samples and links are unchanged', function (this: DepWorld) {
  assertEqual(this.project.bodyOf(subject(this)), this.recall<string>('body-before'), 'Expected the body to survive.')
})

Then('I receive the document path and each field with its old and new value', function (this: DepWorld) {
  const report = this.json<SetJson>()
  assertEqual(report.path, subject(this), 'Expected the path of the changed document.')
  assertTrue(report.changes.length > 0, 'Expected at least one change.')
  for (const change of report.changes) {
    assertTrue(typeof change.field === 'string', 'Expected the field name.')
    assertTrue('old' in change, 'Expected the old value.')
    assertTrue('new' in change, 'Expected the new value.')
  }
})
