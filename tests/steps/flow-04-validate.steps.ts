import { Given, Then, When } from '@cucumber/cucumber'
import { assertContains, assertEqual, assertMatches, assertNotContains, assertTrue } from '../support/expect.ts'
import type { DepWorld } from '../support/world.ts'

interface Check {
  name: string
  passed: boolean
  message?: string
}

interface ValidationJson {
  documents: Array<{ path: string; status: 'PASS' | 'WARN' | 'FAIL'; checks: Check[] }>
  graph: Check[]
}

const DEFECT_DOC = 'docs/reference/defective.md'

/** The defects the metadata-schema outline names, and the document each needs. */
function applyDefect(world: DepWorld, defect: string): void {
  const project = world.project
  const base = {
    path: DEFECT_DOC,
    title: 'A Document With One Defect',
    tags: ['defect'],
    body: 'Exactly one thing about this document is wrong.',
  }

  switch (defect) {
    case 'no owner and no confidence':
      project.addDoc({ ...base, omit: ['owner', 'confidence'] })
      break
    case 'a type of "guide"':
      project.addDoc({ ...base, type: 'guide' })
      break
    case 'an audience of "sales-team"':
      project.addDoc({ ...base, audience: ['sales-team'] })
      break
    case 'a relationship of "MENTIONS"':
      project.addDoc({ ...base, links: [{ target: 'docs/reference/types.md', rel: 'MENTIONS' }] })
      break
    case 'a confidence of "certain"':
      project.addDoc({ ...base, confidence: 'certain' })
      break
    case 'a creation date of "last Tuesday"':
      project.addDoc({ ...base, raw: { created: '"last Tuesday"' } })
      break
    default:
      throw new Error(`No fixture for the defect "${defect}".`)
  }

  // Keep the defective document reachable, so only its own defect is at issue.
  linkFromIndex(world, DEFECT_DOC)
}

function linkFromIndex(world: DepWorld, target: string): void {
  const project = world.project
  project.addDoc({
    path: 'docs/index.md',
    type: 'reference',
    audience: ['human-author', 'ai-agent'],
    tags: ['index'],
    title: 'Documentation Index',
    links: [
      { target: 'docs/reference/types.md', rel: 'USES' },
      { target: 'docs/reference/review-cadence.md', rel: 'USES' },
      { target: 'docs/explanation/why-type-purity-matters.md', rel: 'USES' },
      { target: 'docs/decision-records/adr-001-metadata-in-frontmatter.md', rel: 'USES' },
      { target: 'docs/how-to/validate-a-document.md', rel: 'USES' },
      { target, rel: 'USES' },
    ],
    body: 'Every document in this set, listed by type.',
  })
}

// ── Given ──────────────────────────────────────────────────────────────────

Given('every document declares complete, valid metadata', function (this: DepWorld) {
  this.project.seedStandard()
})

Given('every relationship points at a document that exists', function () {
  // The standard set only links to documents it also writes.
})

Given('every audience entry point exists', function (this: DepWorld) {
  for (const entry of ['seed.md', 'docs/tutorials/write-your-first-dep-document.md']) {
    assertTrue(this.project.exists(entry), `Expected the entry point ${entry} to exist.`)
  }
})

Given('no document is unreachable and no prerequisite cycle exists', function () {
  // Asserted by the outcome of the run itself.
})

Given('a documentation set with a mix of passing and failing documents', function (this: DepWorld) {
  this.project.seedStandard()
  this.project.addDoc({
    path: DEFECT_DOC,
    title: 'A Document With One Defect',
    type: 'guide',
    body: 'This one does not pass.',
  })
  linkFromIndex(this, DEFECT_DOC)
})

Given(/^a document that declares "(.+)"$/, function (this: DepWorld, defect: string) {
  this.project.seedStandard()
  applyDefect(this, defect)
})

Given('a document declares a relationship to a path that holds no file', function (this: DepWorld) {
  this.project.seedStandard()
  this.project.addDoc({
    path: DEFECT_DOC,
    title: 'A Document That Points Nowhere',
    links: [{ target: 'docs/reference/ghost.md', rel: 'USES' }],
    body: 'The target of this relationship was never written.',
  })
  linkFromIndex(this, DEFECT_DOC)
  this.note('broken-target', 'docs/reference/ghost.md')
})

Given('the project declares its own document type and its own relationship name', function (this: DepWorld) {
  this.project.configure({
    customTypes: [{ id: 'runbook', extends: 'how-to' }],
    customRelationships: [{ id: 'SUPERSEDES', meaning: 'Replaces an earlier document' }],
  })
  this.project.seedStandard()
})

