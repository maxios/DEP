/**
 * Start a game from a template: write the game document, the Scenario
 * Outline whose rows are every situation with the choice the policy expects,
 * and the judge's steps. All three come from the same rules, so the table a
 * person reads in the document is exactly what the judge checks.
 *
 * Nothing that exists is overwritten: a game a team has changed by hand is
 * theirs.
 */
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { GameError } from './game'
import { TEMPLATES, ruleFor, situations, type GameTemplate } from './templates/index'

export interface TemplateListing {
  name: string
  title: string
  teaches: string
  id: string
  options: string[]
  dimensions: Array<{ name: string; values: string[] }>
  levels: number
}

export interface StartOptions {
  /** Where documents live, relative to the project root. */
  docsRoot?: string
  /** Who owns the new game document, and who it is for. */
  owner?: string
  audience?: string[]
  now?: Date
}

export interface StartedGame {
  id: string
  template: string
  document: string
  arena: string
  /** Every file written, relative to the project root. */
  files: string[]
}

export function listTemplates(): TemplateListing[] {
  return TEMPLATES.map((t) => ({
    name: t.name, title: t.title, teaches: t.teaches, id: t.id, options: t.options,
    dimensions: t.dimensions, levels: situations(t).length,
  }))
}

export function findTemplate(name: string): GameTemplate {
  const found = TEMPLATES.find((t) => t.name === name)
  if (!found) throw new GameError('UNKNOWN_TEMPLATE', `there is no "${name}" template; there are: ${TEMPLATES.map((t) => t.name).join(', ')}`)
  return found
}

/** Where a template's game is written in a project. */
export function templatePaths(template: GameTemplate, docsRoot = 'docs') {
  const arena = `games/${template.name}`
  return {
    arena,
    feature: `${arena}/features/${template.name}.feature`,
    steps: `${arena}/steps/${template.name}.steps.ts`,
    ignore: `${arena}/.gitignore`,
    document: `${docsRoot.replace(/^\.\//, '').replace(/\/+$/, '')}/games/${template.name}.md`,
  }
}

export function startFromTemplate(root: string, name: string, options: StartOptions = {}): StartedGame {
  const template = findTemplate(name)
  const paths = templatePaths(template, options.docsRoot)
  const existing = [paths.document, paths.feature, paths.steps].filter((p) => existsSync(join(root, p)))
  if (existing.length) {
    throw new GameError('GAME_EXISTS', `the ${template.id} game already exists (${existing.join(', ')}); nothing was overwritten`)
  }
  const files: Array<[string, string]> = [
    [paths.feature, featureText(template)],
    [paths.steps, stepsText(template)],
    [paths.ignore, 'choices/\n'],
    [paths.document, documentText(template, paths, options)],
  ]
  for (const [file, text] of files) {
    mkdirSync(dirname(join(root, file)), { recursive: true })
    writeFileSync(join(root, file), text)
  }
  return { id: template.id, template: template.name, document: paths.document, arena: paths.arena, files: files.map(([f]) => f) }
}

/** The Given sentence with each <dimension> in place; a Cucumber expression needs these characters left out. */
function checkedGiven(template: GameTemplate): string {
  if (/[(){}/]/.test(template.given)) throw new GameError('INVALID', `the ${template.name} template's situation sentence may not use ( ) { } or /`)
  for (const d of template.dimensions) {
    if (!template.given.includes(`<${d.name}>`)) throw new GameError('INVALID', `the ${template.name} template's situation sentence never names <${d.name}>`)
    for (const v of d.values) if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(v)) throw new GameError('INVALID', `"${v}" is not one word; a situation value must be letters, digits and dashes`)
  }
  return template.given
}

export function featureText(template: GameTemplate): string {
  const header = [...template.dimensions.map((d) => d.name), 'expected']
  const rows = situations(template).map((s) => [...template.dimensions.map((d) => s[d.name]!), ruleFor(template, s).then])
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)))
  const line = (cells: string[]) => '      |' + cells.map((c, i) => ` ${c.padEnd(widths[i]!)} `).join('|') + '|'
  return [
    `@play @${template.name}`,
    `Feature: ${template.feature}`,
    '',
    `  Scenario Outline: ${template.scenario}`,
    `    Given ${checkedGiven(template)}`,
    `    When ${template.when}`,
    '    Then the choice made is <expected>',
    '',
    '    Examples:',
    line(header),
    ...rows.map(line),
    '',
  ].join('\n')
}

