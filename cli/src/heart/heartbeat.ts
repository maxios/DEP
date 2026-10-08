/**
 * The heartbeat: a cheap, regular check of each owner's documents that wakes
 * the owner only when one of them needs them.
 *
 * A beat is a pulse, not a wake-up. The pulse reads metadata and file
 * fingerprints and nothing else — no model is called — and returns the
 * signals that would justify waking: a follow-up that is due, a document set
 * as open work, a beat a document asked for, a review that is overdue, a
 * watched document that changed. No signal, no wake, and the owner's next
 * beat backs off; a signal, or an interrupt, brings it back to the shortest
 * interval.
 *
 * Every beat is recorded in `.pulse/beats.jsonl`, woken or not, so the wake
 * ratio — what fraction of beats cost anything — can be read off. If
 * `.pulse/STOP` exists, owners are still pulsed and the beat is recorded with
 * what it found, but nobody is woken.
 */
import { createHash } from 'crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { DepGraph } from '../types'
import { duration, iso, quietUntil } from './heart'
import { applyActions, type ActionOutcome, type Runner, type Wake } from './actions'
import { inbox, send, type Message } from './inbox'
import { take, release } from './lease'
import { askSituation, closeUnanswered, observeAnswers, outcomes, recordAsk, type Outcome } from './outcomes'
import { messagePath } from './inbox'
import { readDepFile } from '../writer'

export type SignalKind = 'message' | 'follow_up_due' | 'task' | 'watched_change' | 'due' | 'review_due'

/** What needs an owner most comes first. */
const PRIORITY: SignalKind[] = ['message', 'follow_up_due', 'task', 'watched_change', 'due', 'review_due']

export interface Signal {
  kind: SignalKind
  /** The owner's document the signal is about. */
  document: string
  why: string
  waitingOn?: string
  since?: string
  /** For a watched change: the watched document that changed. */
  changed?: string
  /** For a message: who wrote it. */
  from?: string
}

export interface BeatResult {
  beatId: string
  agent: string
  at: string
  signals: Signal[]
  woke: boolean
  /** The kill switch was on: the owner was pulsed but not woken. */
  stopped: boolean
  /** How long the scheduler waits before the next beat, before any document asks for sooner. */
  interval: number
  nextBeat: string
  /** Signals left alone because another beat holds their document. */
  held: Signal[]
  /** What the owner did, when woken with something to act. */
  actions: ActionOutcome[]
  /** Why nothing was done although the owner was woken: the runner could not be reached. */
  error?: string
  /** What came of earlier asks, seen in this beat. */
  scored: Outcome[]
}

export interface BeatRecord {
  beats: BeatResult[]
  wakes: number
  wakeRatio: number
}

export const HEARTBEAT_DEFAULTS = {
  INTERVAL_MIN_MS: 60_000,
  INTERVAL_MAX_MS: 2 * 3_600_000,
  BACKOFF: 2,
  LEASE_TTL_MS: 10 * 60_000,
  MAX_HOPS: 4,
  MAX_FOLLOW_UPS: 3,
  /** The person's quiet hours, "22:00-08:00"; none by default. */
  QUIET_HOURS: '',
  TIMEZONE: 'UTC',
}

export type HeartbeatConfig = typeof HEARTBEAT_DEFAULTS

interface PulseState {
  interval: number
  nextBeat: string | null
  /** Fingerprints of watched documents as this owner last saw them. */
  seen: Record<string, string>
}

const fingerprint = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 16)
const safe = (agent: string) => agent.replace(/[^A-Za-z0-9._-]/g, '_')

export class Heartbeat {
  readonly config: HeartbeatConfig

  constructor(
    private readonly root: string,
    private readonly graph: () => DepGraph,
    private readonly now: () => Date,
    config: Partial<HeartbeatConfig> = {},
    /** What acts for a woken owner. Without one, a beat only says what it would wake them for. */
    private readonly runner?: Runner,
  ) {
    this.config = { ...HEARTBEAT_DEFAULTS, ...config }
  }

