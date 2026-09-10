import { Given, Then, When } from '@cucumber/cucumber'
import { assertContains, assertEqual, assertMatches, assertTrue } from '../support/expect.ts'
import type { DepWorld } from '../support/world.ts'

interface SearchResult {
  path: string
  score: number
  title: string
  matches: { title: boolean; tags: string[]; body: string[] }
}

const LONG_LINE_DOC = 'docs/reference/verbose-reference.md'

// ── Given ──────────────────────────────────────────────────────────────────

Given('a project whose documents mention {string} in titles, tags and prose', function (this: DepWorld, word: string) {
  this.project.seedStandard()
  assertEqual(word, 'lifecycle', 'The fixture set is built around the word "lifecycle".')
})

Given('a document whose tags include {string} and whose prose mentions it', function (this: DepWorld, tag: string) {
  this.project.seedStandard()
  this.project.addDoc({
    path: 'docs/reference/lifecycle-states.md',
    tags: [tag, 'states'],
    title: 'Lifecycle States',
    body: `Every document moves through the ${tag} states in order.`,
  })
  this.note('tagged-doc', 'docs/reference/lifecycle-states.md')
  this.note('tag', tag)
})

Given('a document whose title contains every word I search for', function (this: DepWorld) {
  this.project.seedStandard()
  // The standard set already holds "Why Type Purity Matters" and
  // "Review Cadence and Freshness"; both titles carry their whole query.
})

Given('another document that contains those words only in its prose', function (this: DepWorld) {
  // "DEP Metadata Schema" mentions type purity and review cadence in prose only.
  this.note('prose-only-doc', 'docs/reference/metadata-schema.md')
})

Given('a document mentions {string} but never mentions {string}', function (this: DepWorld, present: string, absent: string) {
  this.project.seedStandard()
  this.project.addDoc({
    path: 'docs/reference/one-word-only.md',
    tags: ['states'],
    title: 'One Word Only',
    body: `This document is all about the ${present} of a document, and nothing else.`,
  })
  assertTrue(!this.project.read('docs/reference/one-word-only.md').includes(absent), `Expected no mention of "${absent}".`)
  this.note('single-word-doc', 'docs/reference/one-word-only.md')
})

Given('a document titled {string}', function (this: DepWorld, title: string) {
  this.project.seedStandard()
  this.project.addDoc({
    path: 'docs/reference/document-lifecycle.md',
    tags: ['states'],
    title,
    body: 'How a document ages between reviews.',
  })
  this.note('titled-doc', 'docs/reference/document-lifecycle.md')
})

Given('a document whose matching prose line is longer than 120 characters', function (this: DepWorld) {
  this.project.seedStandard()
  const longLine =
    'The vectoriser walks every document in the set, splits it into chunks along its headings, and stores one embedding per chunk so that later requests never re-read the file.'
  assertTrue(longLine.length > 120, 'Expected the fixture line to be longer than 120 characters.')
  this.project.addDoc({
    path: LONG_LINE_DOC,
    tags: ['states'],
    title: 'A Verbose Reference',
    body: longLine,
  })
  this.note('long-word', 'vectoriser')
})

Given('documents of several types mention {string}', function (this: DepWorld, word: string) {
  this.project.seedStandard()
  this.project.addDoc({
    path: 'docs/reference/validation-checks.md',
    type: 'reference',
    tags: ['checks'],
    title: 'Validation Checks',
    body: `Each ${word} check and what makes it fail.`,
  })
  this.note('word', word)
  this.note('excluded-reference', 'docs/reference/validation-checks.md')
})

Given('no document mentions {string}', function (this: DepWorld, word: string) {
  this.project.seedStandard()
  assertTrue(
    !this.project.read('docs/reference/metadata-schema.md').includes(word),
    `Expected the fixture set never to mention "${word}".`,
  )
})

// ── When ───────────────────────────────────────────────────────────────────

When('I search for {string}', async function (this: DepWorld, query: string) {
  this.note('query', query)
  await this.runInProject(['search', query])
})

When('I search for a word on that line', async function (this: DepWorld) {
  await this.runInProject(['search', this.recall<string>('long-word'), '--json'])
})

When('I search for {string} among documents of type {string}', async function (this: DepWorld, query: string, type: string) {
  this.note('query', query)
  await this.runInProject(['search', query, '--type', type, '--json'])
})

When('I search for {string} in machine-readable form', async function (this: DepWorld, query: string) {
  // This scenario names no set of its own; the standard one already mentions the word.
  this.project.seedStandard()
  this.note('query', query)
  await this.runInProject(['search', query, '--json'])
})

// ── Then ───────────────────────────────────────────────────────────────────

Then('I am told how many documents matched my words', function (this: DepWorld) {
  assertMatches(this.output, /^\d+ result\(s\) for "lifecycle":/m, 'Expected the number of matches.')
})

Then('each match is shown with its path, its score and its title', function (this: DepWorld) {
  assertMatches(this.output, /\[\d+\] \S+\.md \(score: \d+\)/, 'Expected the path and score of each match.')
  assertMatches(this.output, /Title: .+/, 'Expected the title of each match.')
})

