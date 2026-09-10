import { Given, Then, When } from '@cucumber/cucumber'
import { assertContains, assertEqual, assertMatches, assertNotContains, assertTrue } from '../support/expect.ts'
import type { DepWorld } from '../support/world.ts'
import { TOLD } from './common.steps.ts'
import type { NodeSpec } from '../support/dap-project.ts'

interface Check {
  name: string
  passed: boolean
  message?: string
}

interface DapValidationJson {
  trees: Array<{ tree: string; status: 'PASS' | 'WARN' | 'FAIL'; checks: Check[] }>
  graph: Check[]
}

const DEFECTIVE = 'defective-tree'

const TERMINAL_ACT: NodeSpec = {
  id: 'finish',
  kind: 'act',
  description: 'Report the outcome.',
  props: { action_type: 'intent', intent: 'report_success', terminal: 'true' },
}

/**
 * The descriptive phrasings this feature uses in place of literal CLI text.
 * Registered against the shared "I am told ..." step.
 */
TOLD.set('the starting node was not found in the tree', (world) => {
  assertContains(world.output, 'Entry node "nowhere" not found in tree', 'Expected the starting node to be reported missing.')
})
TOLD.set('which nodes are unreachable', (world) => {
  assertContains(world.output, 'Orphan nodes: unreachable-node', 'Expected the unreachable nodes to be named.')
})
TOLD.set('which nodes are dead ends', (world) => {
  assertContains(world.output, 'Dead ends:', 'Expected the dead ends to be reported.')
  assertContains(world.output, 'goes-nowhere', 'Expected the dead-end node to be named.')
})
TOLD.set('which branching node has no fallback', (world) => {
  assertContains(
    world.output,
    'Decide node "branch-without-fallback" missing _otherwise condition',
    'Expected the branching node with no fallback to be named.',
  )
})
TOLD.set('which metadata fields are missing', (world) => {
  assertContains(world.output, 'Missing: owner', 'Expected the missing metadata fields to be named.')
})
TOLD.set('that the confidence is invalid', (world) => {
  assertContains(world.output, 'Invalid: certain', 'Expected the confidence to be reported as invalid.')
})

function soundProject(world: DepWorld): void {
  if (world.dap.initialised) return
  world.project.seedStandard()
  world.dap.seedStandard()
}

/** Build the one defective tree an outline row asks for. */
function addDefectiveTree(world: DepWorld, defect: string): void {
  world.project.seedStandard()
  world.dap.init()

  const base = { id: DEFECTIVE, trigger: 'exercise one defect', entryNode: 'start' }

  switch (defect) {
    case 'a starting node that is not among its nodes':
      world.dap.addTree({ ...base, entryNode: 'nowhere', nodes: [TERMINAL_ACT] })
      break

    case 'a node no route from the start reaches':
      world.dap.addTree({
        ...base,
        nodes: [
          { id: 'start', kind: 'observe', props: { method: 'tool_call', tool: 'dep_validate', outputs: 'report', next: 'finish' } },
          TERMINAL_ACT,
          {
            id: 'unreachable-node',
            kind: 'act',
            description: 'Nothing points here.',
            props: { action_type: 'intent', intent: 'escalate', terminal: 'true' },
          },
        ],
      })
      break

    case 'a route that ends without an ending or a delegation':
      world.dap.addTree({
        ...base,
        nodes: [
          { id: 'start', kind: 'observe', props: { method: 'tool_call', tool: 'dep_validate', outputs: 'report', next: 'goes-nowhere' } },
          {
            id: 'goes-nowhere',
            kind: 'act',
            description: 'Acts, then stops without ending the tree.',
            props: { action_type: 'intent', intent: 'escalate' },
          },
        ],
      })
      break

    case 'a branching node with no fallback condition':
      world.dap.addTree({
        ...base,
        nodes: [
          {
            id: 'start',
            kind: 'observe',
            props: { method: 'tool_call', tool: 'dep_validate', outputs: 'report', next: 'branch-without-fallback' },
          },
          {
            id: 'branch-without-fallback',
            kind: 'decide',
            description: 'Every branch is named; none of them catches the rest.',
            conditions: [{ condition: 'report == "clean"', next: 'finish' }],
          },
          TERMINAL_ACT,
        ],
      })
      break

    case 'missing metadata':
      world.dap.addTree({ ...base, nodes: [TERMINAL_ACT], omitMetadata: ['owner'], entryNode: 'finish' })
      break

    case 'an invalid confidence':
      world.dap.addTree({ ...base, nodes: [TERMINAL_ACT], confidence: 'certain', entryNode: 'finish' })
      break

    default:
      throw new Error(`No fixture for the tree defect "${defect}".`)
  }
}