export function stepsText(template: GameTemplate): string {
  const pattern = checkedGiven(template).replace(/<[a-z][a-z0-9-]*>/g, '{word}')
  const params = template.dimensions.map((d) => `_${d.name.replace(/-/g, '_')}: string`).join(', ')
  return `/**
 * The judge of the ${template.id} game, written from the ${template.name} template.
 * The player never writes here: it writes one choice per level into choices/,
 * beside this folder, and these steps check it against what the scenario
 * expects. To change the policy, change the Examples' expected column and the
 * table in the game document together.
 */
import { Before, Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

/** The same identity the loop engine gives a level: file, scenario line, example row line. */
function levelId(pickle: { uri: string; astNodeIds: readonly string[] }, doc: { feature?: { children: readonly any[] } }): string {
  const lines = new Map<string, number>()
  for (const child of doc.feature?.children ?? []) {
    const scenario = child.scenario
    if (!scenario) continue
    lines.set(scenario.id, scenario.location.line)
    for (const examples of scenario.examples) for (const row of examples.tableBody) lines.set(row.id, row.location.line)
  }
  const [scenario, row] = pickle.astNodeIds
  return row ? \`\${pickle.uri}:\${lines.get(scenario!)}:\${lines.get(row)}\` : \`\${pickle.uri}:\${lines.get(scenario!)}\`
}

const choiceFile = (level: string) => join(import.meta.dir, '..', 'choices', \`\${level.replace(/[^A-Za-z0-9]+/g, '_')}.json\`)

Before(function (this: Record<string, unknown>, { pickle, gherkinDocument }) {
  this.level = levelId(pickle, gherkinDocument)
})

// Cucumber wants one argument per parameter, even ones the judge does not use
Given(${JSON.stringify(pattern)}, function (this: Record<string, unknown>, ${params}) {
  // the situation is the player's to read; the judge only needs the choice and the expected outcome
})

When(${JSON.stringify(template.when)}, function (this: Record<string, unknown>) {
  const file = choiceFile(this.level as string)
  this.choice = existsSync(file) ? String(JSON.parse(readFileSync(file, 'utf-8')).option) : 'none'
})

Then('the choice made is {word}', function (this: Record<string, unknown>, expected: string) {
  assert.equal(this.choice, expected)
})
`
}

export function documentText(template: GameTemplate, paths: ReturnType<typeof templatePaths>, options: StartOptions): string {
  const at = (options.now ?? new Date()).toISOString().replace(/\.\d{3}Z$/, 'Z')
  const audience = options.audience?.length ? options.audience : []
  const situation = template.dimensions.map((d) => `    ${d.name}: "row:${d.name}"`).join('\n')
  const policy = [
    ...template.rules.map((r) => `| ${r.why} | \`${r.then}\` |`),
    `| ${template.otherwise.why.replace(/^otherwise,?\s*/i, 'otherwise: ')} | \`${template.otherwise.then}\` |`,
  ]
  return `---
dep:
  type: reference
  audience: [${audience.join(', ')}]
  owner: "${options.owner ?? '@team'}"
  created: ${at}
  last_verified: ${at}
  confidence: medium
  depends_on: [${paths.feature}, ${paths.steps}]
  tags: [game, ${template.name}]
game:
  id: ${template.id}
  arena: ${paths.arena}
  levels: "@play and not @wip"
  levels_independent: true
  situation:
${situation}
  actions:
    may_write: ["${paths.arena}/choices/**"]
    never_write: []
    options: [${template.options.join(', ')}]
  scoring:
    authority: suite
    pass: 1
    fail: -1
    regression: -2
---

# The ${template.title.toLowerCase()} game

${template.title}s learn ${template.teaches}. Each level is one situation:
${template.dimensions.map((d) => `**${d.name}** (${d.values.join(', ')})`).join(', ')}. The agent chooses one of
${template.options.map((o) => `\`${o}\``).join(', ')}, and the judge's scenarios check the choice.

The policy the judge holds, first match wins. It is a starting point for your team to change:

| When | Then |
|---|---|
${policy.join('\n')}

To change it, change the expected column in \`${paths.feature}\` and this table together; the
judge (\`${paths.steps}\`) compares the choice with that column. The game's documents and arena
were written by \`dep game new --template ${template.name}\`.
`
}
