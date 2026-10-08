import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { DepWorld, daysAgo, freshnessBody } from '../support/world'
import type { BeatResult, Heartbeat } from '../../src/lib'

const ME = '@backend'
const SOMEONE = '@qa'
const HOUR = 60 * 60 * 1000
const MINE = 'docs/reference/refund-flow.md'
const WATCHED = 'docs/reference/payments-spec.md'
const STALE = 'docs/reference/lifecycle-states.md'

const hoursAgo = (world: DepWorld, h: number) => new Date(world.now.getTime() - h * HOUR).toISOString()

function waiting(world: DepWorld, owner = ME, path = MINE, asked = 5) {
  world.addDoc({
    path, type: 'reference', owner, title: 'Refund flow', body: freshnessBody('Refunds are issued within a day.'),
    heart: { status: 'waiting', waiting_on: SOMEONE, asked_at: hoursAgo(world, asked), follow_up_after: '4h', follow_ups: 0, max_follow_ups: 3 },
  })
}

Given('a document of mine waiting on someone, asked a minute short of four hours ago, to follow up after four', function (this: DepWorld) {
  this.seedDefaultDocs()
  waiting(this, ME, MINE, 4 - 1 / 60)
})

Then('my next beat is no later than when the follow-up falls due', function (this: DepWorld) {
  const due = this.now.getTime() + HOUR / 60
  assert.ok(new Date(last(this).nextBeat).getTime() <= due, `next beat ${last(this).nextBeat} is after the follow-up falls due`)
})

async function heart(world: DepWorld): Promise<Heartbeat> {
  await world.materialise()
  const existing = world.notes.get('heartbeat') as Heartbeat | undefined
  if (existing) return existing
  const hb = world.set!.heartbeat()
  world.notes.set('heartbeat', hb)
  return hb
}

async function beat(world: DepWorld): Promise<BeatResult> {
  const result = (await heart(world)).beat(ME)
  const beats = (world.notes.get('beats') as BeatResult[] | undefined) ?? []
  beats.push(result)
  world.notes.set('beats', beats)
  world.result = result
  return result
}

const last = (world: DepWorld) => world.result as BeatResult

// ── the project ─────────────────────────────────────────────────────────

Given('a document of mine waiting on someone, asked five hours ago, to follow up after four', function (this: DepWorld) {
  this.seedDefaultDocs()
  waiting(this)
})

Given('a document of mine waiting past its follow-up time', function (this: DepWorld) {
  if (this.docs.size === 0) this.seedDefaultDocs()
  waiting(this)
})

Given('a document waiting past its follow-up time that someone else owns', function (this: DepWorld) {
  this.seedDefaultDocs()
  waiting(this, '@frontend')
})

Given('documents of mine that are fresh and wait on no one', function (this: DepWorld) {
  this.seedDefaultDocs()
  for (const spec of this.docs.values()) spec.owner = ME
  this.addDoc({ path: MINE, type: 'reference', owner: ME, title: 'Refund flow', body: freshnessBody('Refunds are issued within a day.'), heart: { status: 'active' } })
})

Given('a document of mine that is past its review date', function (this: DepWorld) {
  this.seedDefaultDocs()
  const spec = this.docs.get(STALE)!
  spec.owner = ME
  spec.lastVerified = daysAgo(400, this.now)
})

Given('a document of mine past its review date', function (this: DepWorld) {
  this.seedDefaultDocs()
  const spec = this.docs.get(STALE)!
  spec.owner = ME
  spec.lastVerified = daysAgo(400, this.now)
})

Given('a document of mine that watches another document', function (this: DepWorld) {
  this.seedDefaultDocs()
  this.addDoc({ path: WATCHED, type: 'reference', owner: SOMEONE, title: 'Payments spec', body: freshnessBody('Payments settle nightly.') })
  this.addDoc({ path: MINE, type: 'reference', owner: ME, title: 'Refund flow', body: freshnessBody('Refunds are issued within a day.'), heart: { status: 'active', watch: [WATCHED] } })
})

Given('my heart has beaten once already', async function (this: DepWorld) {
  await beat(this)
})

When('the watched document changes', function (this: DepWorld) {
  this.editDoc(WATCHED, '\nPayments now settle twice a day.\n')
  this.writeDoc(this.docs.get(WATCHED)!)
})

// ── beating ─────────────────────────────────────────────────────────────

When('my heart beats', async function (this: DepWorld) {
  await beat(this)
})

When('my heart beats five times with nothing found', async function (this: DepWorld) {
  for (let i = 0; i < 5; i++) {
    const r = await beat(this)
    assert.equal(r.woke, false, `beat ${i} found ${JSON.stringify(r.signals)}`)
    this.now = new Date(r.nextBeat)
  }
})

Given('an owner whose beats have backed off', async function (this: DepWorld) {
  this.seedDefaultDocs()
  for (const spec of this.docs.values()) spec.owner = ME
  for (let i = 0; i < 4; i++) {
    const r = await beat(this)
    this.now = new Date(r.nextBeat)
  }
  assert.ok(last(this).interval > (await heart(this)).config.INTERVAL_MIN_MS, 'the beats never backed off')
})

