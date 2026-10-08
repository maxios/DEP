/**
 * Actions: the only way a woken owner changes the project.
 *
 * Whatever runs the owner — a rule, later a model — returns a list; each item
 * is checked before anything is written. An action is refused, and recorded as
 * refused, when it is not one of the kinds below, names a document the owner
 * does not own, a document another beat holds, or a message that is not in the
 * owner's inbox.
 *
 * Every action has a key made of the beat, its kind and its target, so the
 * same action from the same beat is recognised however the list was ordered.
 * A message's file is named by its key; a document's heart keeps the keys of
 * the actions the latest beat applied to it. Run a beat again and everything
 * it already did is "already done".
 */
import { join } from 'path'
import { readDepFile, writeDepFile } from '../writer'
import { STATUSES, duration, type HeartStatus } from './heart'
import { existsSync } from 'fs'
import { inbox, markRead, messagePath, send, type Message } from './inbox'
import type { Signal } from './heartbeat'

export type Action =
  | { type: 'reply'; message: string; body: string }
  | { type: 'ask'; to: string; re: string; body: string }
  | { type: 'wait'; document: string; on: string; after: string }
  | { type: 'set_status'; document: string; status: HeartStatus }
  | { type: 'close_loop'; document: string; note: string }
  /** Bring a document or a message to the person. */
  | { type: 'escalate'; re: string; reason: string; urgent?: boolean }
  | { type: 'noop'; reason: string }

export const ACTION_TYPES = ['reply', 'ask', 'wait', 'set_status', 'close_loop', 'escalate', 'noop'] as const

/** What the runner is given when an owner is woken. */
export interface Wake {
  agent: string
  beatId: string
  at: string
  signals: Signal[]
  /** Unread messages in the owner's inbox. */
  messages: Message[]
  /** The body of the owner's role document, if they have one. */
  role?: string
  /** Whom the owner's role allows them to ask; null when no role says. */
  canAsk?: string[] | null
  /** The owner's documents the signals are about, as they stand. */
  documents?: Array<{ path: string; text: string }>
  /** What the agent has learned about each loop that has fallen due: claim text only, best first. */
  advice?: Array<{ document: string; claims: string[] }>
}

export interface Runner {
  /** The actions to take. A runner that thinks slowly, such as a model, returns a promise; beat it with `beatAsync`. */
  act(wake: Wake): unknown[] | Promise<unknown[]>
}

export interface ActionOutcome {
  action: unknown
  key?: string
  outcome: 'done' | 'already done' | 'refused'
  reason?: string
  /** A guardrail turned it into an escalation to the person. */
  became?: 'escalate'
}

/** Rules, no model: answer what was asked, follow up what is due, take up open work. */
export class MockRunner implements Runner {
  act(wake: Wake): Action[] {
    const actions: Action[] = []
    for (const s of wake.signals) {
      if (s.kind === 'message') {
        const m = wake.messages.find((x) => x.path === s.document)
        if (m) actions.push({ type: 'reply', message: m.id, body: `Received: ${m.body.split('\n')[0]}` })
      } else if (s.kind === 'follow_up_due' && s.waitingOn) {
        actions.push({ type: 'ask', to: s.waitingOn, re: s.document, body: `Following up on ${s.document}: is there an answer yet?` })
      } else if (s.kind === 'task') {
        actions.push({ type: 'set_status', document: s.document, status: 'active' })
      }
    }
    return actions
  }
}

export interface ActContext {
  root: string
  agent: string
  beatId: string
  now: Date
  owns: (document: string) => boolean
  /** Documents this beat holds the lease on. */
  held: ReadonlySet<string>
  /** Stop, as a crash would, after this many files have been written. */
  stopAfter?: number
  /** Messages between owners an exchange may have before it comes to the person. */
  maxHops: number
  /** Follow-ups a loop gets, unless its heart says otherwise, before it comes to the person. */
  maxFollowUps: number
  /** Whom this owner's role allows them to ask; null when no role says. */
  canAsk: string[] | null
  /** When the person's quiet hours end, if they are in them now. */
  quietUntil: Date | null
}

const text = (v: unknown, max = 4000) => typeof v === 'string' && v.length > 0 && v.length <= max

