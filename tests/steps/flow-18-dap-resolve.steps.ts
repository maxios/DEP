import { Given, Then, When } from '@cucumber/cucumber'
import { assertContains, assertEqual, assertTrue } from '../support/expect.ts'
import type { DepWorld } from '../support/world.ts'

interface ResolveJson {
  query: string
  matches: Array<{ id: string; trigger: string; entry_node: string; score: number; path: string }>
}

const VALIDATE_TREE = 'validate-and-fix'

// ── Given ──────────────────────────────────────────────────────────────────

Given('the project declares a tree triggered by {string}', function (this: DepWorld, trigger: string) {
  this.project.seedStandard()
  this.dap.init()
  this.dap.seedValidateAndFix({ trigger })
  this.note('tree', VALIDATE_TREE)
  this.note('trigger', trigger)
})

Given('a tree triggered by {string}', function (this: DepWorld, trigger: string) {
  this.project.seedStandard()
  this.dap.init()
  if (trigger === 'documentation may be out of date') {
    this.dap.addTree({
      id: 'sync-stale-docs',
      trigger,
      entryNode: 'check-staleness',
      tags: ['lifecycle'],
      nodes: [
        {
          id: 'check-staleness',
          kind: 'observe',
          description: 'Find out which documents have fallen behind the code.',
          props: { method: 'tool_call', tool: 'dep_query', outputs: 'stale_docs', next: 'report-staleness' },
        },
        {
          id: 'report-staleness',
          kind: 'act',
          props: { action_type: 'intent', intent: 'report_success', terminal: 'true' },
        },
      ],
    })
    this.note('tree', 'sync-stale-docs')
  } else {
    this.dap.seedValidateAndFix({ trigger })
    this.note('tree', VALIDATE_TREE)
  }
  this.note('trigger', trigger)
})

Given('that tree also declares the phrase {string} and the intent {string}', function (
  this: DepWorld,
  phrase: string,
  intent: string,
) {
  this.dap.seedValidateAndFix({
    trigger: this.recall<string>('trigger'),
    triggerPatterns: [phrase, { intent }],
  })
})

Given('more than one tree recognises part of my request', function (this: DepWorld) {
  this.project.seedStandard()
  this.dap.seedStandard()
  this.note('query', 'validate the generated documentation')
})

Given('no tree recognises anything in my request', function (this: DepWorld) {
  this.project.seedStandard()
  this.dap.init()
  // Nothing in "book me a flight" appears in this tree's trigger, patterns or
  // tags — not even as a fragment, which is how the matcher compares words.
  this.dap.addTree({
    id: 'print-the-list',
    trigger: 'print the list of docs',
    tags: ['printing'],
    entryNode: 'do-print',
    nodes: [
      {
        id: 'do-print',
        kind: 'act',
        props: { action_type: 'intent', intent: 'report_success', terminal: 'true' },
      },
    ],
  })
})

// ── When ───────────────────────────────────────────────────────────────────

When('I ask which tree covers {string}', async function (this: DepWorld, query: string) {
  if (!this.dap.initialised) {
    this.project.seedStandard()
    this.dap.seedStandard()
  }
  this.note('query', query)
  await this.runInProject(['dap', 'resolve', query, '--json'])
})

When('I ask which tree covers it', async function (this: DepWorld) {
  await this.runInProject(['dap', 'resolve', this.recall<string>('query'), '--json'])
})

When('I ask which tree covers a request, in machine-readable form', async function (this: DepWorld) {
  this.project.seedStandard()
  this.dap.seedStandard()
  this.note('query', 'validate DEP documentation and fix issues')
  await this.runInProject(['dap', 'resolve', this.recall<string>('query'), '--json'])
})

// ── Then ───────────────────────────────────────────────────────────────────

Then('that tree is returned as the strongest match', function (this: DepWorld) {
  const report = this.json<ResolveJson>()
  assertTrue(report.matches.length > 0, 'Expected at least one match.')
  assertEqual(report.matches[0]!.id, this.recall<string>('tree'), 'Expected that tree to match strongest.')
})

Then('I am shown its identifier, its trigger, the node to start at and where the tree lives', function (this: DepWorld) {
  const match = this.json<ResolveJson>().matches[0]!
  assertEqual(match.id, this.recall<string>('tree'), 'Expected the identifier.')
  assertEqual(match.trigger, this.recall<string>('trigger'), 'Expected the trigger.')
  assertTrue(!!match.entry_node, 'Expected the node to start at.')
  assertContains(match.path, 'trees/', 'Expected where the tree lives.')
})

Then('the match is reported with a strength of {string}', function (this: DepWorld, strength: string) {
  const report = this.json<ResolveJson>()
  const match = report.matches.find((m) => m.id === this.recall<string>('tree'))
  assertTrue(!!match, `Expected ${this.recall<string>('tree')} among the matches.`)
  assertEqual(Math.round(match!.score), Number(strength), 'Expected that strength of match.')
})

Then('that tree is returned with a strength reflecting how much of my request it recognised', function (this: DepWorld) {
  const report = this.json<ResolveJson>()
  const match = report.matches.find((m) => m.id === this.recall<string>('tree'))
  assertTrue(!!match, 'Expected the tree among the matches.')
  assertTrue(match!.score > 0, 'Expected a positive strength.')
  assertTrue(match!.score < 100, 'Expected a partial phrasing to score below an exact match.')
})

Then('every matching tree is returned', function (this: DepWorld) {
  const report = this.json<ResolveJson>()
  assertTrue(report.matches.length > 1, `Expected more than one match, got ${report.matches.length}.`)
})

Then('they are ordered from strongest to weakest match', function (this: DepWorld) {
  const scores = this.json<ResolveJson>().matches.map((m) => m.score)
  const sorted = [...scores].sort((a, b) => b - a)
  assertEqual(scores.join(','), sorted.join(','), 'Expected the matches ordered strongest first.')
})

Then('the tree triggered by that phrase is returned', function (this: DepWorld) {
  const report = this.json<ResolveJson>()
  assertTrue(
    report.matches.some((m) => m.id === VALIDATE_TREE),
    `Expected ${VALIDATE_TREE} to match regardless of case, got: ${report.matches.map((m) => m.id).join(', ')}`,
  )
})

Then('I am told no trees match that request', function (this: DepWorld) {
  assertEqual(this.json<ResolveJson>().matches.length, 0, 'Expected no matches in the data.')
})

Then(
  'I receive my request and each match with its identifier, trigger, starting node, strength and location',
  function (this: DepWorld) {
    const report = this.json<ResolveJson>()
    assertEqual(report.query, this.recall<string>('query'), 'Expected my request back.')
    assertTrue(report.matches.length > 0, 'Expected at least one match.')
    for (const match of report.matches) {
      assertTrue(typeof match.id === 'string', 'Expected the identifier.')
      assertTrue(typeof match.trigger === 'string', 'Expected the trigger.')
      assertTrue(typeof match.entry_node === 'string', 'Expected the starting node.')
      assertTrue(typeof match.score === 'number', 'Expected the strength.')
      assertTrue(typeof match.path === 'string', 'Expected the location.')
    }
  },
)
