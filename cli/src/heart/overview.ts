/**
 * The heartbeat at a glance, for the console: read from what the heartbeat
 * already wrote — the beat record, the person's inbox, the scored outcomes —
 * without pulsing anyone or taking any lease. Looking never changes anything.
 */
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import type { ActionOutcome } from './actions'
import type { BeatResult, Signal } from './heartbeat'
import { inbox, type Message } from './inbox'
import { outcomes, type OutcomeKind } from './outcomes'

export interface OwnerGlance {
  owner: string
  lastBeat: string | null
  nextBeat: string | null
  interval: number | null
  woke: boolean
  /** What the last beat found. */
  signals: Signal[]
}

export interface HeartbeatOverview {
  today: { beats: number; wakes: number; wakeRatio: number }
  killSwitch: boolean
  owners: OwnerGlance[]
  /** Beats that did something or were refused, newest first. */
  recent: Array<{ beatId: string; agent: string; at: string; actions: ActionOutcome[]; error?: string }>
  /** What was brought to the person and not yet answered, oldest first. */
  waiting: Message[]
  outcomes: Record<OutcomeKind, number>
}

export function heartbeatOverview(root: string, owners: string[], now: Date): HeartbeatOverview {
  const file = join(root, '.pulse', 'beats.jsonl')
  const beats = existsSync(file) ? readFileSync(file, 'utf-8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as BeatResult) : []
  const day = now.toISOString().slice(0, 10)
  const todays = beats.filter((b) => b.at.startsWith(day))
  const wakes = todays.filter((b) => b.woke).length

  const last = new Map<string, BeatResult>()
  for (const b of beats) last.set(b.agent, b)
  const everyone = [...new Set([...owners, ...last.keys()])].sort()

  const scored = outcomes(root)
  return {
    today: { beats: todays.length, wakes, wakeRatio: todays.length ? wakes / todays.length : 0 },
    killSwitch: existsSync(join(root, '.pulse', 'STOP')),
    owners: everyone.map((owner) => {
      const b = last.get(owner)
      return { owner, lastBeat: b?.at ?? null, nextBeat: b?.nextBeat ?? null, interval: b?.interval ?? null, woke: b?.woke ?? false, signals: b?.signals ?? [] }
    }),
    recent: beats.filter((b) => b.actions.length || b.error).slice(-10).reverse()
      .map((b) => ({ beatId: b.beatId, agent: b.agent, at: b.at, actions: b.actions, ...(b.error ? { error: b.error } : {}) })),
    waiting: inbox(root, 'user', { now }).filter((m) => m.kind === 'escalation' && !m.read),
    outcomes: {
      answered: scored.filter((o) => o.kind === 'answered').length,
      'answered-late': scored.filter((o) => o.kind === 'answered-late').length,
      unanswered: scored.filter((o) => o.kind === 'unanswered').length,
    },
  }
}
