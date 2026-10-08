/**
 * What came of an ask — observed, then scored.
 *
 * The heartbeat is the Scorer's host: an outcome is not visible inside the
 * beat that asked, only in a later one. When an owner asks or follows up, the
 * ask is recorded as open. Every beat then looks in the owner's inbox for an
 * answer from the one asked, about the same document or message, sent after
 * the ask. An answer in time scores 1, a late one 0.5; a loop that had to be
 * brought to the person scores its open asks −0.5. Nothing the owner — or the
 * model deciding for it — says is read here; the score comes only from what
 * arrived and when.
 *
 * Outcomes are appended to `.pulse/outcomes.jsonl`, once each, for whatever
 * learns from them.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { inbox } from './inbox'

export type OutcomeKind = 'answered' | 'answered-late' | 'unanswered'

export const REWARDS: Record<OutcomeKind, number> = { answered: 1, 'answered-late': 0.5, unanswered: -0.5 }

/** What the agent knew when it asked: the situation an outcome is learned against. */
export type AskSituation = Record<string, string>

export interface OpenAsk {
  /** The action's key: beat, kind and target. */
  id: string
  agent: string
  to: string
  /** The document or message asked about. */
  re: string
  /** The question's own message id, which a reply names. */
  message: string
  askedAt: string
  /** How long an answer counts as in time; null when no follow-up time was set. */
  inTimeMs: number | null
  action: 'ask' | 'follow-up'
  situation: AskSituation
}

export interface Outcome {
  id: string
  agent: string
  to: string
  re: string
  action: OpenAsk['action']
  situation: AskSituation
  kind: OutcomeKind
  reward: number
  askedAt: string
  at: string
}

const asksFile = (root: string) => join(root, '.pulse', 'asks.json')
const outcomesFile = (root: string) => join(root, '.pulse', 'outcomes.jsonl')

function openAsks(root: string): Record<string, OpenAsk> {
  return existsSync(asksFile(root)) ? JSON.parse(readFileSync(asksFile(root), 'utf-8')) : {}
}

function saveAsks(root: string, asks: Record<string, OpenAsk>): void {
  mkdirSync(join(root, '.pulse'), { recursive: true })
  writeFileSync(asksFile(root), JSON.stringify(asks, null, 2) + '\n')
}

function score(root: string, ask: OpenAsk, kind: OutcomeKind, at: string): Outcome {
  const outcome: Outcome = { id: ask.id, agent: ask.agent, to: ask.to, re: ask.re, action: ask.action, situation: ask.situation, kind, reward: REWARDS[kind], askedAt: ask.askedAt, at }
  mkdirSync(join(root, '.pulse'), { recursive: true })
  appendFileSync(outcomesFile(root), JSON.stringify(outcome) + '\n')
  return outcome
}

/** Remember an ask so a later beat can see what came of it. Recording the same ask again changes nothing. */
export function recordAsk(root: string, ask: OpenAsk): void {
  const asks = openAsks(root)
  if (asks[ask.id] || outcomes(root).some((o) => o.id === ask.id)) return
  asks[ask.id] = ask
  saveAsks(root, asks)
}

/** Score every open ask of this owner that has been answered: by the one asked, about the same thing, after the ask. */
export function observeAnswers(root: string, agent: string): Outcome[] {
  const asks = openAsks(root)
  const mine = Object.values(asks).filter((a) => a.agent === agent)
  if (mine.length === 0) return []
  const received = inbox(root, agent)
  const scored: Outcome[] = []
  for (const ask of mine) {
    const answer = received.find((m) => m.from === ask.to && (m.re === ask.message || m.re === ask.re) && m.created_at > ask.askedAt)
    if (!answer) continue
    const waited = new Date(answer.created_at).getTime() - new Date(ask.askedAt).getTime()
    scored.push(score(root, ask, ask.inTimeMs === null || waited <= ask.inTimeMs ? 'answered' : 'answered-late', answer.created_at))
    delete asks[ask.id]
  }
  if (scored.length) saveAsks(root, asks)
  return scored
}

/** A loop brought to the person: every open ask about it went unanswered. */
export function closeUnanswered(root: string, agent: string, document: string, at: string): Outcome[] {
  const asks = openAsks(root)
  const scored: Outcome[] = []
  for (const ask of Object.values(asks)) {
    if (ask.agent !== agent || ask.re !== document) continue
    scored.push(score(root, ask, 'unanswered', at))
    delete asks[ask.id]
  }
  if (scored.length) saveAsks(root, asks)
  return scored
}

/** Every outcome scored so far, oldest first. */
export function outcomes(root: string): Outcome[] {
  return existsSync(outcomesFile(root))
    ? readFileSync(outcomesFile(root), 'utf-8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Outcome)
    : []
}

/** The situation an ask is learned against: whom, about what kind of document, how many follow-ups in, at what time of day. */
export function askSituation(o: { to: string; type?: string; followUps: number; at: Date; timeZone: string }): AskSituation {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: o.timeZone, hour: '2-digit', hourCycle: 'h23' }).format(o.at))
  const when = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  const waitingOn = o.to === 'user' ? 'person' : o.to.startsWith('test:') ? 'test' : o.to.startsWith('date:') ? 'date' : 'owner'
  return { recipient: o.to, waiting_on: waitingOn, follow_ups: o.followUps >= 3 ? '3+' : String(o.followUps), when, type: o.type ?? 'message' }
}
