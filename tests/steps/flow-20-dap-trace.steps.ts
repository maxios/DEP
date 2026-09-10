import { Given, Then, When } from '@cucumber/cucumber'
import { assertContains, assertEqual, assertMatches, assertTrue } from '../support/expect.ts'
import type { DepWorld } from '../support/world.ts'

interface TraceJson {
  tree: string
  entry_node: string
  node_count: number
  paths: string[][]
}

const TREE = 'validate-and-fix'

function seedTrees(world: DepWorld): void {
  if (world.dap.initialised) return
  world.project.seedStandard()
  world.dap.seedStandard()
}

// ── Given ──────────────────────────────────────────────────────────────────

Given('the tree {string}', function (this: DepWorld, tree: string) {
  seedTrees(this)
  this.note('tree', tree)
})

Given('a tree whose nodes gather information, delegate, and take action', function (this: DepWorld) {
  seedTrees(this)
  this.note('tree', TREE)
})

Given('a tree where a revision branch returns to an earlier node', function (this: DepWorld) {
  seedTrees(this)
  this.note('tree', TREE)
  // The seeded tree sends a failed fix back to the validation it started from.
  this.note('loop-target', 'run-validation')
})

Given('a tree where a branch points at a node the tree does not hold', function (this: DepWorld) {
  this.project.seedStandard()
  this.dap.init()
  this.dap.addTree({
    id: 'points-nowhere',
    trigger: 'follow a branch that goes nowhere',
    entryNode: 'start',
    nodes: [
      {
        id: 'start',
        kind: 'decide',
        description: 'Branch to a node that was never written.',
        conditions: [
          { condition: 'thing == true', next: 'not-written' },
          { condition: '_otherwise', next: 'finish' },
        ],
      },
      { id: 'finish', kind: 'act', props: { action_type: 'intent', intent: 'report_success', terminal: 'true' } },
    ],
  })
  this.note('tree', 'points-nowhere')
  this.note('missing-node', 'not-written')
})

Given('a tree whose declared starting node is not among its nodes', function (this: DepWorld) {
  this.project.seedStandard()
  this.dap.init()
  this.dap.addTree({
    id: 'no-way-in',
    trigger: 'start somewhere that does not exist',
    entryNode: 'nowhere',
    nodes: [{ id: 'finish', kind: 'act', props: { action_type: 'intent', intent: 'report_success', terminal: 'true' } }],
  })
  this.note('tree', 'no-way-in')
  this.note('missing-entry', 'nowhere')
})

// ── When ───────────────────────────────────────────────────────────────────

When('I ask to see that tree', async function (this: DepWorld) {
  await this.runInProject(['dap', 'trace', this.recall<string>('tree')])
})

When('I ask to see a tree in machine-readable form', async function (this: DepWorld) {
  seedTrees(this)
  this.note('tree', TREE)
  await this.runInProject(['dap', 'trace', TREE, '--json'])
})

When('I ask to see the tree {string}', async function (this: DepWorld, tree: string) {
  seedTrees(this)
  this.note('tree', tree)
  await this.runInProject(['dap', 'trace', tree])
})

// ── Then ───────────────────────────────────────────────────────────────────

Then('I am shown its nodes as a hierarchy starting from its starting node', function (this: DepWorld) {
  const lines = this.output.split('\n')
  assertEqual(lines[0]!.trim(), this.recall<string>('tree'), 'Expected the tree to be named first.')
  assertMatches(this.output, /└── \[\?] run-validation/, 'Expected the drawing to start at the starting node.')
  assertContains(this.output, '│', 'Expected the nodes to be drawn as a hierarchy.')
})

Then('each node is marked with its kind', function (this: DepWorld) {
  for (const mark of ['[?]', '[>]', '[!]', '[@]']) {
    assertContains(this.output, mark, `Expected nodes marked with ${mark}.`)
  }
})

Then('each branch is labelled with the condition that leads down it', function (this: DepWorld) {
  assertContains(this.output, 'fail_count == 0 AND warn_count == 0', 'Expected the branch conditions as labels.')
  assertContains(this.output, '_otherwise', 'Expected the fallback branch to be labelled too.')
})

Then('nodes that end the tree are shown at the ends of the branches', function (this: DepWorld) {
  assertMatches(this.output, /──▶ \[!] report-clean/, 'Expected the terminal action at the end of a branch.')
})

Then('a node that gathers information shows how it gathers it', function (this: DepWorld) {
  assertContains(this.output, '[?] run-validation (tool_call)', 'Expected the observe node to show how it gathers.')
  assertContains(this.output, '[?] present-warnings (gate)', 'Expected the human gate to be shown as one.')
})

Then('a node that delegates shows which tree it delegates to', function (this: DepWorld) {
  assertContains(
    this.output,
    '[@] hand-off-to-generation (generate-doc-set)',
    'Expected the delegating node to name the tree it hands over to.',
  )
})

Then('a node that acts shows what it acts with', function (this: DepWorld) {
  assertContains(this.output, '[!] report-clean (intent: report_success)', 'Expected the acting node to show its intent.')
})

Then("I receive the tree's starting node, how many nodes it holds, and every route from the start to an end", function (this: DepWorld) {
  const report = this.json<TraceJson>()
  assertEqual(report.tree, TREE, 'Expected the tree it describes.')
  assertEqual(report.entry_node, 'run-validation', 'Expected the starting node.')
  assertTrue(report.node_count > 1, 'Expected the number of nodes it holds.')
  assertTrue(report.paths.length > 1, 'Expected every route through the tree.')
  for (const path of report.paths) {
    assertEqual(path[0]!, report.entry_node, 'Expected every route to start at the starting node.')
  }
})

Then('the returning branch is marked as a loop back to that node', function (this: DepWorld) {
  assertContains(
    this.output,
    `${this.recall<string>('loop-target')} (cycle ref)`,
    'Expected the returning branch to be marked as a loop.',
  )
})

Then('the drawing terminates', function (this: DepWorld) {
  assertEqual(this.lastResult.exitCode, 0, 'Expected the drawing to finish.')
  assertTrue(this.output.split('\n').length < 100, 'Expected the drawing not to run on forever.')
})

Then('that branch is shown as missing', function (this: DepWorld) {
  assertContains(this.output, `${this.recall<string>('missing-node')} (missing)`, 'Expected the branch to be marked missing.')
})

Then('I am told the starting node was not found, naming it', function (this: DepWorld) {
  assertContains(
    this.output,
    `(entry node "${this.recall<string>('missing-entry')}" not found)`,
    'Expected the missing starting node to be named.',
  )
})
