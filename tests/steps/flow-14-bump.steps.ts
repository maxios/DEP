import { Given, Then, When } from '@cucumber/cucumber'
import { assertContains, assertEqual, assertMatches, assertTrue } from '../support/expect.ts'
import { daysSince } from '../support/dates.ts'
import type { DepWorld } from '../support/world.ts'

interface BumpJson {
  updated: Array<{ path: string; old: string; new: string }>
  skipped: string[]
  dry?: boolean
}

const SCHEMA_DOC = 'docs/reference/metadata-schema.md'

const BUMP_FLAG: Record<string, string> = {
  type: '--type',
  lifecycle: '--lifecycle',
  owner: '--owner',
  confidence: '--confidence',
  audience: '--audience',
  tag: '--tag',
}

/** Every document's last_verified, keyed by path. */
async function verificationDates(world: DepWorld): Promise<Map<string, string>> {
  const result = await world.runQuiet(['query', '--json'])
  const docs = JSON.parse(result.stdout) as Array<{ path: string }>
  const dates = new Map<string, string>()
  for (const doc of docs) {
    dates.set(doc.path, world.project.declaredValue(doc.path, 'last_verified'))
  }
  return dates
}

// ── Given ──────────────────────────────────────────────────────────────────

Given('{string} was last verified months ago', function (this: DepWorld, path: string) {
  this.project.seedStandard()
  this.project.addDoc({
    path,
    type: 'reference',
    audience: ['ai-generator', 'ai-agent', 'human-author'],
    confidence: 'medium',
    tags: ['metadata', 'schema'],
    title: 'DEP Metadata Schema',
    verifiedDaysAgo: 150,
    body: 'Every field of the metadata block, with its constraints.',
  })
  this.note('subject', path)
  this.note('old-date', this.project.declaredValue(path, 'last_verified'))
})

Given('a set of documents with mixed verification dates', async function (this: DepWorld) {
  this.project.seedVaried()
  this.note('dates-before', await verificationDates(this))
})

Given('a set whose documents vary in type, freshness, owner, confidence, audience and tags', async function (this: DepWorld) {
  this.project.seedVaried()
  this.note('dates-before', await verificationDates(this))
})

Given('the set holds documents under several directories', async function (this: DepWorld) {
  this.project.seedVaried()
  this.note('dates-before', await verificationDates(this))
  this.note('pattern', 'docs/reference/*.md')
})

Given('no document in the set is stale', async function (this: DepWorld) {
  this.project.seedStandard()
  const result = await this.runQuiet(['query', '--lifecycle', 'STALE', '--json'])
  assertEqual(JSON.parse(result.stdout).length, 0, 'Expected the fixture set to hold no stale documents.')
})

Given('the documentation root also holds a markdown file with no DEP metadata', function (this: DepWorld) {
  this.project.seedStandard()
  const path = 'docs/reference/loose-notes.md'
  this.project.addPlainMarkdown(path)
  this.note('skipped-file', path)
})

// ── When ───────────────────────────────────────────────────────────────────

When('I record that document as verified', async function (this: DepWorld) {
  await this.runInProject(['bump', this.recall<string>('subject')])
})

When('I record the whole set as verified', async function (this: DepWorld) {
  await this.runInProject(['bump', '--all'])
})

When('I record as verified only the documents whose {string} is {string}', async function (
  this: DepWorld,
  dimension: string,
  value: string,
) {
  const flag = BUMP_FLAG[dimension]
  assertTrue(!!flag, `No narrowing flag is defined for the dimension "${dimension}".`)
  this.note('dimension', dimension)
  this.note('value', value)

  // Re-verifying can change the very dimension being narrowed on (freshness),
  // so record which documents carry the value before acting.
  const carrying = JSON.parse((await this.runQuiet(['query', flag!, value, '--json'])).stdout) as Array<{ path: string }>
  this.note('carrying', carrying.map((d) => d.path))

  const bump = await this.runInProject(['bump', '--all', flag!, value, '--json'])
  this.note('bump-report', JSON.parse(bump.stdout))
})

When('I record as verified the documents matching a path pattern', async function (this: DepWorld) {
  await this.runInProject(['bump', this.recall<string>('pattern'), '--json'])
})

When('I preview re-verifying the whole set', async function (this: DepWorld) {
  this.project.seedStandard()
  this.note('dates-before', await verificationDates(this))
  await this.runInProject(['bump', '--all', '--dry'])
})

When('I record several documents as verified in one request', async function (this: DepWorld) {
  this.project.seedVaried()
  await this.runInProject(['bump', '--all', '--json'])
})

When('I record as verified only the stale documents', async function (this: DepWorld) {
  await this.runInProject(['bump', '--all', '--lifecycle', 'STALE'])
})

When('I ask to record verification without naming a document or the whole set', async function (this: DepWorld) {
  this.project.seedStandard()
  await this.runInProject(['bump'])
})

When('I record the whole set as verified in machine-readable form', async function (this: DepWorld) {
  this.project.seedStandard()
  this.project.addPlainMarkdown('docs/reference/loose-notes.md')
  await this.runInProject(['bump', '--all', '--json'])
})

// ── Then ───────────────────────────────────────────────────────────────────

Then('I am shown its verification date moving from the old date to now', function (this: DepWorld) {
  const subject = this.recall<string>('subject')
  assertContains(this.output, subject, 'Expected the document to be named.')
  assertContains(this.output, `  ${this.recall<string>('old-date')} → `, 'Expected the move from its old date.')
})

Then('it is reported as fresh from now on', function (this: DepWorld) {
  const recorded = this.project.declaredValue(this.recall<string>('subject'), 'last_verified')
  assertTrue(daysSince(recorded) === 0, `Expected the document to be verified today, got ${recorded}.`)
})

