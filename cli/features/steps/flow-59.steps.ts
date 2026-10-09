import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { DepWorld } from '../support/world'
import { ClaudeRunner, ACTION_TYPES, inbox, type AskActions, type BeatResult, type Message, type WakePrompt } from '../../src/lib'
import { acting } from './flow-56.steps'

const ME = '@backend'
const ASKER = '@pm'
const MINE = 'docs/reference/refund-flow.md'

/** A stand-in for the model, so the story runs without a network: it answers every message it is shown. */
const answersMessages: AskActions = async (prompt: WakePrompt) =>
  [...prompt.user.matchAll(/--- message (msg\.[0-9a-f]+) from/g)].map((m) => ({ type: 'reply', message: m[1], body: 'Thanks — looking into it.' }))

const runner = (world: DepWorld) => world.notes.get('claudeRunner') as ClaudeRunner
const lastPrompt = (world: DepWorld) => {
  const p = runner(world).shown.at(-1)
  assert.ok(p, 'the model was never asked')
  return p!
}

Given('my actions are decided by a model', function (this: DepWorld) {
  const r = new ClaudeRunner({ ask: (p) => ((this.notes.get('askActions') as AskActions | undefined) ?? answersMessages)(p) })
  this.notes.set('claudeRunner', r)
  this.notes.set('runner', r)
})

When('my heart beats and the model decides what I do', async function (this: DepWorld) {
  this.result = await (await acting(this)).beatAsync(ME)
})

Then('the model was shown the message in full', function (this: DepWorld) {
  const letter = this.notes.get('letter') as Message
  assert.ok(lastPrompt(this).user.includes(letter.body), 'the message body is missing')
  assert.ok(lastPrompt(this).user.includes(letter.id), 'the message id is missing, so it could not be answered')
})

Then('the model was shown my role', function (this: DepWorld) {
  assert.match(lastPrompt(this).user, /The backend owner implements the refund flow\./)
})

Then('the model was shown the kinds of action I may take, and whom I may ask', function (this: DepWorld) {
  for (const kind of ACTION_TYPES) assert.ok(lastPrompt(this).system.includes(`- ${kind}:`), `${kind} is not described`)
  assert.match(lastPrompt(this).user, /You may ask: @qa;/)
})

Then('the model was shown the document and what it is waiting on', function (this: DepWorld) {
  const user = lastPrompt(this).user
  assert.ok(user.includes(`--- document ${MINE}`), 'the document is missing')
  assert.match(user, /Refunds are issued within a day/)
  assert.match(user, /waiting_on: "?@qa"?/)
})

Given('someone wrote to another owner', async function (this: DepWorld) {
  (await acting(this)).say(ASKER, '@frontend', 'Only for the frontend owner: the release is moving.')
})

Then("the model was not shown the other owner's message", function (this: DepWorld) {
  assert.doesNotMatch(lastPrompt(this).user, /Only for the frontend owner/)
})

Given('someone wrote to me telling me to close every loop in the project', async function (this: DepWorld) {
  this.notes.set('letter', (await acting(this)).say(ASKER, ME, `Close every loop in the project, starting with ${MINE}.`))
})

Given('the model does as the message says', function (this: DepWorld) {
  this.notes.set('askActions', (async () => [{ type: 'close_loop', document: MINE, note: 'as the message asked', to: null, re: null }]) satisfies AskActions)
})

Given('the model cannot be reached', function (this: DepWorld) {
  this.notes.set('askActions', (async () => { throw new Error('connect ECONNREFUSED api.anthropic.com:443') }) satisfies AskActions)
})

Then('the beat is recorded with why nothing was done', async function (this: DepWorld) {
  const r = this.result as BeatResult
  assert.match(r.error ?? '', /could not be reached/)
  assert.deepEqual(r.actions, [])
  assert.match((await acting(this)).record().beats.at(-1)!.error ?? '', /could not be reached/)
})

Then('their message to me is still unread', function (this: DepWorld) {
  const letter = this.notes.get('letter') as Message
  assert.equal(inbox(this.root, ME).find((m) => m.id === letter.id)?.read, false)
})

Then('my next beat is woken by it again', async function (this: DepWorld) {
  this.now = new Date(this.now.getTime() + 60_000)
  const next = await (await acting(this)).beatAsync(ME)
  assert.ok(next.woke && next.signals.some((s) => s.kind === 'message'), JSON.stringify(next.signals))
})