  private get dir(): string {
    return join(this.root, '.pulse')
  }

  private load(agent: string): PulseState {
    const file = join(this.dir, `${safe(agent)}.json`)
    if (!existsSync(file)) return { interval: this.config.INTERVAL_MIN_MS, nextBeat: null, seen: {} }
    return JSON.parse(readFileSync(file, 'utf-8')) as PulseState
  }

  private save(agent: string, state: PulseState): void {
    mkdirSync(this.dir, { recursive: true })
    writeFileSync(join(this.dir, `${safe(agent)}.json`), JSON.stringify(state, null, 2) + '\n')
  }

  /** The signals for one owner, most pressing first. Reads metadata and fingerprints only. */
  pulse(agent: string, state: PulseState = this.load(agent)): { signals: Signal[]; seen: Record<string, string>; soonest: number | null } {
    const now = this.now().getTime()
    const signals: Signal[] = []
    const seen: Record<string, string> = { ...state.seen }
    let soonest: number | null = null
    for (const m of inbox(this.root, agent)) {
      if (!m.read) signals.push({ kind: 'message', document: m.path, from: m.from, why: `${m.from} wrote: ${m.body.split('\n')[0]!.slice(0, 80)}` })
    }
    const sooner = (t: number) => { if (t > now && (soonest === null || t < soonest)) soonest = t }

    for (const node of this.graph().nodes.values()) {
      if (node.metadata.owner !== agent) continue
      const heart = node.metadata.heart
      if (node.lifecycle === 'STALE' && heart?.status !== 'done') {
        signals.push({ kind: 'review_due', document: node.path, why: 'it is past its review date' })
      }
      if (!heart) continue

      const askedAt = iso(heart.asked_at)
      if (heart.status === 'waiting' && askedAt) {
        const after = duration(heart.follow_up_after)
        const due = after === null ? null : new Date(askedAt).getTime() + after
        if (due !== null && now >= due) {
          signals.push({
            kind: 'follow_up_due', document: node.path, waitingOn: heart.waiting_on, since: askedAt,
            why: `waiting on ${heart.waiting_on} since ${askedAt}, past the ${heart.follow_up_after} it said to follow up after`,
          })
        } else if (due !== null) sooner(due)
      }
      if (heart.status === 'open') signals.push({ kind: 'task', document: node.path, why: 'it is open work you own' })
      const nextBeat = iso(heart.next_beat)
      if (nextBeat) {
        const at = new Date(nextBeat).getTime()
        if (now >= at) signals.push({ kind: 'due', document: node.path, why: `it asked to be looked at by ${nextBeat}` })
        else sooner(at)
      }
      for (const watched of heart.watch ?? []) {
        const file = join(this.root, watched)
        const print = existsSync(file) ? fingerprint(readFileSync(file, 'utf-8')) : 'missing'
        if (watched in state.seen && state.seen[watched] !== print) {
          signals.push({ kind: 'watched_change', document: node.path, changed: watched, why: `${watched}, which it watches, changed` })
        }
        seen[watched] = print
      }
    }
    signals.sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind) || a.document.localeCompare(b.document))
    return { signals, seen, soonest }
  }

  /** One beat for one owner: pulse, take leases, wake and act if anything needs them, schedule the next, record it. */
  beat(agent: string, options: { stopAfter?: number } = {}): BeatResult {
    const open = this.open(agent)
    if (!open.wake || !this.runner) return this.close(open, [], options)
    const asked = this.runner.act(open.wake)
    if (asked instanceof Promise) {
      this.close(open, [], options, 'the runner answers asynchronously; beat it with beatAsync')
      throw new Error('this runner answers asynchronously: use beatAsync')
    }
    return this.close(open, asked, options)
  }

  /**
   * A beat for a runner that thinks slowly, such as a model. If it cannot be
   * reached, nothing is done, the beat is recorded with why, and whatever woke
   * the owner wakes them again next beat.
   */
  async beatAsync(agent: string, options: { stopAfter?: number } = {}): Promise<BeatResult> {
    const open = this.open(agent)
    if (!open.wake || !this.runner) return this.close(open, [], options)
    let asked: unknown[]
    try {
      asked = await this.runner.act(open.wake)
    } catch (err) {
      return this.close(open, [], options, `the runner could not be reached: ${err instanceof Error ? err.message : String(err)}`)
    }
    return this.close(open, asked, options)
  }

  /** Pulse, take leases, and say what the runner would be woken with. */
  private open(agent: string) {
    const at = this.now()
    const beatId = `${agent}:${at.toISOString()}`
    const state = this.load(agent)
    // what came of earlier asks is seen before anything else, whether or not anyone wakes
    const scored = observeAnswers(this.root, agent)
    const pulsed = this.pulse(agent, state)
    const stopped = existsSync(join(this.dir, 'STOP'))

    // a document another beat is acting on is left to it
    const signals: Signal[] = []
    const held: Signal[] = []
    const taken = new Set<string>()
    for (const s of pulsed.signals) {
      if (s.kind === 'message' || stopped) { signals.push(s); continue }
      if (taken.has(s.document) || take(this.root, s.document, agent, beatId, at, this.config.LEASE_TTL_MS)) {
        taken.add(s.document)
        signals.push(s)
      } else held.push(s)
    }

    const nodes = [...this.graph().nodes.values()].filter((n) => n.metadata.owner === agent)
    const owned = new Set(nodes.map((n) => n.path))
    const roleNode = nodes.find((n) => Array.isArray(n.metadata.agent?.can_ask))
    const canAsk = roleNode?.metadata.agent?.can_ask ?? null
    const woke = signals.length > 0 && !stopped
    let wake: Wake | null = null
    if (woke && this.runner) {
      // only what is the owner's: their unread messages, their role, their documents the signals name
      const text = (p: string) => readFileSync(join(this.root, p), 'utf-8').slice(0, 8000)
      wake = {
        agent, beatId, at: at.toISOString(), signals,
        messages: inbox(this.root, agent).filter((m) => !m.read),
        ...(roleNode ? { role: text(roleNode.path) } : {}),
        canAsk,
        documents: [...new Set(signals.filter((s) => s.kind !== 'message' && owned.has(s.document)).map((s) => s.document))].map((p) => ({ path: p, text: text(p) })),
      }
    }
    return { agent, at, beatId, state, pulsed, stopped, signals, held, taken, owned, canAsk, wake, scored }
  }

  /** Apply what the runner asked for, release the leases, schedule the next beat, and record this one. */
  private close(open: ReturnType<Heartbeat['open']>, asked: unknown[], options: { stopAfter?: number }, error?: string): BeatResult {
    const { agent, at, beatId, state, pulsed, stopped, signals, held, taken, owned, canAsk } = open
    const scored = [...open.scored]
    let actions: ActionOutcome[] = []
    if (open.wake && !error) {
      // a crash below leaves the leases to run out, so no other beat acts on a half-done document
      actions = applyActions({
        root: this.root, agent, beatId, now: at, owns: (d) => owned.has(d), held: taken, stopAfter: options.stopAfter,
        maxHops: this.config.MAX_HOPS, maxFollowUps: this.config.MAX_FOLLOW_UPS, canAsk,
        quietUntil: quietUntil(at, this.config.QUIET_HOURS, this.config.TIMEZONE),
      }, asked)
      scored.push(...this.keepScore(agent, at, owned, actions))
    }
    for (const d of taken) release(this.root, d, beatId)

    const found = signals.length > 0
    const interval = found ? this.config.INTERVAL_MIN_MS : Math.min(this.config.INTERVAL_MAX_MS, state.interval * this.config.BACKOFF)
    const next = Math.min(at.getTime() + interval, pulsed.soonest ?? Infinity)
    const result: BeatResult = {
      beatId, agent, at: at.toISOString(), signals, woke: found && !stopped, stopped, interval, nextBeat: new Date(next).toISOString(), held, actions,
      ...(error ? { error } : {}), scored,
    }
    this.save(agent, { interval, nextBeat: result.nextBeat, seen: pulsed.seen })
    mkdirSync(this.dir, { recursive: true })
    appendFileSync(join(this.dir, 'beats.jsonl'), JSON.stringify(result) + '\n')
    return result
  }

  /** Record the asks this beat made, and close the open asks of loops it had to bring to the person. */
  private keepScore(agent: string, at: Date, owned: ReadonlySet<string>, actions: ActionOutcome[]): Outcome[] {
    const scored: Outcome[] = []
    for (const a of actions) {
      const action = a.action as { type?: string; to?: string; re?: string }
      if (a.became === 'escalate' && action.re && owned.has(action.re)) {
        scored.push(...closeUnanswered(this.root, agent, action.re, at.toISOString()))
        continue
      }
      if (action.type !== 'ask' || a.outcome !== 'done' || a.became || !action.to || !action.re || !a.key) continue
      const heart = owned.has(action.re) ? (readDepFile(join(this.root, action.re)).dep as { type?: string; heart?: Record<string, unknown> }) : null
      const followUps = Number(heart?.heart?.follow_ups ?? 0)
      recordAsk(this.root, {
        id: a.key, agent, to: action.to, re: action.re,
        message: messagePath(action.to, a.key).split('/').pop()!.replace(/\.md$/, ''),
        askedAt: at.toISOString(),
        inTimeMs: duration(heart?.heart?.follow_up_after) ?? null,
        action: followUps > 0 ? 'follow-up' : 'ask',
        situation: askSituation({ to: action.to, type: heart?.type, followUps, at, timeZone: this.config.TIMEZONE }),
      })
    }
    return scored
  }

  /** Every outcome scored so far, oldest first. */
  outcomes(): Outcome[] {
    return outcomes(this.root)
  }

  /** Hold a document for a beat, as that beat would — so other beats leave it alone until the hold runs out. */
  hold(document: string, agent: string, beatId: string, ttlMs = this.config.LEASE_TTL_MS): boolean {
    return take(this.root, document, agent, beatId, this.now(), ttlMs)
  }

  /** Write to an owner, as a person or another owner would. */
  say(from: string, to: string, body: string, re?: string): Message {
    const at = this.now()
    return send(this.root, { from, to, kind: 'question', re, body, dedupe: `${from}|${to}|${at.toISOString()}|${body}`, at }).message
  }

  /** Something changed that concerns this owner: their next beat comes at the shortest interval. */
  interrupt(agent: string): { nextBeat: string; interval: number } {
    const state = this.load(agent)
    const interval = this.config.INTERVAL_MIN_MS
    const nextBeat = this.now().toISOString()
    this.save(agent, { ...state, interval, nextBeat })
    return { nextBeat, interval }
  }

  /** Turn the kill switch on or off: while on, owners are pulsed but never woken. */
  killSwitch(on: boolean): { stopped: boolean } {
    const file = join(this.dir, 'STOP')
    if (on) {
      mkdirSync(this.dir, { recursive: true })
      writeFileSync(file, '')
    } else if (existsSync(file)) rmSync(file)
    return { stopped: on }
  }

  /** When this owner's next beat is due, and the interval it was scheduled at. */
  schedule(agent: string): { nextBeat: string | null; interval: number } {
    const state = this.load(agent)
    return { nextBeat: state.nextBeat, interval: state.interval }
  }

  /** Every beat recorded, oldest first, and how many of them woke someone. */
  record(agent?: string): BeatRecord {
    const file = join(this.dir, 'beats.jsonl')
    const beats = existsSync(file)
      ? readFileSync(file, 'utf-8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as BeatResult).filter((b) => !agent || b.agent === agent)
      : []
    const wakes = beats.filter((b) => b.woke).length
    return { beats, wakes, wakeRatio: beats.length ? wakes / beats.length : 0 }
  }
}
