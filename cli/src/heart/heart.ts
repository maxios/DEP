/**
 * A document's heart: the optional `heart:` block inside `dep:` that makes it
 * an open loop — what it is waiting on, since when, and when its owner should
 * look again. A document without one is passive: it can be watched, but it
 * never wakes anyone on its own.
 *
 * The owner is the document's own `owner`; the heart does not repeat it.
 */

export type HeartStatus = 'open' | 'active' | 'waiting' | 'blocked' | 'done' | 'escalated'
export const STATUSES: HeartStatus[] = ['open', 'active', 'waiting', 'blocked', 'done', 'escalated']

export interface Heart {
  status: HeartStatus
  /** An owner id, `user`, `test:<id>` or `date:<iso>`. */
  waiting_on?: string
  asked_at?: string
  /** A duration: `30m`, `4h`, `2d`. */
  follow_up_after?: string
  follow_ups?: number
  max_follow_ups?: number
  /** Documents whose changes should wake this one's owner, relative to the project root. */
  watch?: string[]
  next_beat?: string
}

const UNIT: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }

/** A duration in milliseconds, or null when it is not one. */
export function duration(text: unknown): number | null {
  const m = typeof text === 'string' ? /^(\d+(?:\.\d+)?)\s*([smhd])$/.exec(text.trim()) : null
  return m ? Number(m[1]) * UNIT[m[2]!]! : null
}

const isDate = (v: unknown) => (typeof v === 'string' || v instanceof Date) && !isNaN(new Date(v).getTime())

/** A date as written in frontmatter — YAML reads an unquoted timestamp as a Date — in ISO form. */
export function iso(v: unknown): string | undefined {
  return isDate(v) ? new Date(v as string | Date).toISOString() : undefined
}

/** Everything wrong with a heart block, as sentences; empty when it makes sense. */
export function heartProblems(heart: unknown, exists: (path: string) => boolean): string[] {
  if (heart === undefined) return []
  if (!heart || typeof heart !== 'object' || Array.isArray(heart)) return ['the heart is not a block of fields']
  const h = heart as Record<string, unknown>
  const problems: string[] = []
  if (!STATUSES.includes(h.status as HeartStatus)) problems.push(`status "${String(h.status)}" is not one of ${STATUSES.join(', ')}`)
  if (h.status === 'waiting') {
    if (typeof h.waiting_on !== 'string' || !h.waiting_on) problems.push('it is waiting, but not waiting on anyone or anything')
    if (!isDate(h.asked_at)) problems.push('it is waiting, but does not say since when (asked_at)')
  }
  if (typeof h.waiting_on === 'string' && h.waiting_on.startsWith('date:') && !isDate(h.waiting_on.slice(5))) {
    problems.push(`waiting on "${h.waiting_on}", which is not a date`)
  }
  if (h.follow_up_after !== undefined && duration(h.follow_up_after) === null) {
    problems.push(`follow_up_after "${String(h.follow_up_after)}" is not a duration like 30m, 4h or 2d`)
  }
  for (const f of ['asked_at', 'next_beat'] as const) {
    if (h[f] !== undefined && !isDate(h[f])) problems.push(`${f} "${String(h[f])}" is not a date`)
  }
  for (const f of ['follow_ups', 'max_follow_ups'] as const) {
    if (h[f] !== undefined && !(Number.isInteger(h[f]) && (h[f] as number) >= 0)) problems.push(`${f} "${String(h[f])}" is not a whole number`)
  }
  if (h.watch !== undefined) {
    if (!Array.isArray(h.watch)) problems.push('watch is not a list of documents')
    else for (const w of h.watch) if (typeof w !== 'string' || !exists(w)) problems.push(`it watches "${String(w)}", which does not exist`)
  }
  return problems
}
