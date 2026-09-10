import { Given, Then, When } from '@cucumber/cucumber'
import { assertContains, assertEqual, assertTrue } from '../support/expect.ts'
import type { DepWorld } from '../support/world.ts'
import { SUBJECT_FILE } from './common.steps.ts'

interface TagJson {
  path: string
  tags: string[]
  added: string[]
  removed: string[]
  warnings: string[]
}

const TAGGED_DOC = 'docs/reference/tag-subject.md'

function subject(world: DepWorld): string {
  return world.notes.has(SUBJECT_FILE) ? world.recall<string>(SUBJECT_FILE) : TAGGED_DOC
}

/** Write the document this scenario curates, with the tags it starts from. */
function withTags(world: DepWorld, tags: string[], options: { omitTags?: boolean } = {}): void {
  world.project.seedStandard()
  world.project.addDoc({
    path: TAGGED_DOC,
    title: 'A Document Being Curated',
    tags,
    omit: options.omitTags ? ['tags'] : undefined,
    body: 'Its tags are what this scenario is about.',
  })
  world.note(SUBJECT_FILE, TAGGED_DOC)
  world.note('tags-before', tags)
}

// ── Given ──────────────────────────────────────────────────────────────────

Given('a document tagged {string}', function (this: DepWorld, tag: string) {
  withTags(this, [tag])
})

Given('a document tagged {string} and {string}', function (this: DepWorld, first: string, second: string) {
  withTags(this, [first, second])
})

Given('a document already tagged {string}', function (this: DepWorld, tag: string) {
  withTags(this, [tag])
})

Given('a document that is not tagged {string}', function (this: DepWorld, tag: string) {
  withTags(this, ['metadata'])
  assertTrue(!this.recall<string[]>('tags-before').includes(tag), `Expected the document not to carry "${tag}".`)
})

Given('a document that declares no tags at all', function (this: DepWorld) {
  withTags(this, [], { omitTags: true })
})

// ── When ───────────────────────────────────────────────────────────────────

When('I add the tag {string} to it', async function (this: DepWorld, tag: string) {
  this.note('added', [tag])
  await this.runInProject(['tag', subject(this), '--add', tag])
})

When('I add the tag {string}', async function (this: DepWorld, tag: string) {
  if (!this.notes.has(SUBJECT_FILE)) withTags(this, [])
  this.note('added', [tag])
  await this.runInProject(['tag', subject(this), '--add', tag])
})

When('I add {string} and remove {string}', async function (this: DepWorld, added: string, removed: string) {
  this.note('added', [added])
  this.note('removed', [removed])
  await this.runInProject(['tag', subject(this), '--add', added, '--remove', removed])
})

When('I add the tags {string} and {string} in one request', async function (this: DepWorld, first: string, second: string) {
  withTags(this, ['metadata'])
  this.note('added', [first, second])
  this.note('expected-on-disk', [['tags', [first, second]]])
  await this.runInProject(['tag', subject(this), '--add', `${first},${second}`])
})

When('I remove the tag {string}', async function (this: DepWorld, tag: string) {
  this.note('removed', [tag])
  await this.runInProject(['tag', subject(this), '--remove', tag])
})

When('I add {string} and then {string} in one request', async function (this: DepWorld, first: string, second: string) {
  this.note('added', [first, second])
  await this.runInProject(['tag', subject(this), '--add', `${first},${second}`])
})

When("I ask to curate a document's tags without naming a tag to add or remove", async function (this: DepWorld) {
  withTags(this, ['metadata'])
  await this.runInProject(['tag', subject(this)])
})

When('I add a tag to it', async function (this: DepWorld) {
  this.note('added', ['cli'])
  await this.runInProject(['tag', subject(this), '--add', 'cli'])
})