// ── Given ──────────────────────────────────────────────────────────────────

Given(
  'every tree declares complete metadata, a starting node that exists, and reaches an ending on every route',
  function (this: DepWorld) {
    soundProject(this)
  },
)

Given('no two trees claim the same trigger and no tree delegates in a circle', function (this: DepWorld) {
  soundProject(this)
})

Given('a tree that has {string}', function (this: DepWorld, defect: string) {
  addDefectiveTree(this, defect)
})

Given('a node of kind {string} that does not declare {string}', function (this: DepWorld, kind: string, missing: string) {
  this.project.seedStandard()
  this.dap.init()

  const incomplete: NodeSpec =
    kind === 'observe'
      ? {
          id: 'incomplete-node',
          kind: 'observe',
          description: 'An observation with something left out.',
          props:
            missing === 'how it gathers information'
              ? { outputs: 'report', next: 'finish' }
              : { method: 'tool_call', tool: 'dep_validate', next: 'finish' },
        }
      : kind === 'decide'
        ? { id: 'incomplete-node', kind: 'decide', description: 'A branch with no conditions.' }
        : kind === 'act'
          ? { id: 'incomplete-node', kind: 'act', description: 'An action with no kind.', props: { terminal: 'true' } }
          : { id: 'incomplete-node', kind: 'delegate', description: 'A hand-off to nobody.', props: { terminal: 'true' } }

  this.dap.addTree({
    id: DEFECTIVE,
    trigger: 'exercise one incomplete node',
    entryNode: 'incomplete-node',
    nodes: kind === 'observe' ? [incomplete, TERMINAL_ACT] : [incomplete],
  })
  this.note('incomplete-node', 'incomplete-node')
})

Given(
  'a tree where a route returns to an earlier node through a branching node that also has a way out',
  function (this: DepWorld) {
    soundProject(this)
  },
)

Given('a tree where a route returns to an earlier node with no branch leaving the loop', function (this: DepWorld) {
  this.project.seedStandard()
  this.dap.init()
  this.dap.addTree({
    id: 'endless-loop',
    trigger: 'go round forever',
    entryNode: 'first',
    nodes: [
      {
        id: 'first',
        kind: 'observe',
        description: 'Look at something.',
        props: { method: 'tool_call', tool: 'dep_validate', outputs: 'report', next: 'second' },
      },
      {
        id: 'second',
        kind: 'act',
        description: 'Act, then go back to the beginning, always.',
        props: { action_type: 'intent', intent: 'escalate', on_success: 'first' },
      },
    ],
  })
  this.note('tree', 'endless-loop')
})

Given('two trees declare the same trigger', function (this: DepWorld) {
  this.project.seedStandard()
  this.dap.init()
  const trigger = 'validate DEP documentation and fix issues'
  this.dap.seedValidateAndFix()
  this.dap.seedGenerateDocSet({ id: 'generate-doc-set', trigger })
  this.note('duplicate-trigger', trigger)
})

