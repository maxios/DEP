import { Given, Then, When } from '@cucumber/cucumber'
import { assertEqual, assertMatches, assertTrue } from '../support/expect.ts'
import type { DepWorld } from '../support/world.ts'

interface QueryMatch {
  path: string
  type: string
  audience: string[]
  confidence: string
  lifecycle: string
  owner: string
  tags: string[]
}

const DIMENSION_FLAG: Record<string, string> = {
  type: '--type',
  audience: '--audience',
  tag: '--tag',
  confidence: '--confidence',
  lifecycle: '--lifecycle',
  owner: '--owner',
}

// ── Given ──────────────────────────────────────────────────────────────────

Given('a project with tutorials, references and explanations', function (this: DepWorld) {
  this.project.seedStandard()
})

Given('a project whose documents vary in type, audience, tag, confidence, freshness and owner', function (this: DepWorld) {
  this.project.seedVaried()
})

Given('a project with references owned by two different owners', function (this: DepWorld) {
  this.project.seedStandard()
})

Given('the set holds stale documents', function (this: DepWorld) {
  this.project.seedVaried()
})

Given('no document carries the tag {string}', function (this: DepWorld, tag: string) {
  this.project.seedVaried()
  this.note('absent-tag', tag)
})

Given('a project with documents', function (this: DepWorld) {
  this.project.seedStandard()
})

// ── When ───────────────────────────────────────────────────────────────────

When('I ask for the documents of type {string}', async function (this: DepWorld, type: string) {
  this.note('type', type)
  await this.runInProject(['query', '--type', type])
})

When('I ask for the documents whose {string} is {string}', async function (this: DepWorld, dimension: string, value: string) {
  const flag = DIMENSION_FLAG[dimension]
  assertTrue(!!flag, `No narrowing flag is defined for the dimension "${dimension}".`)
  this.note('dimension', dimension)
  this.note('value', value)
  await this.runInProject(['query', flag!, value, '--json'])
})

When('I ask for the references owned by {string}', async function (this: DepWorld, owner: string) {
  this.note('owner', owner)
  await this.runInProject(['query', '--type', 'reference', '--owner', owner, '--json'])
})

When('I ask for the documents whose freshness is {string}', async function (this: DepWorld, state: string) {
  await this.runInProject(['query', '--lifecycle', state, '--json'])
})

When('I ask for the documents tagged {string}', async function (this: DepWorld, tag: string) {
  await this.runInProject(['query', '--tag', tag])
})

When('I ask for documents without narrowing anything', async function (this: DepWorld) {
  await this.runInProject(['query', '--json'])
})

When('I ask for the documents of type {string} in machine-readable form', async function (this: DepWorld, type: string) {
  this.project.seedVaried()
  await this.runInProject(['query', '--type', type, '--json'])
})

// ── Then ───────────────────────────────────────────────────────────────────

Then('I am told how many documents matched', function (this: DepWorld) {
  assertMatches(this.output, /^\d+ document\(s\) found:/m, 'Expected the number of matches.')
})

Then('each match is shown with its type, audiences, freshness and confidence', function (this: DepWorld) {
  assertMatches(
    this.output,
    /type: reference \| audience: [^|]+ \| [●◐○] (FRESH|AGING|STALE) \| confidence: (high|medium|low|stale)/,
    'Expected each match to carry its type, audiences, freshness and confidence.',
  )
})

Then('no document of another type is included', function (this: DepWorld) {
  const type = this.recall<string>('type')
  const declared = [...this.output.matchAll(/type: ([\w-]+) \|/g)].map((m) => m[1])
  assertTrue(declared.length > 0, 'Expected at least one match.')
  for (const found of declared) {
    assertEqual(found, type, 'Expected only documents of the requested type.')
  }
})