Then('the matches are ordered with the strongest first', async function (this: DepWorld) {
  const asData = await this.runQuiet(['search', this.recall<string>('query'), '--json'])
  const results = JSON.parse(asData.stdout) as SearchResult[]
  assertTrue(results.length > 1, 'Expected more than one match to order.')
  const scores = results.map((r) => r.score)
  const sorted = [...scores].sort((a, b) => b - a)
  assertEqual(scores.join(','), sorted.join(','), 'Expected the matches to be ordered strongest first.')
})

Then('I am shown the matching tags for that document', function (this: DepWorld) {
  const block = blockFor(this.output, this.recall<string>('tagged-doc'))
  assertContains(block, `Tags: ${this.recall<string>('tag')}`, 'Expected the matching tags of that document.')
})

Then('I am shown up to three excerpts of the surrounding prose', async function (this: DepWorld) {
  const asData = await this.runQuiet(['search', this.recall<string>('query'), '--json'])
  const results = JSON.parse(asData.stdout) as SearchResult[]
  const match = results.find((r) => r.path === this.recall<string>('tagged-doc'))
  assertTrue(!!match, 'Expected the tagged document among the matches.')
  assertTrue(match!.matches.body.length > 0, 'Expected at least one prose excerpt.')
  assertTrue(match!.matches.body.length <= 3, 'Expected at most three prose excerpts.')
})

Then('the document matching in the title scores higher than the other', async function (this: DepWorld) {
  const query = this.recall<string>('query')
  const asData = await this.runQuiet(['search', query, '--json'])
  const results = JSON.parse(asData.stdout) as SearchResult[]

  const inTitle = results.filter((r) => r.matches.title)
  assertTrue(inTitle.length > 0, `Expected a document whose title carries "${query}".`)

  const proseOnly = results.find((r) => r.path === this.recall<string>('prose-only-doc'))
  assertTrue(!!proseOnly, `Expected the prose-only document to match "${query}" too.`)

  for (const titled of inTitle) {
    assertTrue(
      titled.score > proseOnly!.score,
      `Expected ${titled.path} (${titled.score}) to outscore ${proseOnly!.path} (${proseOnly!.score}).`,
    )
  }
})

Then('that document is not returned', function (this: DepWorld) {
  const doc = this.recall<string>('single-word-doc')
  assertTrue(!this.output.includes(doc), `Expected ${doc} to be left out when one of my words is missing.`)
})

Then('that document is returned', function (this: DepWorld) {
  assertContains(this.output, this.recall<string>('titled-doc'), 'Expected the match regardless of case.')
})

Then('the excerpt I am shown is shortened and marked as continuing', function (this: DepWorld) {
  const results = this.json<SearchResult[]>()
  const match = results.find((r) => r.path === LONG_LINE_DOC)
  assertTrue(!!match, 'Expected the verbose document among the matches.')
  const excerpt = match!.matches.body[0]
  assertTrue(!!excerpt, 'Expected a prose excerpt.')
  assertTrue(excerpt!.endsWith('...'), 'Expected the excerpt to be marked as continuing.')
  assertEqual(excerpt!.length, 123, 'Expected the excerpt to be shortened to 120 characters plus the marker.')
})

Then('every match is a how-to', function (this: DepWorld) {
  const results = this.json<SearchResult[]>()
  assertTrue(results.length > 0, 'Expected at least one match.')
  for (const result of results) {
    assertContains(result.path, 'docs/how-to/', `Expected ${result.path} to be a how-to.`)
  }
})

Then('references mentioning {string} are excluded', function (this: DepWorld, word: string) {
  const results = this.json<SearchResult[]>()
  const excluded = this.recall<string>('excluded-reference')
  assertTrue(
    !results.some((r) => r.path === excluded),
    `Expected the reference mentioning "${word}" to be left out of a how-to search.`,
  )
})

Then('I am told that there are no results for {string}', function (this: DepWorld, query: string) {
  assertContains(this.output, `No results for "${query}"`, 'Expected to be told nothing matched.')
})

Then(
  'each match carries its path, score, title, whether the title matched, the matching tags and the prose excerpts',
  function (this: DepWorld) {
    const results = this.json<SearchResult[]>()
    assertTrue(results.length > 0, 'Expected at least one match.')
    for (const result of results) {
      assertTrue(typeof result.path === 'string', 'Expected a path.')
      assertTrue(typeof result.score === 'number', 'Expected a score.')
      assertTrue(typeof result.title === 'string', 'Expected a title.')
      assertTrue(typeof result.matches.title === 'boolean', 'Expected whether the title matched.')
      assertTrue(Array.isArray(result.matches.tags), 'Expected the matching tags.')
      assertTrue(Array.isArray(result.matches.body), 'Expected the prose excerpts.')
    }
  },
)

/** The block of output describing one match. */
function blockFor(output: string, path: string): string {
  const lines = output.split('\n')
  const start = lines.findIndex((line) => line.includes(path))
  if (start === -1) throw new Error(`Expected ${path} among the matches:\n${output}`)
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => /^\s*\[\d+\]/.test(line))
  return [lines[start], ...(end === -1 ? rest : rest.slice(0, end))].join('\n')
}
