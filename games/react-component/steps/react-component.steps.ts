/**
 * The judge of the game.react-component game, written from the react-component template.
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
  return row ? `${pickle.uri}:${lines.get(scenario!)}:${lines.get(row)}` : `${pickle.uri}:${lines.get(scenario!)}`
}

const choiceFile = (level: string) => join(import.meta.dir, '..', 'choices', `${level.replace(/[^A-Za-z0-9]+/g, '_')}.json`)

Before(function (this: Record<string, unknown>, { pickle, gherkinDocument }) {
  this.level = levelId(pickle, gherkinDocument)
})

// Cucumber wants one argument per parameter, even ones the judge does not use
Given("a component whose data is {word}, whose device access is {word}, whose state is {word}, whose copy is {word}, whose logic is {word}, used {word}", function (this: Record<string, unknown>, _data: string, _device: string, _state: string, _copy: string, _logic: string, _reuse: string) {
  // the situation is the player's to read; the judge only needs the choice and the expected outcome
})

When("the author's choice is applied", function (this: Record<string, unknown>) {
  const file = choiceFile(this.level as string)
  this.choice = existsSync(file) ? String(JSON.parse(readFileSync(file, 'utf-8')).option) : 'none'
})

Then('the choice made is {word}', function (this: Record<string, unknown>, expected: string) {
  assert.equal(this.choice, expected)
})
