import { Given, Then, When } from '@cucumber/cucumber'
import { assertContains, assertEqual, assertMatches, assertNotContains, assertTrue } from '../support/expect.ts'
import type { DepWorld } from '../support/world.ts'

interface GraphJson {
  nodes: Record<string, {
    path: string
    type: string
    audience: string[]
    confidence: string
    lifecycle: string
    forwardLinks: Array<{ source: string; target: string; rel: string }>
    backlinks: Array<{ source: string; target: string; rel: string }>
  }>
  edges: Array<{ source: string; target: string; rel: string }>
  orphans: string[]
  cycles: string[][]
  stats: { documents: number; edges: number; orphans: number; cycles: number }
}

// ── Given ──────────────────────────────────────────────────────────────────

Given('a project with documents of several types', function (this: DepWorld) {
  this.project.seedStandard()
})

Given('a project with documents and relationships', function (this: DepWorld) {
  this.project.seedStandard()
})

Given('a project with typed relationships between documents', function (this: DepWorld) {
  this.project.seedStandard()
})

Given('the project has a seed document at its root', function (this: DepWorld) {
  this.project.seedStandard()
  assertTrue(this.project.exists('seed.md'), 'Expected a seed document at the project root.')
})

Given('the documentation root also holds markdown files with no DEP metadata', function (this: DepWorld) {
  this.project.seedStandard()
  this.project.addPlainMarkdown('docs/reference/scratch-notes.md')
  this.project.addNonDepFrontmatter('docs/reference/other-frontmatter.md')
  this.note('undepped', ['docs/reference/scratch-notes.md', 'docs/reference/other-frontmatter.md'])
})

Given('a document declares a typed relationship to another document', function (this: DepWorld) {
  this.project.seedStandard()
  this.project.addDoc({
    path: 'docs/reference/duplicating-links.md',
    tags: ['links'],
    title: 'A Document That Links Twice',
    links: [{ target: 'docs/reference/types.md', rel: 'USES' }],
    body: 'This reference points at the type signatures.',
  })
  this.note('link-source', 'docs/reference/duplicating-links.md')
  this.note('link-target', 'docs/reference/types.md')
})

Given('its prose also links to that same document', function (this: DepWorld) {
  this.project.addDoc({
    path: 'docs/reference/duplicating-links.md',
    tags: ['links'],
    title: 'A Document That Links Twice',
    links: [{ target: 'docs/reference/types.md', rel: 'USES' }],
    body: 'This reference points at the type signatures.',
    append: 'See also [the type signatures](./types.md).',
  })
})

Given('a document that no audience entry point, index or other document leads to', function (this: DepWorld) {
  this.project.seedStandard()
  this.project.addDoc({
    path: 'docs/reference/nobody-links-here.md',
    tags: ['forgotten'],
    title: 'A Reference Nobody Links To',
    body: 'No entry point, index or document points at this one.',
  })
  this.note('orphan', 'docs/reference/nobody-links-here.md')
})

Given('two documents each declare the other as a prerequisite', function (this: DepWorld) {
  this.project.seedStandard()
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
  this.note('cycle-members', ['docs/reference/first-half.md', 'docs/reference/second-half.md'])
})

Given('a project whose documentation root holds no documents with DEP metadata', function (this: DepWorld) {
  this.project.writeDocspec()
  this.project.addPlainMarkdown('docs/README.md')
})

// ── When ───────────────────────────────────────────────────────────────────

When('I ask for the documentation graph', async function (this: DepWorld) {
  await this.runInProject(['graph'])
})

When('I ask for the graph in machine-readable form', async function (this: DepWorld) {
  await this.runInProject(['graph', '--json'])
})

When('I ask for the graph as {string}', async function (this: DepWorld, form: string) {
  this.note('form', form)
  await this.runInProject(['graph', `--${form}`])
})

// ── Then ───────────────────────────────────────────────────────────────────

Then('the documents are grouped under their type', function (this: DepWorld) {
  for (const type of ['reference', 'tutorial', 'how-to', 'explanation', 'decision-record']) {
    assertMatches(this.output, new RegExp(`^${type}/$`, 'm'), `Expected a "${type}" group in the graph.`)
  }
  assertMatches(
    this.output,
    /^reference\/\n(\s+[├└]── .*\n|\s+[│ ].*\n)*\s+[├└]── docs\/reference\/types\.md/m,
    'Expected reference documents to be listed under the reference group.',
  )
})

Then('each document is shown with its freshness state and its declared confidence', function (this: DepWorld) {
  assertMatches(
    this.output,
    /docs\/reference\/types\.md [●◐○] \[high\]/,
    'Expected each document to carry a freshness mark and its confidence.',
  )
})

Then('each typed relationship is shown as its relationship name and its target', function (this: DepWorld) {
  assertContains(
    this.output,
    '→ TEACHES docs/reference/metadata-schema.md',
    'Expected typed relationships to be shown as name plus target.',
  )
})

Then(
  'I am told how many documents, relationships, unreachable documents and dependency cycles were found',
  function (this: DepWorld) {
    assertMatches(
      this.output,
      /(\d+) documents, (\d+) edges, (\d+) orphans, (\d+) cycles/,
      'Expected the closing counts.',
    )
  },
)