Given('two trees each delegate to the other', function (this: DepWorld) {
  this.project.seedStandard()
  this.dap.init()
  for (const [id, other] of [
    ['first-tree', 'second-tree'],
    ['second-tree', 'first-tree'],
  ]) {
    this.dap.addTree({
      id: id!,
      trigger: `hand over from ${id}`,
      entryNode: 'hand-over',
      nodes: [
        {
          id: 'hand-over',
          kind: 'delegate',
          description: 'Hand the work to the other tree.',
          props: { delegate_to: other!, terminal: 'true' },
        },
      ],
    })
  }
})

Given('the project resolves documentation references from its trees', function (this: DepWorld) {
  this.project.seedStandard()
  this.dap.init({ resolveDepRefs: true })
})

Given('a node refers to a document that does not exist', function (this: DepWorld) {
  this.dap.addTree({
    id: 'refers-to-a-ghost',
    trigger: 'follow a reference that is not there',
    entryNode: 'read-the-document',
    nodes: [
      {
        id: 'read-the-document',
        kind: 'act',
        description: 'Read the document that explains the fix.',
        props: { action_type: 'document', ref: 'dep://docs/how-to/never-written.md', terminal: 'true' },
      },
    ],
  })
  this.note('tree', 'refers-to-a-ghost')
  this.note('missing-ref', 'dep://docs/how-to/never-written.md')
})

Given('a tree last verified more than twice its review cadence ago', function (this: DepWorld) {
  this.project.seedStandard()
  this.dap.init({ reviewCadence: 60 })
  this.dap.seedValidateAndFix({ verifiedDaysAgo: 200 })
  this.note('tree', 'validate-and-fix')
})

// ── When ───────────────────────────────────────────────────────────────────

When('I ask for the trees to be validated', async function (this: DepWorld) {
  await this.runInProject(['dap', 'validate'])
})

When('I ask for the trees to be validated in machine-readable form', async function (this: DepWorld) {
  soundProject(this)
  await this.runInProject(['dap', 'validate', '--json'])
})

// ── Then ───────────────────────────────────────────────────────────────────

Then('I am told how many trees were checked and how many passed, warned and failed', function (this: DepWorld) {
  assertMatches(this.output, /Trees: \d+ \| Pass: \d+ \| Warn: \d+ \| Fail: \d+/, 'Expected the tally.')
})

Then('every tree is reported as passing', function (this: DepWorld) {
  assertNotContains(this.output, '— FAIL', 'Expected no tree to fail.')
  assertNotContains(this.output, '— WARN', 'Expected no tree to warn.')
  const match = assertMatches(this.output, /Trees: (\d+) \| Pass: (\d+)/, 'Expected the tally.')
  assertEqual(match[2], match[1], 'Expected every checked tree to pass.')
})

Then('that tree is reported as failing', function (this: DepWorld) {
  const tree = this.notes.has('tree') ? this.recall<string>('tree') : DEFECTIVE
  assertContains(this.output, `✗ ${tree} — FAIL`, `Expected ${tree} to fail.`)
})

Then('I am told which node is incomplete and what it is missing', function (this: DepWorld) {
  const node = this.recall<string>('incomplete-node')
  assertContains(this.output, `Type check: ${node}`, 'Expected the incomplete node to be named.')
  assertMatches(this.output, /node missing ("[a-z_]+"|condition table)/, 'Expected what the node is missing.')
})

Then('that tree is not reported as failing for being cyclic', async function (this: DepWorld) {
  const report = JSON.parse((await this.runQuiet(['dap', 'validate', '--json'])).stdout) as DapValidationJson
  const tree = report.trees.find((t) => t.tree === 'validate-and-fix')
  assertTrue(!!tree, 'Expected the tree in the report.')
  const acyclicity = tree!.checks.find((c) => c.name === 'Acyclicity (DAG)')
  assertTrue(!!acyclicity, 'Expected an acyclicity check.')
  assertTrue(acyclicity!.passed, `Expected the revision loop to be allowed: ${acyclicity!.message}`)
})

