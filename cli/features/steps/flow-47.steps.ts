import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { stringify } from 'yaml'
import { DepWorld, SCRATCH, daysAgo } from '../support/world'
import { loadGame, GameError, type LoadedGame } from '../../../packages/loop/src/index'

const REQUESTS = `@play
Feature: Requests

  @happy-path
  Scenario Outline: A request is answered
    Given a request for a <size> amount in <currency> from a <tier> customer
    When the policy for this request is applied
    Then the request is <outcome>

    Examples:
      | size  | currency | tier | outcome  |
      | small | USD      | gold | accepted |
      | large | EUR      | new  | refused  |

  @validation
  Scenario: A request with no amount is refused
    Given a request with no amount
    When the policy for this request is applied
    Then the request is refused
`

const NOT_IN_PLAY = `@wip
Feature: Not in play

  @happy-path
  Scenario: Something not in play
    Given anything at all
    When the policy for this request is applied
    Then the request is accepted
`

function write(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

interface GameBlock {
  arena?: string
  levels?: string
  situation?: Record<string, string>
  actions?: { may_write?: string[]; never_write?: string[]; options?: string[] }
  scoring?: Record<string, unknown>
}

function gameDocument(block: GameBlock, now: Date): string {
  const dep = {
    type: 'reference', audience: ['ai-agent'], owner: '@fixture',
    created: daysAgo(10, now), last_verified: daysAgo(1, now), confidence: 'high',
    depends_on: [], tags: ['game'], links: [],
  }
  return `---\n${stringify({ dep, game: { id: 'game.fixture', ...block } }, { lineWidth: 0 })}---\n\n# The fixture game\n\nThe levels are the request scenarios in play.\n`
}

const BASE: GameBlock = {
  arena: 'arena',
  levels: '@play and not @wip',
  situation: { kind: 'tag:happy-path|validation|edge-case', tier: 'row:tier', currency: 'row:currency' },
  actions: { may_write: ['arena/choices/**'], never_write: [], options: ['accept', 'refuse', 'convert'] },
  scoring: { authority: 'suite', pass: 1, fail: -1, regression: -2 },
}

function arena(world: DepWorld, block: GameBlock = BASE, withArena = true): string {
  const root = world.root || mkdtempSync(join(SCRATCH, 'game-'))
  if (!world.root) world.notes.set('gameRoot', root)
  if (withArena) {
    write(join(root, 'arena', 'features', 'requests.feature'), REQUESTS)
    write(join(root, 'arena', 'features', 'other.feature'), NOT_IN_PLAY)
    write(join(root, 'arena', 'steps', 'arena.steps.ts'), '// the judge lives here\n')
  }
  const doc = join(root, 'docs', 'reference', 'game-fixture.md')
  write(doc, gameDocument(block, world.now))
  world.notes.set('gameDoc', doc)
  world.notes.set('gameRootDir', root)
  return doc
}

Given('a game document that names an arena of scenarios and which of them are in play', function (this: DepWorld) {
  arena(this)
})

Given("a game whose situations are described by a scenario's tags and its example row", function (this: DepWorld) {
  arena(this)
})

Given('a game document that lets something other than the scenarios keep score', function (this: DepWorld) {
  arena(this, { ...BASE, scoring: { ...BASE.scoring, authority: 'player' } })
})

Given("a game document whose writable paths reach the scenarios' own steps", function (this: DepWorld) {
  arena(this, { ...BASE, actions: { ...BASE.actions, may_write: ['arena/**'] } })
})

Given('a game document that names an arena that does not exist', function (this: DepWorld) {
  arena(this, { ...BASE, arena: 'no-such-arena' }, false)
})

Given('a game document that describes situations by something its scenarios do not have', function (this: DepWorld) {
  arena(this, { ...BASE, situation: { ...BASE.situation, region: 'row:region' } })
})

When('I read the game', function (this: DepWorld) {
  this.error = undefined
  this.result = undefined
  try {
    this.result = loadGame(this.notes.get('gameDoc') as string, this.notes.get('gameRootDir') as string)
  } catch (err) {
    this.error = err
  }
})

function loaded(world: DepWorld): LoadedGame {
  assert.ok(world.result, `the game could not be read: ${world.errorMessage()}`)
  return world.result as LoadedGame
}

Then('every scenario in play is a level', function (this: DepWorld) {
  const names = loaded(this).levels.map((l) => l.name).sort()
  assert.deepEqual(names, ['A request is answered', 'A request is answered', 'A request with no amount is refused'])
})

Then('no scenario outside the selection is a level', function (this: DepWorld) {
  assert.ok(!loaded(this).levels.some((l) => l.name === 'Something not in play'))
})

Then("each level's situation carries the features the game names", function (this: DepWorld) {
  for (const level of loaded(this).levels) {
    assert.ok(typeof level.key.features.kind === 'string', `${level.id} has no kind`)
    if (level.name === 'A request is answered') {
      assert.ok(level.key.features.tier, `${level.id} has no tier`)
      assert.ok(level.key.features.currency, `${level.id} has no currency`)
    }
  }
  const plain = loaded(this).levels.find((l) => l.name === 'A request with no amount is refused')!
  assert.equal(plain.key.features.kind, 'validation')
})

Then('two rows of the same outline are different situations that share their tags', function (this: DepWorld) {
  const rows = loaded(this).levels.filter((l) => l.name === 'A request is answered')
  assert.equal(rows.length, 2)
  assert.notDeepEqual(rows[0]!.key.features, rows[1]!.key.features)
  assert.equal(rows[0]!.key.features.kind, rows[1]!.key.features.kind)
  assert.notEqual(rows[0]!.id, rows[1]!.id)
})

function refusedWith(world: DepWorld, pattern: RegExp) {
  assert.ok(world.error instanceof GameError, `expected the game to be refused, got ${world.errorMessage() || 'a game'}`)
  assert.ok(pattern.test(world.errorMessage()), world.errorMessage())
}

Then('I am told the scenarios must be the only judge', function (this: DepWorld) {
  refusedWith(this, /scenarios must be the only judge/)
})

Then('I am told the player may not write where it is judged', function (this: DepWorld) {
  refusedWith(this, /may not write where it is judged/)
})

Then('I am told the arena cannot be found', function (this: DepWorld) {
  refusedWith(this, /arena cannot be found/)
})

Then('I am told which part of the situation cannot be read', function (this: DepWorld) {
  refusedWith(this, /region/)
})

// ── the game document is documentation ─────────────────────────────────

Given("a game document in the project's documentation", async function (this: DepWorld) {
  this.seedDefaultDocs()
  await this.materialise()
  arena(this)
  this.set!.refresh()
})

When('the documentation set is validated', async function (this: DepWorld) {
  // a story that opened its own set validates that one
  if (!this.set) await this.materialise()
  this.result = this.set!.validate()
})

Then('the game document is checked like any other reference', function (this: DepWorld) {
  const report = this.result as { documents: Array<{ path: string; status: string; checks: Array<{ name: string; passed: boolean }> }> }
  const doc = report.documents.find((d) => d.path === 'docs/reference/game-fixture.md')
  assert.ok(doc, `the game document was not checked: ${report.documents.map((d) => d.path).join(', ')}`)
  assert.notEqual(doc!.status, 'FAIL', JSON.stringify(doc!.checks.filter((c) => !c.passed)))
})