/** The action, if it is a well-formed one of the allowed kinds; otherwise why not. */
function check(raw: unknown): Action | string {
  if (!raw || typeof raw !== 'object') return 'it is not an action'
  const a = raw as Record<string, unknown>
  if (!ACTION_TYPES.includes(a.type as (typeof ACTION_TYPES)[number])) return `"${String(a.type)}" is not one of ${ACTION_TYPES.join(', ')}`
  switch (a.type) {
    case 'reply': return text(a.message, 200) && text(a.body) ? (a as Action) : 'a reply names the message and says something'
    case 'ask': return text(a.to, 200) && text(a.re, 500) && text(a.body) ? (a as Action) : 'an ask names who, about what, and says something'
    case 'wait': return text(a.document, 500) && text(a.on, 200) && duration(a.after) !== null ? (a as Action) : 'a wait names the document, on whom, and a duration'
    case 'set_status': return text(a.document, 500) && STATUSES.includes(a.status as HeartStatus) ? (a as Action) : `a status is one of ${STATUSES.join(', ')}`
    case 'close_loop': return text(a.document, 500) && text(a.note) ? (a as Action) : 'closing a loop names the document and says why'
    case 'escalate': return text(a.re, 500) && text(a.reason) && (a.urgent === undefined || typeof a.urgent === 'boolean') ? (a as Action) : 'an escalation names what it is about and why'
    default: return text(a.reason) ? (a as Action) : 'a noop says why'
  }
}

/** Change a document's heart, unless this beat already made this change to it. */
function changeHeart(ctx: ActContext, document: string, key: string, change: (heart: Record<string, unknown>) => void, writing: () => void): 'done' | 'already done' {
  const file = join(ctx.root, document)
  const data = readDepFile(file)
  const heart = { ...(data.dep.heart ?? {}) } as Record<string, unknown>
  const acted = heart.acted as { beat?: string; keys?: string[] } | undefined
  const keys = acted?.beat === ctx.beatId ? [...(acted.keys ?? [])] : []
  if (keys.includes(key)) return 'already done'
  writing()
  change(heart)
  heart.acted = { beat: ctx.beatId, keys: [...keys, key] }
  data.dep.heart = heart
  writeDepFile(file, data)
  return 'done'
}