Given('a document uses both of them', function (this: DepWorld) {
  this.project.addDoc({
    path: 'docs/how-to/incident-runbook.md',
    type: 'runbook',
    tags: ['operations'],
    title: 'Incident Runbook',
    links: [{ target: 'docs/how-to/validate-a-document.md', rel: 'SUPERSEDES' }],
    body: 'What to do when validation fails in production.',
  })
  linkFromIndex(this, 'docs/how-to/incident-runbook.md')
  this.note('custom-doc', 'docs/how-to/incident-runbook.md')
})

Given('a document links to another document in its prose only', function (this: DepWorld) {
  this.project.seedStandard()
  this.project.addDoc({
    path: 'docs/reference/prose-linker.md',
    title: 'A Document That Links in Prose',
    body: 'The type signatures are described in [the types reference](./types.md).',
  })
  linkFromIndex(this, 'docs/reference/prose-linker.md')
})

Given('a reference document whose review cadence is 30 days', function (this: DepWorld) {
  this.project.configure({ reviewCadence: { reference: 30 } })
  this.project.seedStandard()
})

Given('it was last verified {string} ago', function (this: DepWorld, age: string) {
  const days = Number(age.replace(/\D/g, ''))
  this.project.addDoc({
    path: 'docs/reference/aged.md',
    type: 'reference',
    title: 'A Reference of a Certain Age',
    verifiedDaysAgo: days,
    body: 'Its freshness follows from when it was last verified.',
  })
  linkFromIndex(this, 'docs/reference/aged.md')
  this.note('aged-doc', 'docs/reference/aged.md')
})

Given('every document is otherwise compliant', function (this: DepWorld) {
  this.project.seedStandard()
})

Given('one document has gone past twice its review cadence', function (this: DepWorld) {
  // A reference is re-verified every 30 days, so 90 days is well past twice that.
  this.project.addDoc({
    path: 'docs/reference/long-unverified.md',
    type: 'reference',
    title: 'A Reference Nobody Re-verified',
    verifiedDaysAgo: 90,
    body: 'Nobody has looked at this reference in months.',
  })
  linkFromIndex(this, 'docs/reference/long-unverified.md')
  this.note('stale-doc', 'docs/reference/long-unverified.md')
})

Given('every document passes its own checks', function (this: DepWorld) {
  this.project.seedStandard()
})

Given('the set has {string}', function (this: DepWorld, setDefect: string) {
  switch (setDefect) {
    case 'a document no entry point or index leads to':
      this.project.addDoc({
        path: 'docs/reference/unreachable.md',
        title: 'A Reference Nothing Leads To',
        body: 'Nothing in the set points at this document.',
      })
      this.note('set-check-subject', 'docs/reference/unreachable.md')
      break
    case 'two documents that require each other':
      this.project.addDoc({
        path: 'docs/reference/first-half.md',
        title: 'First Half',
        links: [{ target: 'docs/reference/second-half.md', rel: 'REQUIRES' }],
      })
      this.project.addDoc({
        path: 'docs/reference/second-half.md',
        title: 'Second Half',
        links: [{ target: 'docs/reference/first-half.md', rel: 'REQUIRES' }],
      })
      this.note('set-check-subject', 'docs/reference/first-half.md')
      break
    case 'an audience whose entry point document is missing':
      this.project.configure({
        audiences: [
          ...this.project.audienceIds().map((id) => ({
            id,
            entry_point:
              id === 'ai-generator'
                ? './seed.md'
                : id === 'ai-agent'
                  ? './docs/tutorials/integrate-dep-into-agent.md'
                  : id === 'human-author'
                    ? './docs/tutorials/write-your-first-dep-document.md'
                    : './docs/tutorials/bootstrap-dep-for-your-project.md',
          })),
          { id: 'support-engineer', entry_point: './docs/tutorials/support-onboarding.md' },
        ],
      })
      this.note('set-check-subject', 'support-engineer')
      break
    default:
      throw new Error(`No fixture for the set defect "${setDefect}".`)
  }
})

Given('a document is only reachable from an index document', function (this: DepWorld) {
  this.project.seedStandard()
  this.project.addDoc({
    path: 'docs/reference/only-in-the-index.md',
    title: 'A Reference Only the Index Leads To',
    body: 'The index is the single way in.',
  })
  linkFromIndex(this, 'docs/reference/only-in-the-index.md')
  this.note('index-only-doc', 'docs/reference/only-in-the-index.md')
})

// ── When ───────────────────────────────────────────────────────────────────

When('I ask for validation', async function (this: DepWorld) {
  await this.runInProject(['validate'])
})

When('I ask for validation in machine-readable form', async function (this: DepWorld) {
  await this.runInProject(['validate', '--json'])
})

// ── Then ───────────────────────────────────────────────────────────────────

Then('I am told how many documents were checked and how many passed, warned and failed', function (this: DepWorld) {
  assertMatches(
    this.output,
    /Documents: \d+ \| Pass: \d+ \| Warn: \d+ \| Fail: \d+/,
    'Expected the per-set tally.',
  )
})

