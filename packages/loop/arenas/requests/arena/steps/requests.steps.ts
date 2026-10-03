/**
 * The judge of the reference arena. The player never writes here: it writes
 * one choice per level into choices/, and these steps apply that choice to the
 * request and check the outcome the scenario expects.
 */
import { Before, Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

interface Request { size: string; currency: string; tier: string }

/** How a request comes out under each choice the player can make. */
export function respond(request: Request, option: string): string {
  switch (option) {
    case 'accept': return 'accepted'
    case 'refuse': return 'refused'
    case 'convert': return request.currency !== 'USD' ? 'converted' : 'accepted'
    case 'defer': return 'pending'
    default: return 'unanswered'
  }
}

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

export const choiceFile = (level: string) => join('arena', 'choices', `${level.replace(/[^A-Za-z0-9]+/g, '_')}.json`)

Before(function (this: Record<string, unknown>, { pickle, gherkinDocument }) {
  this.level = levelId(pickle, gherkinDocument)
})

Given('a {word} request in {word} from a {word} customer', function (this: Record<string, unknown>, size: string, currency: string, tier: string) {
  this.request = { size, currency, tier }
})

Given('a request with no amount', function (this: Record<string, unknown>) {
  this.request = { size: 'none', currency: 'USD', tier: 'gold' }
})

When("the request is handled under this scenario's policy", function (this: Record<string, unknown>) {
  const file = choiceFile(this.level as string)
  const option = existsSync(file) ? String(JSON.parse(readFileSync(file, 'utf-8')).option) : 'none'
  this.outcome = respond(this.request as Request, option)
})

Then('the request is {word}', function (this: Record<string, unknown>, outcome: string) {
  assert.equal(this.outcome, outcome)
})
