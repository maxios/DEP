import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { Given, Then, When } from '@cucumber/cucumber'
import { assertContains, assertIncludesAll, assertTrue } from '../support/expect.ts'
import type { DepWorld } from '../support/world.ts'

Given('a project whose root holds a {string} declaring its documentation root', function (this: DepWorld, file: string) {
  this.project.seedStandard()
  assertTrue(this.project.exists(file), `Expected the fixture project to hold a ${file}.`)
})

When('I make any request and name that project root', async function (this: DepWorld) {
  await this.runInProject(['query', '--type', 'reference'])
})

Then("the request is answered from that project's documents", function (this: DepWorld) {
  assertContains(this.output, 'docs/reference/metadata-schema.md', 'Expected the fixture project\'s own documents.')
})

When('I ask for help', async function (this: DepWorld) {
  await this.run(['help'])
})

Then(
  'I am shown the documentation requests I can make, including graph, backlinks, validate, query, index, search, vectorize, neighbors, roadmap and prereqs',
  function (this: DepWorld) {
    assertIncludesAll(
      this.output,
      ['dep graph', 'dep backlinks', 'dep validate', 'dep query', 'dep index', 'dep search', 'dep vectorize', 'dep neighbors', 'dep roadmap', 'dep prereqs'],
      'Expected every documentation request to be listed.',
    )
  },
)

Then('I am shown the metadata requests I can make, including set, bump, tag and link', function (this: DepWorld) {
  assertIncludesAll(
    this.output,
    ['dep set', 'dep bump', 'dep tag', 'dep link'],
    'Expected every metadata request to be listed.',
  )
})

Then(
  'I am shown the decision requests I can make, including dap validate, dap resolve, dap node, dap trace and dap graph',
  function (this: DepWorld) {
    assertIncludesAll(
      this.output,
      ['dep dap validate', 'dep dap resolve', 'dep dap node', 'dep dap trace', 'dep dap graph'],
      'Expected every decision request to be listed.',
    )
  },
)

Then('I am told that every request accepts a project root and a JSON form', function (this: DepWorld) {
  assertContains(this.output, '--root', 'Expected the project-root flag to be documented.')
  assertContains(this.output, '--json', 'Expected the JSON flag to be documented.')
})

Given('I name a capability that does not exist', function (this: DepWorld) {
  this.project.seedStandard()
  this.note('capability', 'reticulate')
})

When('I make that request', async function (this: DepWorld) {
  await this.runInProject([this.recall<string>('capability')])
})

Then('I am shown the list of capabilities that do exist', function (this: DepWorld) {
  assertIncludesAll(
    this.output,
    ['dep graph', 'dep validate', 'dep query'],
    'Expected the unknown capability to be answered with the list of real ones.',
  )
})

Given('I do not name a project root', function (this: DepWorld) {
  this.project.seedStandard()
  // The CLI defaults to the parent of the working directory, so stand one level in.
  const workingDir = join(this.project.root, 'cli')
  mkdirSync(workingDir, { recursive: true })
  this.note('cwd', workingDir)
})

When('I make a request', async function (this: DepWorld) {
  await this.run(['query', '--type', 'reference'], { cwd: this.recall<string>('cwd') })
})

Then('the parent of my current location is used as the project root', function (this: DepWorld) {
  assertContains(
    this.output,
    'docs/reference/metadata-schema.md',
    'Expected the parent of the working directory to have been read as the project.',
  )
})

Given('the project root holds a {string} collection with its own {string}', function (this: DepWorld, dir: string, spec: string) {
  this.project.seedStandard()
  this.dap.seedStandard()
  assertTrue(this.project.exists(`${dir}/${spec}`), `Expected the fixture project to hold ${dir}/${spec}.`)
})

When('I make a decision request against that project root', async function (this: DepWorld) {
  await this.runInProject(['dap', 'resolve', 'validate DEP documentation and fix issues'])
})

Then("the request is answered from that project's decision trees", function (this: DepWorld) {
  assertContains(this.output, 'validate-and-fix', "Expected the fixture project's own trees.")
})
