import { Given, Then, When } from '@cucumber/cucumber'
import { assertContains, assertEqual, assertIncludesAll, assertTrue } from '../support/expect.ts'
import type { DepWorld } from '../support/world.ts'

interface NodeJson {
  tree: string
  node: Record<string, any> & { id: string; type: string; description: string }
}

const TREE = 'validate-and-fix'

/** Which node of the seeded tree stands for each kind. */
const NODE_OF_KIND: Record<string, string> = {
  observe: 'run-validation',
  decide: 'assess-results',
  act: 'report-clean',
  delegate: 'hand-off-to-generation',
}

function seedTrees(world: DepWorld): void {
  if (world.dap.initialised) return
  world.project.seedStandard()
  world.dap.seedStandard()
}

// ── Given ──────────────────────────────────────────────────────────────────

Given('the tree {string} starts at the node {string}', function (this: DepWorld, tree: string, node: string) {
  seedTrees(this)
  this.note('tree', tree)
  this.note('node', node)
})

Given('a branching node in a tree', function (this: DepWorld) {
  seedTrees(this)
  this.note('tree', TREE)
  this.note('node', NODE_OF_KIND.decide)
})

Given('a node that gathers its information from a human', function (this: DepWorld) {
  seedTrees(this)
  this.note('tree', TREE)
  this.note('node', 'present-warnings')
})

Given('I have loaded the starting node of {string}', async function (this: DepWorld, tree: string) {
  seedTrees(this)
  this.note('tree', tree)
  const entry = 'run-validation'
  this.note('node', entry)
  await this.runInProject(['dap', 'node', tree, entry, '--json'])
})

Given('a node that delegates to another tree', function (this: DepWorld) {
  seedTrees(this)
  this.note('tree', TREE)
  this.note('node', NODE_OF_KIND.delegate)
})

// ── When ───────────────────────────────────────────────────────────────────

When('I ask for that node of that tree', async function (this: DepWorld) {
  await this.runInProject(['dap', 'node', this.recall<string>('tree'), this.recall<string>('node'), '--json'])
})

When('I ask for a node of kind {string}', async function (this: DepWorld, kind: string) {
  seedTrees(this)
  const node = NODE_OF_KIND[kind]
  assertTrue(!!node, `The fixture tree holds no node of kind "${kind}".`)
  this.note('tree', TREE)
  this.note('node', node!)
  this.note('kind', kind)
  await this.runInProject(['dap', 'node', TREE, node!])
})

When('I ask for that node', async function (this: DepWorld) {
  await this.runInProject(['dap', 'node', this.recall<string>('tree'), this.recall<string>('node'), '--json'])
})

When('I keep loading the node each answered node points me to', async function (this: DepWorld) {
  const tree = this.recall<string>('tree')
  const visited: string[] = []
  let current: string | undefined = this.recall<string>('node')

  // Follow one route to its end, loading a single node at a time.
  while (current && !visited.includes(current)) {
    visited.push(current)
    const result = await this.runQuiet(['dap', 'node', tree, current, '--json'])
    assertEqual(result.exitCode, 0, `Expected to be handed the node "${current}".`)
    const { node } = JSON.parse(result.stdout) as NodeJson

    if (node.terminal) {
      this.note('terminal-node', node)
      break
    }

    const next: string | undefined =
      node.type === 'decide'
        ? (node.conditions as Array<{ condition: string; next: string }>)[0]!.next
        : node.next ?? node.on_success ?? node.on_return
    assertTrue(!!next, `Expected node "${current}" to point at another node or to end the tree.`)
    // Every step is one the previous node named.
    this.note('last-pointer', { from: current, to: next })
    current = next
  }

  this.note('route', visited)
})

When('I ask for a node of the tree {string}', async function (this: DepWorld, tree: string) {
  seedTrees(this)
  this.note('tree', tree)
  await this.runInProject(['dap', 'node', tree, 'run-validation'])
})

When('I ask for the node {string} of the tree {string}', async function (this: DepWorld, node: string, tree: string) {
  seedTrees(this)
  this.note('tree', tree)
  this.note('node', node)
  await this.runInProject(['dap', 'node', tree, node])
})

When('I ask for a node in machine-readable form', async function (this: DepWorld) {
  seedTrees(this)
  this.note('tree', TREE)
  this.note('node', 'run-validation')
  await this.runInProject(['dap', 'node', TREE, 'run-validation', '--json'])
})

// ── Then ───────────────────────────────────────────────────────────────────

Then('I am given only that node', function (this: DepWorld) {
  const report = this.json<NodeJson>()
  assertEqual(report.tree, this.recall<string>('tree'), 'Expected the tree it belongs to.')
  assertEqual(report.node.id, this.recall<string>('node'), 'Expected exactly the node asked for.')
  assertTrue(!('nodes' in report), 'Expected one node rather than the whole tree.')
})

Then('I am shown what kind of node it is', function (this: DepWorld) {
  assertContains(['observe', 'decide', 'act', 'delegate'].join(','), this.json<NodeJson>().node.type, 'Expected a node kind.')
})

Then('I am shown what it asks me to do and what it expects to learn', function (this: DepWorld) {
  const node = this.json<NodeJson>().node
  assertTrue(!!node.description, 'Expected a description of what the node asks for.')
  assertTrue(!!node.method, 'Expected how the information is gathered.')
  assertTrue(Array.isArray(node.outputs) && node.outputs.length > 0, 'Expected what the node yields.')
})