Then('every document is reported as passing', function (this: DepWorld) {
  assertNotContains(this.output, '— FAIL', 'Expected no document to fail.')
  assertNotContains(this.output, '— WARN', 'Expected no document to warn.')
  const match = assertMatches(this.output, /Documents: (\d+) \| Pass: (\d+)/, 'Expected the tally.')
  assertEqual(match[2], match[1], 'Expected every checked document to pass.')
})

Then(
  'the set is reported as having no unreachable documents, no prerequisite cycles and no missing entry points',
  function (this: DepWorld) {
    assertContains(this.output, '✓ No orphans', 'Expected the unreachable-documents check to pass.')
    assertContains(this.output, '✓ No REQUIRES cycles', 'Expected the prerequisite-cycle check to pass.')
    assertContains(this.output, '✓ Entry points exist', 'Expected the entry-point check to pass.')
  },
)

Then('I receive one entry per document with its verdict and the outcome of each individual check', function (this: DepWorld) {
  const report = this.json<ValidationJson>()
  assertTrue(report.documents.length > 1, 'Expected an entry per document.')
  for (const doc of report.documents) {
    assertTrue(['PASS', 'WARN', 'FAIL'].includes(doc.status), `Expected a verdict for ${doc.path}.`)
    assertTrue(doc.checks.length > 0, `Expected the individual checks for ${doc.path}.`)
    assertTrue(
      doc.checks.every((c) => typeof c.passed === 'boolean' && typeof c.name === 'string'),
      `Expected each check of ${doc.path} to carry a name and an outcome.`,
    )
  }
  assertTrue(report.documents.some((d) => d.status === 'PASS'), 'Expected the passing documents.')
  assertTrue(report.documents.some((d) => d.status === 'FAIL'), 'Expected the failing documents.')
})

Then('I receive the outcome of each set-wide check', function (this: DepWorld) {
  const report = this.json<ValidationJson>()
  const names = report.graph.map((c) => c.name)
  for (const expected of ['No orphans', 'No REQUIRES cycles', 'Entry points exist']) {
    assertTrue(names.includes(expected), `Expected the set-wide check "${expected}". Got: ${names.join(', ')}`)
  }
})

Then('that document is reported as failing', function (this: DepWorld) {
  assertContains(this.output, `✗ ${DEFECT_DOC} — FAIL`, 'Expected the defective document to fail.')
})

Then('I am told which relationship targets are broken', function (this: DepWorld) {
  assertContains(this.output, 'Broken:', 'Expected the broken relationship targets to be named.')
  assertContains(this.output, this.recall<string>('broken-target'), 'Expected the missing target to be named.')
})

Then('that document is reported as passing', function (this: DepWorld) {
  const doc = this.recall<string>('custom-doc')
  assertContains(this.output, `✓ ${doc} — PASS`, 'Expected the document using project vocabulary to pass.')
})

Then('that link is not reported as an unknown relationship', function (this: DepWorld) {
  assertNotContains(this.output, 'Unknown rels', 'Expected prose links never to count as unknown relationships.')
})

Then('its freshness is reported as {string}', async function (this: DepWorld, state: string) {
  // The report only prints failing checks, so read the same verdict as data.
  const asData = await this.runQuiet(['validate', '--json'])
  const report = JSON.parse(asData.stdout) as ValidationJson
  const doc = report.documents.find((d) => d.path === this.recall<string>('aged-doc'))
  assertTrue(!!doc, 'Expected the aged document in the report.')
  const lifecycle = doc!.checks.find((c) => c.name.startsWith('Lifecycle:'))
  assertTrue(!!lifecycle, 'Expected a freshness check on the document.')
  assertEqual(lifecycle!.name, `Lifecycle: ${state}`, 'Expected the freshness state derived from the cadence.')
})

Then('that document is reported as warning rather than failing', function (this: DepWorld) {
  const doc = this.recall<string>('stale-doc')
  assertContains(this.output, `◐ ${doc} — WARN`, 'Expected the stale document to warn.')
  assertNotContains(this.output, `✗ ${doc} — FAIL`, 'Expected staleness never to fail a document.')
})

Then('the set-wide check {string} is reported as failing', function (this: DepWorld, check: string) {
  assertContains(this.output, `✗ ${check}`, `Expected the set-wide check "${check}" to fail.`)
})

Then('I am told which documents or audiences are involved', function (this: DepWorld) {
  assertContains(this.output, this.recall<string>('set-check-subject'), 'Expected the documents or audiences at fault to be named.')
})

Then('it is not reported as unreachable', function (this: DepWorld) {
  const doc = this.recall<string>('index-only-doc')
  const orphanLine = this.output.split('\n').find((line) => line.includes('No orphans')) ?? ''
  assertNotContains(orphanLine, doc, 'Expected a document reachable from the index not to count as unreachable.')
  assertContains(this.output, '✓ No orphans', 'Expected the unreachable-documents check to pass.')
})