When("I curate a document's tags in machine-readable form", async function (this: DepWorld) {
  withTags(this, ['metadata', 'draft'])
  this.note('added', ['cli'])
  this.note('removed', ['draft'])
  await this.runInProject(['tag', subject(this), '--add', 'cli', '--remove', 'draft', '--json'])
})

// ── Then ───────────────────────────────────────────────────────────────────

Then('I am shown {string} as added', function (this: DepWorld, tag: string) {
  assertContains(this.output, `added: ${tag}`, 'Expected the added tag to be shown.')
})

Then("I am shown the document's full tag list afterwards", function (this: DepWorld) {
  const tags = this.project.metadataOf(subject(this)).tags as string[]
  assertContains(this.output, `tags: [${tags.join(', ')}]`, 'Expected the resulting tag list.')
})

Then('the document is tagged {string} and {string}', function (this: DepWorld, first: string, second: string) {
  const tags = this.project.metadataOf(subject(this)).tags as string[]
  assertEqual([...tags].sort().join(', '), [first, second].sort().join(', '), 'Expected exactly those tags on disk.')
})

Then('I am shown {string} as added and {string} as removed', function (this: DepWorld, added: string, removed: string) {
  assertContains(this.output, `added: ${added}`, 'Expected the added tag to be shown.')
  assertContains(this.output, `removed: ${removed}`, 'Expected the removed tag to be shown.')
})

Then('both are shown as added', function (this: DepWorld) {
  assertContains(this.output, `added: ${this.recall<string[]>('added').join(', ')}`, 'Expected both tags to be shown as added.')
})

Then('I am warned that the tag is already present', function (this: DepWorld) {
  assertContains(this.output, 'warning: Tag "cli" already present', 'Expected a warning about the duplicate tag.')
})

Then("the document's tags are unchanged", function (this: DepWorld) {
  const tags = this.project.metadataOf(subject(this)).tags as string[]
  assertEqual(tags.join(', '), this.recall<string[]>('tags-before').join(', '), 'Expected the tags to be untouched.')
})

Then('I am warned that the tag was not found', function (this: DepWorld) {
  assertContains(this.output, 'warning: Tag "draft" not found', 'Expected a warning that the tag was not there.')
})

Then('the document is tagged {string}', function (this: DepWorld, tag: string) {
  const tags = this.project.metadataOf(subject(this)).tags as string[]
  assertEqual(tags.join(', '), tag, 'Expected exactly that tag on disk.')
})

Then("the document's tags are listed as {string}, {string}, {string}", function (
  this: DepWorld,
  first: string,
  second: string,
  third: string,
) {
  const tags = this.project.metadataOf(subject(this)).tags as string[]
  assertEqual(tags.join(', '), [first, second, third].join(', '), 'Expected the tags in the order they were added.')
})

Then('I am shown how to name tags to add or remove, with an example', function (this: DepWorld) {
  assertContains(this.output, 'Usage: dep tag <file> --add <tag>', 'Expected the usage line.')
  assertContains(this.output, 'Example:', 'Expected an example.')
})

Then('I am told it carries no DEP metadata, naming the file', function (this: DepWorld) {
  assertContains(this.output, 'No dep: block in frontmatter', 'Expected to be told the file carries no DEP metadata.')
  assertContains(this.output, subject(this), 'Expected the file to be named.')
})

Then(
  'I receive the document path, its resulting tags, what was added, what was removed and any warnings',
  function (this: DepWorld) {
    const report = this.json<TagJson>()
    assertEqual(report.path, subject(this), 'Expected the path of the curated document.')
    assertEqual(report.added.join(', '), this.recall<string[]>('added').join(', '), 'Expected what was added.')
    assertEqual(report.removed.join(', '), this.recall<string[]>('removed').join(', '), 'Expected what was removed.')
    assertTrue(Array.isArray(report.tags) && report.tags.length > 0, 'Expected the resulting tags.')
    assertTrue(Array.isArray(report.warnings), 'Expected the warnings, even when there are none.')
  },
)
