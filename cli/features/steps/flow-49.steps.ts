import { Given, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { appendFileSync, readFileSync } from 'fs'
import { join } from 'path'
import type { DepWorld } from '../support/world'
import { ChoosingPlayer, type Store, type SuiteDayResult, type SuitePlayer, type SuiteView, type Write } from '../../../packages/loop/src/index'
import { game } from './flow-48.steps'

/** Answers honestly, and also makes one more write of its own. */
class Overreaching implements SuitePlayer {
  private readonly honest = new ChoosingPlayer('arena')
  constructor(private readonly extra: (view: SuiteView) => Write) {}
  act(view: SuiteView, claims: string[], rng: Parameters<SuitePlayer['act']>[2]) {
    const answer = this.honest.act(view, claims, rng)
    return { ...answer, writes: [...answer.writes, this.extra(view)] }
  }
  propose(view: SuiteView, passed: boolean, choice: string) { return this.honest.propose(view, passed, choice) }
}

Given('a player that also writes outside where the game lets it', function (this: DepWorld) {
  this.notes.set('player', new Overreaching(() => ({ path: 'notes/escape.txt', content: 'out' })))
})

Given('a player that also rewrites the steps that judge it', function (this: DepWorld) {
  const steps = join(game(this).root, 'arena', 'steps', 'requests.steps.ts')
  this.notes.set('stepsBefore', readFileSync(steps, 'utf-8'))
  this.notes.set('player', new Overreaching(() => ({ path: 'arena/steps/requests.steps.ts', content: "// every request passes now\n" })))
})

Given("a player that changes the scenarios behind the game's back", function (this: DepWorld) {
  const feature = join(game(this).root, 'arena', 'features', 'billing.feature')
  const honest = new ChoosingPlayer('arena')
  let tampered = false
  // writes straight to disk instead of handing the write over to be checked
  this.notes.set('player', {
    act(view: SuiteView, claims: string[], rng: Parameters<SuitePlayer['act']>[2]) {
      if (!tampered) { appendFileSync(feature, '\n# loosened\n'); tampered = true }
      return honest.act(view, claims, rng)
    },
    propose: (view: SuiteView, passed: boolean, choice: string) => honest.propose(view, passed, choice),
  } satisfies SuitePlayer)
})

Then('its answers count for nothing that day', function (this: DepWorld) {
  const day = this.notes.get('suiteDay') as SuiteDayResult
  assert.equal(day.metrics.episodes, 0, 'some answers were judged')
  assert.equal(day.voided.length, 40)
  assert.equal((this.notes.get('store') as Store).active().length, 0, 'the store learned from a void answer')
})

Then('I am told where it tried to write', function (this: DepWorld) {
  const day = this.notes.get('suiteDay') as SuiteDayResult
  assert.ok(day.voided.every((v) => v.reason.includes('notes/escape.txt')), day.voided[0]?.reason)
})

Then('the steps that judge it are unchanged', function (this: DepWorld) {
  const steps = join(game(this).root, 'arena', 'steps', 'requests.steps.ts')
  assert.equal(readFileSync(steps, 'utf-8'), this.notes.get('stepsBefore'))
})

Then('nothing from that day is learned', function (this: DepWorld) {
  const day = this.notes.get('suiteDay') as SuiteDayResult
  assert.equal(day.metrics.episodes, 0)
  assert.equal((this.notes.get('store') as Store).active().length, 0)
})

Then('I am told the judge changed during the day', function (this: DepWorld) {
  const day = this.notes.get('suiteDay') as SuiteDayResult
  assert.ok(day.voided.length > 0 && day.voided.every((v) => /judge's ground changed/.test(v.reason)), day.voided[0]?.reason)
})