Then('I am told which node to load next', function (this: DepWorld) {
  assertTrue(!!this.json<NodeJson>().node.next, 'Expected the node to name the next one.')
})

Then('it is marked with {string}', function (this: DepWorld, mark: string) {
  assertContains(this.output, `## ${this.recall<string>('node')} ${mark}`, 'Expected the node kind to be marked.')
})

Then('I am shown {string}', function (this: DepWorld, whatIAmGiven: string) {
  const kind = this.recall<string>('kind')
  switch (kind) {
    case 'observe':
      assertIncludesAll(this.output, ['**method**', '**tool**', '**outputs**'], whatIAmGiven)
      break
    case 'decide':
      assertContains(this.output, '| condition | next |', whatIAmGiven)
      assertContains(this.output, '| `_otherwise` |', whatIAmGiven)
      break
    case 'act':
      assertIncludesAll(this.output, ['**action_type**', '**intent**', '**terminal**'], whatIAmGiven)
      break
    case 'delegate':
      assertIncludesAll(this.output, ['**delegate_to**', '**pass_context**'], whatIAmGiven)
      break
    default:
      throw new Error(`Unknown node kind "${kind}".`)
  }
})

Then('its last condition is the fallback that holds when no other condition does', function (this: DepWorld) {
  const conditions = this.json<NodeJson>().node.conditions as Array<{ condition: string; next: string }>
  assertTrue(conditions.length > 1, 'Expected more than one condition.')
  assertEqual(conditions[conditions.length - 1]!.condition, '_otherwise', 'Expected a fallback last.')
})

Then('I am given the question to put to the human and the choices they may pick from', function (this: DepWorld) {
  const node = this.json<NodeJson>().node
  assertEqual(node.method, 'gate', 'Expected a node that gathers its information from a human.')
  assertTrue(!!node.prompt, 'Expected the question to put to the human.')
  assertTrue(Array.isArray(node.options) && node.options.length > 1, 'Expected the choices they may pick from.')
})

Then('I am told what the answer will be called and which node to load next', function (this: DepWorld) {
  const node = this.json<NodeJson>().node
  assertTrue(Array.isArray(node.outputs) && node.outputs.length > 0, 'Expected what the answer will be called.')
  assertTrue(!!node.next, 'Expected the node to load next.')
})

Then('I do not continue past that node until the human has answered', function (this: DepWorld) {
  const node = this.json<NodeJson>().node
  // The node hands back a question and a name for its answer; the branch that
  // follows is a separate node, keyed on that answer.
  assertEqual(this.invocations.length, 1, 'Expected the request to stop at that node.')
  assertTrue(!node.terminal, 'Expected the traversal to be waiting rather than finished.')
  assertContains(String(node.next), 'decide', 'Expected the next node to act on the answer.')
})

Then('I eventually reach a node that ends the tree', function (this: DepWorld) {
  const terminal = this.recall<NodeJson['node']>('terminal-node')
  assertTrue(!!terminal, 'Expected to reach a node that ends the tree.')
  assertEqual(terminal.terminal, true, 'Expected that node to be marked as ending the tree.')
})

Then('every node I acted on was one the previous node pointed me to', function (this: DepWorld) {
  const route = this.recall<string[]>('route')
  assertTrue(route.length > 1, 'Expected a route of more than one node.')
  assertEqual(route[0]!, 'run-validation', 'Expected the route to start at the starting node.')
})

Then('I am told which tree takes over', function (this: DepWorld) {
  assertTrue(!!this.json<NodeJson>().node.delegate_to, 'Expected the tree that takes over.')
})

Then('I am told whether control returns to this tree and where', function (this: DepWorld) {
  const node = this.json<NodeJson>().node
  const returns = 'on_return' in node && !!node.on_return
  assertTrue(
    returns || node.terminal === true,
    'Expected the node to say either where control returns or that it does not.',
  )
})

Then('I am told that tree was not found', function (this: DepWorld) {
  assertContains(this.output, `Tree not found: ${this.recall<string>('tree')}`, 'Expected the tree to be reported missing.')
})

Then('I am told which trees do exist', function (this: DepWorld) {
  assertContains(this.output, 'Available trees:', 'Expected the existing trees to be listed.')
  assertContains(this.output, TREE, 'Expected the fixture trees to be named.')
})

Then('I am told that node was not found in that tree, naming both', function (this: DepWorld) {
  assertContains(
    this.output,
    `Node not found: ${this.recall<string>('node')} in tree ${this.recall<string>('tree')}`,
    'Expected both the node and the tree to be named.',
  )
})

Then('I am told which nodes that tree does hold', function (this: DepWorld) {
  assertContains(this.output, 'Available nodes:', 'Expected the tree’s own nodes to be listed.')
  assertContains(this.output, 'run-validation', 'Expected the starting node among them.')
})

Then('I receive the tree it belongs to and the node with its identifier, kind, description and every field it declares', function (this: DepWorld) {
  const report = this.json<NodeJson>()
  assertEqual(report.tree, TREE, 'Expected the tree it belongs to.')
  assertEqual(report.node.id, 'run-validation', 'Expected the identifier.')
  assertEqual(report.node.type, 'observe', 'Expected the kind.')
  assertTrue(!!report.node.description, 'Expected the description.')
  assertIncludesAll(
    Object.keys(report.node).join(', '),
    ['method', 'tool', 'args', 'outputs', 'next'],
    'Expected every field the node declares.',
  )
})