export function applyActions(ctx: ActContext, list: unknown[]): ActionOutcome[] {
  const outcomes: ActionOutcome[] = []
  const mine = inbox(ctx.root, ctx.agent)
  let written = 0
  const writing = () => {
    if (ctx.stopAfter !== undefined && written >= ctx.stopAfter) throw new Error(`the beat stopped after ${written} writes`)
    written++
  }
  const sendOnce = (m: Parameters<typeof send>[1]) => {
    if (existsSync(join(ctx.root, messagePath(m.to, m.dedupe)))) return send(ctx.root, m)
    writing()
    return send(ctx.root, m)
  }
  const may = (document: string): string | null =>
    !ctx.owns(document) ? `${ctx.agent} does not own ${document}`
      : !ctx.held.has(document) ? `another beat holds ${document}, or this beat never took it`
      : null

  // the person can always be brought a loop; at night it waits until morning unless it is urgent
  const toPerson = (re: string, body: string, key: string, urgent = false, thread?: string) =>
    sendOnce({ from: ctx.agent, to: 'user', kind: 'escalation', re, body, dedupe: `${key}|escalate`, at: ctx.now, urgent, deliverAt: urgent ? null : ctx.quietUntil, thread })
  const escalateDocument = (document: string, reason: string, key: string, urgent = false) => {
    const { sent } = toPerson(document, reason, key, urgent)
    const changed = changeHeart(ctx, document, key, (h) => { h.status = 'escalated'; h.escalated = reason }, writing)
    return sent || changed === 'done' ? 'done' : 'already done'
  }

  for (const raw of Array.isArray(list) ? list : []) {
    const a = check(raw)
    if (typeof a === 'string') { outcomes.push({ action: raw, outcome: 'refused', reason: a }); continue }

    const target = a.type === 'reply' ? a.message : a.type === 'ask' ? `${a.to}|${a.re}` : a.type === 'noop' ? a.reason : a.type === 'escalate' ? a.re : a.document
    const key = `${ctx.beatId}|${a.type}|${target}`
    let outcome: ActionOutcome['outcome']
    let became: ActionOutcome['became']
    let reason: string | undefined

    if (a.type === 'noop') {
      outcomes.push({ action: a, key, outcome: 'done' })
      continue
    }
    if (a.type === 'reply') {
      const original = mine.find((m) => m.id === a.message)
      if (!original) { outcomes.push({ action: a, key, outcome: 'refused', reason: `${a.message} is not in ${ctx.agent}'s inbox` }); continue }
      // an exchange between owners that has gone on long enough comes to the person instead
      const hops = original.from === 'user' ? 1 : (original.hops ?? 1) + 1
      if (original.from !== 'user' && hops >= ctx.maxHops) {
        reason = `the exchange between ${ctx.agent} and ${original.from} reached ${ctx.maxHops} messages without settling`
        outcome = toPerson(original.id, reason, key, false, original.thread).sent ? 'done' : 'already done'
        became = 'escalate'
      } else {
        const { sent } = sendOnce({ from: ctx.agent, to: original.from, kind: 'answer', re: original.id, body: a.body, dedupe: key, at: ctx.now, thread: original.thread ?? original.id, hops })
        outcome = sent ? 'done' : 'already done'
      }
      markRead(ctx.root, original)
    } else if (a.type === 'ask') {
      // asking about one of my documents that waits on the same someone is a follow-up of it
      const followUp = ctx.owns(a.re)
      if (followUp) {
        const why = may(a.re)
        if (why) { outcomes.push({ action: a, key, outcome: 'refused', reason: why }); continue }
        // a loop followed up enough comes to the person, whom any role may bring it to
        const heart = (readDepFile(join(ctx.root, a.re)).dep.heart ?? {}) as Record<string, unknown>
        const allowed = Number(heart.max_follow_ups ?? ctx.maxFollowUps)
        if (heart.status === 'waiting' && heart.waiting_on === a.to && Number(heart.follow_ups ?? 0) >= allowed) {
          reason = `${a.re} has waited on ${a.to} through ${allowed} follow-ups without an answer`
          outcomes.push({ action: a, key, outcome: escalateDocument(a.re, reason, key), became: 'escalate', reason })
          continue
        }
      }
      if (a.to !== 'user' && ctx.canAsk && !ctx.canAsk.includes(a.to)) {
        outcomes.push({ action: a, key, outcome: 'refused', reason: `${ctx.agent}'s role allows asking only ${ctx.canAsk.length ? ctx.canAsk.join(', ') : 'no one'}` })
        continue
      }
      const { sent } = sendOnce({ from: ctx.agent, to: a.to, kind: 'question', re: a.re, body: a.body, dedupe: key, at: ctx.now })
      let changed: 'done' | 'already done' = 'already done'
      if (followUp) {
        changed = changeHeart(ctx, a.re, key, (h) => {
          if (h.status === 'waiting' && h.waiting_on === a.to) h.follow_ups = Number(h.follow_ups ?? 0) + 1
          else { h.status = 'waiting'; h.waiting_on = a.to; h.follow_ups = 0 }
          h.asked_at = ctx.now.toISOString()
        }, writing)
      }
      outcome = sent || changed === 'done' ? 'done' : 'already done'
    } else if (a.type === 'escalate') {
      const message = mine.find((m) => m.id === a.re)
      if (message) {
        outcome = toPerson(message.id, a.reason, key, a.urgent === true, message.thread).sent ? 'done' : 'already done'
        markRead(ctx.root, message)
      } else {
        const why = may(a.re)
        if (why) { outcomes.push({ action: a, key, outcome: 'refused', reason: `${why}; an escalation is about one of your documents or a message to you` }); continue }
        outcome = escalateDocument(a.re, a.reason, key, a.urgent === true)
      }
    } else {
      const why = may(a.document)
      if (why) { outcomes.push({ action: a, key, outcome: 'refused', reason: why }); continue }
      outcome = changeHeart(ctx, a.document, key, (h) => {
        if (a.type === 'set_status') h.status = a.status
        else if (a.type === 'close_loop') { h.status = 'done'; h.closed = a.note; delete h.waiting_on }
        else { h.status = 'waiting'; h.waiting_on = a.on; h.asked_at = ctx.now.toISOString(); h.follow_up_after = a.after; h.follow_ups = 0 }
      }, writing)
    }
    outcomes.push({ action: a, key, outcome, ...(became ? { became, reason } : {}) })
  }
  return outcomes
}
