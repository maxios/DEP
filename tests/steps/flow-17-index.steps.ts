import { Given, Then, When } from '@cucumber/cucumber'
import { existsSync, readdirSync } from 'node:fs'
import { basename, posix } from 'node:path'
import { assertContains, assertEqual, assertNotContains, assertTrue } from '../support/expect.ts'
import type { DepWorld } from '../support/world.ts'

/** A Given that builds its own set says so, and the When leaves the standard set out. */
const CUSTOM_SET = 'custom-set'
const AUTO_GENERATED = '<!-- dep:auto-generated -->'
const ICON: Record<string, string> = { FRESH: '●', AGING: '◐', STALE: '○' }

/** One document as `dep query --json` reports it. */
interface QueriedDoc {
  path: string
  type: string
  audience: string[]
  confidence: string
  lifecycle: string
}

const rootIndex = (world: DepWorld) => `${world.project.docsRoot()}/index.md`

function ensureSet(world: DepWorld): void {
  if (!world.notes.has(CUSTOM_SET)) world.project.seedStandard()
}

/** Every DEP document the set holds, with its freshness, as the CLI reports them. */
async function documents(world: DepWorld): Promise<QueriedDoc[]> {
  const result = await world.runQuiet(['query', '--json'])
  return (JSON.parse(result.stdout) as QueriedDoc[]).filter((d) => basename(d.path) !== 'index.md')
}

/** The type directories that hold at least one document of their own. */
function populatedDirectories(world: DepWorld): string[] {
  return world.project.typeDirectories().filter((dir) => {
    if (!world.project.exists(dir)) return false
    return readdirSync(world.project.absolute(dir)).some((f) => f.endsWith('.md') && f !== 'index.md')
  })
}

/** The index documents the last request says it wrote. */
function written(world: DepWorld): string[] {
  return [...world.output.matchAll(/^Updated: (.+)$/gm)].map((m) => m[1]!.trim())
}

/** Every markdown file in the project, by path, for "nothing is written". */
function snapshot(world: DepWorld): Map<string, string> {
  const files = new Map<string, string>()
  const walk = (rel: string) => {
    for (const entry of readdirSync(world.project.absolute(rel || '.'), { withFileTypes: true })) {
      const path = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(path)
      else if (entry.name.endsWith('.md')) files.set(path, world.project.read(path))
    }
  }
  walk('')
  return files
}

