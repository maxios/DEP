/**
 * The judge of the doc-maintenance game. The player never writes here: it
 * writes one choice per level into choices/, beside this folder, and these
 * steps check it against what the scenario expects. Choices are found from
 * this file's own place, so the game can run from the project root.
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
Given('a {word} document that is {word}, whose dependencies are {word}, held with {word} confidence', function (this: Record<string, unknown>, _type: string, _lifecycle: string, _deps: string, _confidence: string) {
  // the situation is the player's to read; the judge only needs the choice and the expected outcome
})

When("its owner's choice is applied", function (this: Record<string, unknown>) {
  const file = choiceFile(this.level as string)
  this.choice = existsSync(file) ? String(JSON.parse(readFileSync(file, 'utf-8')).option) : 'none'
})

Then('it is handled by {word}', function (this: Record<string, unknown>, expected: string) {
  assert.equal(this.choice, expected)
})