Then('every match carries that {string}', function (this: DepWorld, dimension: string) {
  const matches = this.json<QueryMatch[]>()
  const value = this.recall<string>('value')
  assertTrue(matches.length > 0, `Expected at least one document whose ${dimension} is "${value}".`)

  for (const match of matches) {
    switch (dimension) {
      case 'type':
        assertEqual(match.type, value, `Expected ${match.path} to be of that type.`)
        break
      case 'audience':
        assertTrue(match.audience.includes(value), `Expected ${match.path} to carry that audience.`)
        break
      case 'tag':
        assertTrue(match.tags.includes(value), `Expected ${match.path} to carry that tag.`)
        break
      case 'confidence':
        assertEqual(match.confidence, value, `Expected ${match.path} to declare that confidence.`)
        break
      case 'lifecycle':
        assertEqual(match.lifecycle, value.toUpperCase(), `Expected ${match.path} to be in that freshness state.`)
        break
      case 'owner':
        assertEqual(match.owner, value, `Expected ${match.path} to be owned by that owner.`)
        break
      default:
        throw new Error(`Unknown dimension "${dimension}".`)
    }
  }
})

Then('nothing else is included', async function (this: DepWorld) {
  const dimension = this.recall<string>('dimension')
  const value = this.recall<string>('value')
  const narrowed = this.json<QueryMatch[]>()

  const everything = JSON.parse((await this.runQuiet(['query', '--json'])).stdout) as QueryMatch[]
  const carries = (doc: QueryMatch) => {
    switch (dimension) {
      case 'type': return doc.type === value
      case 'audience': return doc.audience.includes(value)
      case 'tag': return doc.tags.includes(value)
      case 'confidence': return doc.confidence === value
      case 'lifecycle': return doc.lifecycle === value.toUpperCase()
      case 'owner': return doc.owner === value
      default: throw new Error(`Unknown dimension "${dimension}".`)
    }
  }

  const expected = everything.filter(carries).map((d) => d.path).sort()
  const actual = narrowed.map((d) => d.path).sort()
  assertEqual(actual.join(', '), expected.join(', '), 'Expected exactly the documents carrying that value.')
  assertTrue(everything.length > narrowed.length, 'Expected the narrowing to leave some documents out.')
})

Then('every match is a reference owned by {string}', function (this: DepWorld, owner: string) {
  const matches = this.json<QueryMatch[]>()
  assertTrue(matches.length > 0, 'Expected at least one match.')
  for (const match of matches) {
    assertEqual(match.type, 'reference', `Expected ${match.path} to be a reference.`)
    assertEqual(match.owner, owner, `Expected ${match.path} to be owned by ${owner}.`)
  }
})

Then('a reference owned by anyone else is excluded', async function (this: DepWorld) {
  const matched = this.json<QueryMatch[]>().map((d) => d.path)
  const everything = JSON.parse((await this.runQuiet(['query', '--json'])).stdout) as QueryMatch[]
  const otherOwners = everything.filter((d) => d.type === 'reference' && d.owner !== this.recall<string>('owner'))
  assertTrue(otherOwners.length > 0, 'Expected the set to hold references owned by someone else.')
  for (const other of otherOwners) {
    assertTrue(!matched.includes(other.path), `Expected ${other.path} to be excluded.`)
  }
})

Then('the stale documents are returned', function (this: DepWorld) {
  const matches = this.json<QueryMatch[]>()
  assertTrue(matches.length > 0, 'Expected the stale documents despite the lower-case request.')
  for (const match of matches) {
    assertEqual(match.lifecycle, 'STALE', `Expected ${match.path} to be stale.`)
  }
})

Then('every document in the set is returned', async function (this: DepWorld) {
  const matches = this.json<QueryMatch[]>()
  const graph = JSON.parse((await this.runQuiet(['graph', '--json'])).stdout) as { stats: { documents: number } }
  assertEqual(matches.length, graph.stats.documents, 'Expected every document in the set.')
})

Then('each match carries its path, type, audiences, confidence, freshness, owner and tags', function (this: DepWorld) {
  const matches = this.json<QueryMatch[]>()
  assertTrue(matches.length > 0, 'Expected at least one match.')
  for (const match of matches) {
    for (const field of ['path', 'type', 'audience', 'confidence', 'lifecycle', 'owner', 'tags'] as const) {
      assertTrue(match[field] !== undefined, `Expected ${field} on each match.`)
    }
  }
})