When('something changes that concerns them', async function (this: DepWorld) {
  this.notes.set('interrupted', (await heart(this)).interrupt(ME))
})

When('my heart beats twice, with the follow-up answered in between', async function (this: DepWorld) {
  await beat(this)
  const spec = this.docs.get(MINE)!
  spec.heart = { status: 'active' }
  this.writeDoc(spec)
  this.set!.refresh()
  this.now = new Date(this.now.getTime() + HOUR)
  await beat(this)
})

Given('the kill switch is on', async function (this: DepWorld) {
  await this.materialise()
  mkdirSync(join(this.root, '.pulse'), { recursive: true })
  writeFileSync(join(this.root, '.pulse', 'STOP'), '')
})

// ── what it says ────────────────────────────────────────────────────────

Then('I am woken', function (this: DepWorld) {
  assert.equal(last(this).woke, true, `not woken; signals: ${JSON.stringify(last(this).signals)}`)
})

Then('I am not woken', function (this: DepWorld) {
  assert.equal(last(this).woke, false, `woken for ${JSON.stringify(last(this).signals)}`)
})

Then('I am told which document is waiting, on whom, and since when', function (this: DepWorld) {
  const s = last(this).signals.find((x) => x.kind === 'follow_up_due')
  assert.ok(s, JSON.stringify(last(this).signals))
  assert.equal(s!.document, MINE)
  assert.equal(s!.waitingOn, SOMEONE)
  assert.equal(s!.since, hoursAgo(this, 5))
})

Then('I am told the document is due for review', function (this: DepWorld) {
  const s = last(this).signals.find((x) => x.kind === 'review_due')
  assert.ok(s && s.document === STALE, JSON.stringify(last(this).signals))
})

Then('I am told which watched document changed', function (this: DepWorld) {
  const s = last(this).signals.find((x) => x.kind === 'watched_change')
  assert.ok(s, JSON.stringify(last(this).signals))
  assert.equal(s!.document, MINE)
  assert.equal(s!.changed, WATCHED)
})

Then('the follow-up is the first thing I am told', function (this: DepWorld) {
  const kinds = last(this).signals.map((s) => s.kind)
  assert.deepEqual(kinds.slice(0, 1), ['follow_up_due'], kinds.join(', '))
  assert.ok(kinds.includes('review_due'), 'the review was dropped')
})

Then('each wait before the next beat is longer than the last, up to a limit', async function (this: DepWorld) {
  const intervals = (this.notes.get('beats') as BeatResult[]).map((b) => b.interval)
  const max = (await heart(this)).config.INTERVAL_MAX_MS
  for (let i = 1; i < intervals.length; i++) {
    assert.ok(intervals[i]! > intervals[i - 1]! || intervals[i] === max, `intervals ${intervals.join(', ')}`)
    assert.ok(intervals[i]! <= max)
  }
})

Then('their next beat comes at the shortest interval', async function (this: DepWorld) {
  const hb = await heart(this)
  const after = hb.schedule(ME)
  assert.equal(after.interval, hb.config.INTERVAL_MIN_MS)
  assert.ok(after.nextBeat && new Date(after.nextBeat).getTime() <= this.now.getTime() + hb.config.INTERVAL_MIN_MS, String(after.nextBeat))
})

Then('both beats are recorded', async function (this: DepWorld) {
  const record = (await heart(this)).record()
  assert.equal(record.beats.length, 2)
  assert.deepEqual(record.beats.map((b) => b.woke), [true, false])
})

Then('the record says how many beats woke me', async function (this: DepWorld) {
  const record = (await heart(this)).record()
  assert.equal(record.wakes, 1)
  assert.equal(record.wakeRatio, 0.5)
})

Then('the beat is recorded with what it would have woken me for', async function (this: DepWorld) {
  const record = (await heart(this)).record()
  const entry = record.beats.at(-1)!
  assert.equal(entry.stopped, true)
  assert.ok(entry.signals.some((s) => s.kind === 'follow_up_due'), JSON.stringify(entry))
})

// ── validation ──────────────────────────────────────────────────────────

Given('a document whose heart waits on no one and follows up {string}', function (this: DepWorld, after: string) {
  this.seedDefaultDocs()
  this.addDoc({ path: MINE, type: 'reference', owner: ME, title: 'Refund flow', body: freshnessBody('Refunds are issued within a day.'), heart: { status: 'waiting', follow_up_after: after } })
})

Then('the document fails validation', function (this: DepWorld) {
  const report = this.result as { documents: Array<{ path: string; status: string }> }
  assert.equal(report.documents.find((d) => d.path === MINE)?.status, 'FAIL')
})

Then('I am told what is wrong with its heart', function (this: DepWorld) {
  const report = this.result as { documents: Array<{ path: string; checks: Array<{ name: string; passed: boolean; message?: string }> }> }
  const failed = report.documents.find((d) => d.path === MINE)!.checks.filter((c) => !c.passed).map((c) => c.message ?? c.name).join(' | ')
  assert.match(failed, /waiting on/, failed)
  assert.match(failed, /"soon"/, failed)
})