Then(
  'I receive every document with its type, audiences, confidence, freshness, outgoing links and incoming links',
  function (this: DepWorld) {
    const graph = this.json<GraphJson>()
    const node = graph.nodes['docs/reference/metadata-schema.md']
    assertTrue(!!node, 'Expected the metadata schema document in the graph.')
    assertEqual(node!.type, 'reference', 'Expected the declared type.')
    assertTrue(Array.isArray(node!.audience) && node!.audience.length > 0, 'Expected the declared audiences.')
    assertEqual(node!.confidence, 'medium', 'Expected the declared confidence.')
    assertTrue(['FRESH', 'AGING', 'STALE'].includes(node!.lifecycle), 'Expected a freshness state.')
    assertTrue(Array.isArray(node!.forwardLinks), 'Expected outgoing links.')
    assertTrue(node!.backlinks.length > 0, 'Expected the incoming links of a linked-to document.')
  },
)

Then(
  'I receive the relationship list, the unreachable documents, the cycles, and the same counts',
  function (this: DepWorld) {
    const graph = this.json<GraphJson>()
    assertTrue(Array.isArray(graph.edges) && graph.edges.length > 0, 'Expected the relationship list.')
    assertTrue(Array.isArray(graph.orphans), 'Expected the unreachable documents.')
    assertTrue(Array.isArray(graph.cycles), 'Expected the cycles.')
    assertEqual(graph.stats.documents, Object.keys(graph.nodes).length, 'Expected the document count to agree.')
    assertEqual(graph.stats.edges, graph.edges.length, 'Expected the relationship count to agree.')
    assertEqual(graph.stats.orphans, graph.orphans.length, 'Expected the unreachable count to agree.')
    assertEqual(graph.stats.cycles, graph.cycles.length, 'Expected the cycle count to agree.')
  },
)

Then('I receive a {string} description of the graph', function (this: DepWorld, form: string) {
  if (form === 'dot') {
    assertContains(this.output, 'digraph DEP {', 'Expected a DOT digraph.')
    assertContains(this.output, ' -> ', 'Expected DOT edges.')
  } else {
    assertContains(this.output, 'graph LR', 'Expected a mermaid graph.')
    assertContains(this.output, '-->', 'Expected mermaid edges.')
  }
})

Then('documents are coloured by type', function (this: DepWorld) {
  const form = this.recall<string>('form')
  if (form === 'dot') {
    assertContains(this.output, 'fillcolor=', 'Expected DOT nodes to carry a fill colour.')
  } else {
    assertContains(this.output, 'classDef tutorial fill:', 'Expected mermaid classes per type.')
    assertContains(this.output, ':::reference', 'Expected documents to be assigned their type class.')
  }
})

Then('untyped relationships picked up from prose links are left out', function (this: DepWorld) {
  assertNotContains(this.output, 'INLINE', 'Expected prose links to be left out of the drawing.')
})

Then('the seed document appears in the graph', function (this: DepWorld) {
  assertContains(this.output, 'seed.md', 'Expected the root seed document in the graph.')
})

Then('those files do not appear in the graph', function (this: DepWorld) {
  for (const path of this.recall<string[]>('undepped')) {
    assertNotContains(this.output, path, 'Expected files without DEP metadata to be left out.')
  }
})

Then('they are not counted in the totals', async function (this: DepWorld) {
  const withoutThem = await this.runInProject(['graph', '--json'])
  const graph = JSON.parse(withoutThem.stdout) as GraphJson
  for (const path of this.recall<string[]>('undepped')) {
    assertTrue(!(path in graph.nodes), `Expected ${path} to be absent from the counted documents.`)
  }
  assertEqual(graph.stats.documents, Object.keys(graph.nodes).length, 'Expected the count to match the documents.')
})

Then('only the typed relationship is reported between those two documents', async function (this: DepWorld) {
  // The tree rendering hides untyped links, so read the same graph as data.
  const asData = await this.runQuiet(['graph', '--json'])
  const graph = JSON.parse(asData.stdout) as GraphJson
  const source = this.recall<string>('link-source')
  const target = this.recall<string>('link-target')
  const between = graph.edges.filter((e) => e.source === source && e.target === target)
  assertEqual(between.length, 1, `Expected exactly one relationship from ${source} to ${target}.`)
  assertEqual(between[0]!.rel, 'USES', 'Expected the typed relationship to be the one kept.')
})

Then('that document is listed as unreachable', function (this: DepWorld) {
  assertContains(this.output, 'Orphans:', 'Expected an unreachable-documents section.')
  assertContains(this.output, this.recall<string>('orphan'), 'Expected the unreachable document to be named.')
})

Then('the unreachable count includes it', function (this: DepWorld) {
  const match = assertMatches(this.output, /(\d+) orphans/, 'Expected the unreachable count.')
  assertTrue(Number(match[1]) >= 1, 'Expected at least one unreachable document in the count.')
})

Then('the cycle is listed as a chain of document paths', function (this: DepWorld) {
  assertContains(this.output, 'Cycles:', 'Expected a cycles section.')
  for (const member of this.recall<string[]>('cycle-members')) {
    assertContains(this.output, member, 'Expected both documents of the cycle to be named.')
  }
  assertContains(this.output, '→', 'Expected the cycle to be shown as a chain.')
})

Then('the cycle count includes it', function (this: DepWorld) {
  const match = assertMatches(this.output, /(\d+) cycles/, 'Expected the cycle count.')
  assertTrue(Number(match[1]) >= 1, 'Expected at least one cycle in the count.')
})

Then('I am told the set holds no documents, relationships, unreachable documents or cycles', function (this: DepWorld) {
  assertContains(this.output, '0 documents, 0 edges, 0 orphans, 0 cycles', 'Expected an empty set to be reported as empty.')
})