Then('every document carrying DEP metadata is re-verified', async function (this: DepWorld) {
  const before = this.recall<Map<string, string>>('dates-before')
  for (const [path] of before) {
    assertTrue(
      daysSince(this.project.declaredValue(path, 'last_verified')) === 0,
      `Expected ${path} to have been re-verified.`,
    )
  }
})

Then('I am told how many documents were updated', function (this: DepWorld) {
  assertMatches(this.output, /^\d+ document\(s\) updated\./m, 'Expected the number of updated documents.')
})

Then('only documents carrying that {string} are re-verified', function (this: DepWorld, dimension: string) {
  const report = this.recall<BumpJson>('bump-report')
  const value = this.recall<string>('value')
  const expected = this.recall<string[]>('carrying')

  assertTrue(expected.length > 0, `Expected the set to hold documents whose ${dimension} is "${value}".`)
  assertEqual(
    report.updated.map((u) => u.path).sort().join(', '),
    [...expected].sort().join(', '),
    `Expected exactly the documents whose ${dimension} is "${value}" to be re-verified.`,
  )
})

Then('the rest keep their previous verification date', function (this: DepWorld) {
  const before = this.recall<Map<string, string>>('dates-before')
  const updated = new Set(this.recall<BumpJson>('bump-report').updated.map((u) => u.path))
  let untouched = 0
  for (const [path, date] of before) {
    if (updated.has(path)) continue
    untouched++
    assertEqual(this.project.declaredValue(path, 'last_verified'), date, `Expected ${path} to be left alone.`)
  }
  assertTrue(untouched > 0, 'Expected the narrowing to leave some documents alone.')
})

Then('only documents whose path matches the pattern are re-verified', function (this: DepWorld) {
  const report = this.json<BumpJson>()
  assertTrue(report.updated.length > 0, 'Expected the pattern to match some documents.')
  for (const update of report.updated) {
    assertMatches(update.path, /^docs\/reference\/[^/]+\.md$/, 'Expected only documents matching the pattern.')
  }
  const before = this.recall<Map<string, string>>('dates-before')
  const matched = new Set(report.updated.map((u) => u.path))
  for (const [path, date] of before) {
    if (matched.has(path)) continue
    assertEqual(this.project.declaredValue(path, 'last_verified'), date, `Expected ${path} to be left alone.`)
  }
})

Then('I am told no files were modified', function (this: DepWorld) {
  assertContains(this.output, 'Dry run — no files modified.', 'Expected to be told nothing was written.')
})

Then('I am shown, for each document, the date it would move from and to', function (this: DepWorld) {
  const before = this.recall<Map<string, string>>('dates-before')
  for (const [path, date] of before) {
    assertContains(this.output, `[dry] ${path}`, `Expected ${path} in the preview.`)
    assertContains(this.output, `  ${date} → `, `Expected the date ${path} would move from.`)
    assertEqual(this.project.declaredValue(path, 'last_verified'), date, `Expected ${path} to be untouched.`)
  }
})

Then('I am told how many documents would be updated', function (this: DepWorld) {
  assertMatches(this.output, /^\d+ document\(s\) would be updated\./m, 'Expected the number that would be updated.')
})

Then('every one of them records the same verification moment', function (this: DepWorld) {
  const report = this.json<BumpJson>()
  assertTrue(report.updated.length > 1, 'Expected several documents to have been re-verified.')
  const moments = new Set(report.updated.map((u) => u.new))
  assertEqual(moments.size, 1, `Expected one shared verification moment, got: ${[...moments].join(', ')}`)
  for (const update of report.updated) {
    assertEqual(this.project.declaredValue(update.path, 'last_verified'), update.new, 'Expected that moment on disk.')
  }
})

Then('I am told no matching documents were found', function (this: DepWorld) {
  assertContains(this.output, 'No matching documents found.', 'Expected to be told nothing matched.')
})

Then('nothing is modified', function (this: DepWorld) {
  assertContains(this.output, 'No matching documents found.', 'Expected no updates to be reported.')
  assertTrue(!this.output.includes('→'), 'Expected no document to be reported as changed.')
})

Then('that file is reported as skipped for having no DEP metadata', function (this: DepWorld) {
  assertContains(this.output, 'Skipped (no dep: block)', 'Expected the file to be reported as skipped.')
  assertContains(this.output, this.recall<string>('skipped-file'), 'Expected the skipped file to be named.')
})

Then('every DEP document is still re-verified', function (this: DepWorld) {
  assertMatches(this.output, /^\d+ document\(s\) updated\./m, 'Expected the DEP documents to have been re-verified.')
  assertTrue(
    daysSince(this.project.declaredValue(SCHEMA_DOC, 'last_verified')) === 0,
    'Expected the DEP documents to carry today’s date.',
  )
})

Then('I am shown how to name a document, a pattern or the whole set', function (this: DepWorld) {
  assertContains(this.output, 'Usage: dep bump <file|glob> [--all]', 'Expected the usage line.')
})

Then(
  'I receive each updated document with its old and new verification date, and the list of skipped files',
  function (this: DepWorld) {
    const report = this.json<BumpJson>()
    assertTrue(report.updated.length > 0, 'Expected the updated documents.')
    for (const update of report.updated) {
      assertTrue(typeof update.path === 'string', 'Expected the path of each update.')
      assertTrue(typeof update.old === 'string', 'Expected the old verification date.')
      assertTrue(typeof update.new === 'string', 'Expected the new verification date.')
    }
    assertTrue(Array.isArray(report.skipped), 'Expected the list of skipped files.')
    assertTrue(report.skipped.includes('docs/reference/loose-notes.md'), 'Expected the file with no DEP metadata to be skipped.')
  },
)