function links(markdown: string): Array<{ text: string; target: string; line: string }> {
  return markdown.split('\n').flatMap((line) =>
    [...line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map((m) => ({ text: m[1]!, target: m[2]!, line })),
  )
}

/** A link target as a path from the project root. */
function resolveFrom(indexPath: string, target: string): string {
  return posix.normalize(posix.join(posix.dirname(indexPath), target))
}

function headingOf(world: DepWorld, path: string): string {
  const line = world.project.read(path).split('\n').find((l) => l.startsWith('# '))
  return line ? line.slice(2).trim() : ''
}

/** The text under one `### heading`, up to the next heading of that level or a rule. */
function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(`### ${heading}\n`)
  if (start === -1) return ''
  const rest = markdown.slice(start + heading.length + 5)
  const end = rest.search(/^(### |---)/m)
  return end === -1 ? rest : rest.slice(0, end)
}

function capitalize(s: string): string {
  return s.split('-').map((w) => w[0]!.toUpperCase() + w.slice(1)).join(' ')
}

/** The harness's assertEqual compares by identity; lists and records are compared by content here. */
function assertSame(actual: unknown, expected: unknown, message: string): void {
  assertTrue(JSON.stringify(actual) === JSON.stringify(expected), `${message}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`)
}

const withinMinutes = (iso: string, minutes: number) => Math.abs(Date.now() - new Date(iso).getTime()) < minutes * 60_000

// ── Given ──────────────────────────────────────────────────────────────────

Given('the project maps each document type to its own directory', function (this: DepWorld) {
  this.project.seedStandard()
})

Given('each of those directories holds documents', function (this: DepWorld) {
  assertSame(populatedDirectories(this), this.project.typeDirectories(), 'Expected every type directory to hold documents.')
})

Given('the project declares several audiences and holds documents of several types', function (this: DepWorld) {
  this.project.seedStandard()
  assertTrue(this.project.audienceIds().length > 1, 'Expected the fixture to declare several audiences.')
})

Given('the project maps a document type to a directory that holds no documents', function (this: DepWorld) {
  this.project.seedStandard()
  this.project.remove('docs/decision-records/adr-001-metadata-in-frontmatter.md')
  this.note('empty-dir', 'docs/decision-records')
})

Given('a directory that already holds an index document', function (this: DepWorld) {
  this.project.seedStandard()
  this.project.addDoc({ path: 'docs/reference/index.md', title: 'Reference Index', body: 'Written before the generator ran.' })
  this.note('existing-index', 'docs/reference/index.md')
})

Given('the index documents have just been regenerated and nothing else has changed', async function (this: DepWorld) {
  this.project.seedStandard()
  await this.runQuiet(['index'])
  const indexes = [...populatedDirectories(this).map((dir) => `${dir}/index.md`), rootIndex(this)]
  this.note('indexes-before', new Map(indexes.map((path) => [path, this.project.read(path)])))
})

Given('a document is listed only by a generated index', async function (this: DepWorld) {
  this.project.seedStandard()
  const path = 'docs/explanation/listed-only-by-the-index.md'
  this.project.addDoc({ path, type: 'explanation', title: 'Listed Only by the Index', body: 'Nothing links here by hand.' })
  await this.runQuiet(['index'])
  this.note('index-only-doc', path)
})

// Nested on purpose: a link written as if the root were `docs` still lands when the
// root is any one folder deep, and only goes astray from deeper down.
Given('the project keeps its documents in a documentation root that is not a top-level docs folder', function (this: DepWorld) {
  this.project.configure({
    docsRoot: './site/handbook',
    audiences: [
      { id: 'human-author', entry_point: './site/handbook/tutorials/start-here.md' },
      { id: 'ai-agent', entry_point: './site/handbook/how-to/answer-a-question.md' },
    ],
  })
  this.project.addDoc({ path: 'site/handbook/tutorials/start-here.md', type: 'tutorial', title: 'Start Here', links: [{ target: 'site/handbook/reference/terms.md', rel: 'TEACHES' }] })
  this.project.addDoc({ path: 'site/handbook/how-to/answer-a-question.md', type: 'how-to', audience: ['ai-agent'], title: 'Answer a Question', links: [{ target: 'site/handbook/reference/terms.md', rel: 'USES' }] })
  this.project.addDoc({ path: 'site/handbook/reference/terms.md', type: 'reference', audience: ['human-author', 'ai-agent'], title: 'Terms' })
  this.note(CUSTOM_SET, true)
})

Given('the root index names its owner, when it was created, its tags and a document it relates to', function (this: DepWorld) {
  this.project.seedStandard()
  const path = rootIndex(this)
  this.project.addDoc({
    path,
    type: 'reference',
    audience: this.project.audienceIds(),
    owner: '@handbook-team',
    createdDaysAgo: 400,
    tags: ['navigation', 'handbook'],
    links: [{ target: 'docs/reference/types.md', rel: 'USES' }],
    title: 'Documentation Index',
    body: 'Kept by the handbook team.',
  })
  this.note('root-created', this.project.declaredValue(path, 'created'))
  this.note('root-verified', this.project.declaredValue(path, 'last_verified'))
})

Given('the project names a fallback owner and has no root index yet', function (this: DepWorld) {
  this.project.configure({ fallbackOwner: '@handbook-team' })
  this.project.seedStandard()
  this.project.remove(rootIndex(this))
})

// ── When ───────────────────────────────────────────────────────────────────

When('I ask for the index documents to be regenerated', async function (this: DepWorld) {
  ensureSet(this)
  await this.runInProject(['index'])
})

When('I ask for them to be regenerated again', async function (this: DepWorld) {
  await this.runInProject(['index'])
})

// "I am not standing at the project root" is FLOW-09's: it stands in docs/reference and notes it as `cwd`.
When('I ask for the index documents of that project to be regenerated', async function (this: DepWorld) {
  await this.runInProject(['index'], { cwd: this.recall<string>('cwd') })
})

When('I preview regenerating the index documents', async function (this: DepWorld) {
  ensureSet(this)
  this.note('files-before', snapshot(this))
  await this.runInProject(['index', '--dry'])
})

When('I ask for the index documents in machine-readable form', async function (this: DepWorld) {
  ensureSet(this)
  this.note('files-before', snapshot(this))
  await this.runInProject(['index', '--json'])
})

// ── Then ───────────────────────────────────────────────────────────────────

Then('an index is written into each of those directories', function (this: DepWorld) {
  for (const dir of this.project.typeDirectories()) {
    assertTrue(this.project.exists(`${dir}/index.md`), `Expected an index in ${dir}.\n${this.output}`)
  }
})

Then('I am told which index documents were updated', function (this: DepWorld) {
  for (const dir of populatedDirectories(this)) assertContains(this.output, `Updated: ${dir}/index.md`, 'Expected each directory index to be named.')
  assertContains(this.output, `Updated: ${rootIndex(this)}`, 'Expected the root index to be named.')
})

Then('each entry names its document, its freshness, its confidence and its audiences', async function (this: DepWorld) {
  for (const doc of await documents(this)) {
    const dir = posix.dirname(doc.path)
    if (!this.project.typeDirectories().includes(dir)) continue
    const index = this.project.read(`${dir}/index.md`)
    const entry = `- [${headingOf(this, doc.path)}](${basename(doc.path)}) ${ICON[doc.lifecycle]} \`${doc.confidence}\` — ${doc.audience.join(', ')}`
    assertContains(index, entry, `Expected ${dir}/index.md to list ${doc.path}.`)
  }
})

Then('a root index is written into the documentation root', function (this: DepWorld) {
  assertTrue(this.project.exists(rootIndex(this)), `Expected a root index at ${rootIndex(this)}.\n${this.output}`)
})

Then("it lists, for each audience, that audience's entry point and the documents meant for it", async function (this: DepWorld) {
  const index = this.project.read(rootIndex(this))
  const docs = await documents(this)
  const docspec = this.project.read('.docspec')
  for (const id of this.project.audienceIds()) {
    const part = section(index, id)
    assertTrue(part.length > 0, `Expected a section for the ${id} audience.`)
    const entryPoint = docspec.match(new RegExp(`- id: ${id}\\n(?:.*\\n)*?\\s+entry_point: "\\.?/?([^"]+)"`))![1]!
    assertContains(part, `**Entry point**: [${basename(entryPoint)}](${posix.relative(posix.dirname(rootIndex(this)), entryPoint)})`, `Expected the ${id} entry point.`)
    for (const doc of docs.filter((d) => d.audience.includes(id))) {
      assertContains(part, `[${headingOf(this, doc.path)}](${posix.relative(posix.dirname(rootIndex(this)), doc.path)})`, `Expected ${doc.path} under ${id}.`)
    }
  }
})

Then('it lists the documents grouped by type', async function (this: DepWorld) {
  const index = this.project.read(rootIndex(this))
  assertContains(index, '## By Type', 'Expected a by-type listing.')
  for (const doc of await documents(this)) {
    const part = section(index, capitalize(doc.type))
    assertContains(part, `[${headingOf(this, doc.path)}](${posix.relative(posix.dirname(rootIndex(this)), doc.path)})`, `Expected ${doc.path} under its type.`)
  }
})

Then('I am told which index documents would be written', function (this: DepWorld) {
  for (const dir of populatedDirectories(this)) assertContains(this.output, `Would write: ${dir}/index.md`, 'Expected each directory index to be named.')
  assertContains(this.output, `Would write: ${rootIndex(this)}`, 'Expected the root index to be named.')
})

Then('nothing is written', function (this: DepWorld) {
  const before = this.recall<Map<string, string>>('files-before')
  const after = snapshot(this)
  assertSame([...after.keys()].sort(), [...before.keys()].sort(), 'Expected no file to appear or disappear.')
  for (const [path, contents] of before) assertEqual(after.get(path), contents, `Expected ${path} to be left alone.`)
})

Then("I receive each index document's path and its full content", function (this: DepWorld) {
  const generated = this.json<Array<{ path: string; content: string }>>()
  const paths = generated.map((g) => g.path)
  for (const dir of populatedDirectories(this)) assertTrue(paths.includes(`${dir}/index.md`), `Expected ${dir}/index.md in the data.`)
  const root = generated.find((g) => g.path === rootIndex(this))
  assertTrue(root !== undefined, 'Expected the root index in the data.')
  assertContains(root!.content, '## By Audience', 'Expected the root index in full.')
  for (const g of generated.filter((g) => g.path !== rootIndex(this))) {
    assertTrue(g.content.startsWith(AUTO_GENERATED), `Expected ${g.path} in full.`)
  }
})

Then('no index is written into that directory', function (this: DepWorld) {
  const dir = this.recall<string>('empty-dir')
  assertTrue(!this.project.exists(`${dir}/index.md`), `Expected no index in ${dir}.`)
  assertNotContains(this.output, `${dir}/index.md`, 'Expected the empty directory not to be named.')
})

Then('that index does not list itself as an entry', function (this: DepWorld) {
  const index = this.project.read(this.recall<string>('existing-index'))
  assertNotContains(index, '](index.md)', 'Expected the index not to list itself.')
})

Then('each directory index is marked as automatically generated', function (this: DepWorld) {
  for (const dir of populatedDirectories(this)) {
    assertTrue(this.project.read(`${dir}/index.md`).startsWith(AUTO_GENERATED), `Expected ${dir}/index.md to be marked as generated.`)
  }
})

Then('their content is unchanged apart from the moment of generation', function (this: DepWorld) {
  const timeless = (s: string) => s.replace(/^\s*last_verified:.*$/m, '')
  for (const [path, contents] of this.recall<Map<string, string>>('indexes-before')) {
    assertEqual(timeless(this.project.read(path)), timeless(contents), `Expected ${path} to come out the same.`)
  }
})

Then('that document is not reported as unreachable', function (this: DepWorld) {
  const doc = this.recall<string>('index-only-doc')
  const orphanLine = this.output.split('\n').find((line) => line.includes('No orphans')) ?? ''
  assertNotContains(orphanLine, doc, 'Expected a document the generated index lists not to count as unreachable.')
  assertContains(this.output, '✓ No orphans', 'Expected the unreachable-documents check to pass.')
})

Then("every entry shows the document's real title", function (this: DepWorld) {
  const indexes = written(this)
  assertTrue(indexes.length > 0, `Expected index documents to be written.\n${this.output}`)
  for (const index of indexes) {
    for (const link of links(this.project.read(index)).filter((l) => l.line.startsWith('- ['))) {
      assertEqual(link.text, headingOf(this, resolveFrom(index, link.target)), `Expected ${index} to title ${link.target} as the document does.`)
    }
  }
})

Then('every link is relative to the index document that holds it', function (this: DepWorld) {
  const indexes = written(this)
  assertTrue(indexes.length > 0, `Expected index documents to be written.\n${this.output}`)
  for (const index of indexes) {
    for (const link of links(this.project.read(index))) {
      const target = resolveFrom(index, link.target)
      assertTrue(existsSync(this.project.absolute(target)), `Expected ${link.target} in ${index} to lead to a document, not to ${target}.`)
    }
  }
})

Then('the root index still names that owner, that creation date, those tags and that relationship', function (this: DepWorld) {
  const path = rootIndex(this)
  const dep = this.project.metadataOf(path)
  assertEqual(dep.owner, '@handbook-team', 'Expected the root index to keep its owner.')
  assertEqual(this.project.declaredValue(path, 'created'), this.recall<string>('root-created'), 'Expected the root index to keep its creation date.')
  assertSame(dep.tags, ['navigation', 'handbook'], 'Expected the root index to keep its tags.')
  assertSame(dep.links, [{ target: './reference/types.md', rel: 'USES' }], 'Expected the root index to keep its relationship.')
})

Then('it records that it was verified now', function (this: DepWorld) {
  const verified = this.project.declaredValue(rootIndex(this), 'last_verified')
  assertTrue(verified !== this.recall<string>('root-verified') && withinMinutes(verified, 2), `Expected last_verified to be now, not ${verified}.`)
})

Then('the root index names the fallback owner as its owner', function (this: DepWorld) {
  assertEqual(this.project.metadataOf(rootIndex(this)).owner, '@handbook-team', 'Expected the fallback owner to own a first root index.')
})

Then('it records that it was created now', function (this: DepWorld) {
  const created = this.project.declaredValue(rootIndex(this), 'created')
  assertTrue(withinMinutes(created, 2), `Expected created to be now, not ${created}.`)
})