Then('I am told how many revision loops were found and that they are allowed', async function (this: DepWorld) {
  const report = JSON.parse((await this.runQuiet(['dap', 'validate', '--json'])).stdout) as DapValidationJson
  const acyclicity = report.trees
    .find((t) => t.tree === 'validate-and-fix')!
    .checks.find((c) => c.name === 'Acyclicity (DAG)')!
  assertMatches(String(acyclicity.message), /\d+ revision loop\(s\) detected/, 'Expected the number of revision loops.')
  assertContains(String(acyclicity.message), 'allowed', 'Expected them to be reported as allowed.')
})

Then('I am shown the looping route', function (this: DepWorld) {
  assertContains(this.output, 'True cycles:', 'Expected the looping route to be reported.')
  assertMatches(this.output, /first -> second|second -> first/, 'Expected the nodes of the loop.')
})

Then('the set-wide check on trigger uniqueness is reported as failing', function (this: DepWorld) {
  assertContains(this.output, '✗ Trigger uniqueness', 'Expected the trigger-uniqueness check to fail.')
})

Then('I am told which trigger is claimed by which trees', function (this: DepWorld) {
  // The report normalises the trigger it compares on, so compare the same way.
  assertContains(
    this.output.toLowerCase(),
    this.recall<string>('duplicate-trigger').toLowerCase(),
    'Expected the shared trigger to be named.',
  )
  assertContains(this.output, 'validate-and-fix', 'Expected the trees claiming it to be named.')
  assertContains(this.output, 'generate-doc-set', 'Expected the trees claiming it to be named.')
})

Then('the set-wide check on delegation cycles is reported as failing', function (this: DepWorld) {
  assertContains(this.output, '✗ No delegation cycles', 'Expected the delegation-cycle check to fail.')
})

Then('I am shown the circle', function (this: DepWorld) {
  assertContains(this.output, 'first-tree', 'Expected the trees in the circle to be named.')
  assertContains(this.output, 'second-tree', 'Expected the trees in the circle to be named.')
  assertContains(this.output, '->', 'Expected the circle to be drawn as a chain.')
})

Then('that tree is reported as warning rather than failing', function (this: DepWorld) {
  const tree = this.recall<string>('tree')
  assertContains(this.output, `◐ ${tree} — WARN`, `Expected ${tree} to warn.`)
  assertNotContains(this.output, `✗ ${tree} — FAIL`, 'Expected it not to fail.')
})

Then('I am told which reference could not be found and where it was looked for', function (this: DepWorld) {
  assertContains(this.output, this.recall<string>('missing-ref'), 'Expected the reference to be named.')
  assertContains(this.output, 'not found at', 'Expected where it was looked for.')
})

Then('I am told the tree exceeds its review cadence', function (this: DepWorld) {
  assertContains(this.output, 'Tree exceeds review cadence', 'Expected the review cadence to be reported.')
})

Then('it is reported as warning', function (this: DepWorld) {
  assertContains(this.output, `◐ ${this.recall<string>('tree')} — WARN`, 'Expected the tree to warn.')
})

Then('I receive one entry per tree with its verdict and every individual check, plus the set-wide checks', function (this: DepWorld) {
  const report = this.json<DapValidationJson>()
  assertTrue(report.trees.length > 1, 'Expected an entry per tree.')
  for (const tree of report.trees) {
    assertTrue(['PASS', 'WARN', 'FAIL'].includes(tree.status), `Expected a verdict for ${tree.tree}.`)
    assertTrue(tree.checks.length > 0, `Expected the individual checks of ${tree.tree}.`)
  }
  const setWide = report.graph.map((c) => c.name)
  for (const expected of ['No delegation cycles', 'Trigger uniqueness']) {
    assertTrue(setWide.includes(expected), `Expected the set-wide check "${expected}".`)
  }
})
