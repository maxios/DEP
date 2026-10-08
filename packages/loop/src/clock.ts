/**
 * The day clock — what happens to the store between days (rule 3: memory is
 * lossy on purpose).
 *
 *   fade      a claim nobody read today loses a little strength
 *   put away  a claim faded below use, and old enough to have been judged,
 *             is archived — never deleted, so its history survives
 *   fold      claims giving the same advice about situations that look alike
 *             become one rule, keyed by only what those situations share
 *
 * Folding is the step that turns specific memory into general memory: a rule
 * drops the features its claims disagreed on, so it applies to situations none
 * of them was learned in. Everything here is one event in the store's record,
 * so the store after a day can still be rebuilt from the record alone.
 */
import type { Config } from './config'
import { commonKey, covers, type Similarity } from './key'
import { entryId, type EntrySet, type Store } from './store'
import type { MemoryEntry } from './types'
import { claimAction } from './write'

export interface ClockOptions {
  fade?: boolean
  putAway?: boolean
  fold?: boolean
}

export interface ClockReport {
  faded: number
  putAway: number
  rules: number
  folded: number
}

/** A rule's strength: its members' strengths, weighted by how often each was read. */
function weighted(members: MemoryEntry[]): number {
  const reads = members.reduce((sum, m) => sum + m.reads, 0)
  if (reads === 0) return members.reduce((sum, m) => sum + m.strength, 0) / members.length
  return members.reduce((sum, m) => sum + m.strength * m.reads, 0) / reads
}

function ruleFrom(members: MemoryEntry[], existing: MemoryEntry | undefined, key: MemoryEntry['key'], claim: string, day: number): MemoryEntry {
  const all = existing ? [existing, ...members] : members
  const parents = new Set<string>(existing?.parents ?? [])
  for (const m of members) parents.add(m.id)
  return {
    id: existing?.id ?? entryId('rule', key, claim),
    kind: 'rule',
    key,
    claim,
    strength: weighted(all),
    reads: all.reduce((sum, m) => sum + m.reads, 0),
    gains: all.reduce((sum, m) => sum + m.gains, 0),
    pains: all.reduce((sum, m) => sum + m.pains, 0),
    createdDay: existing?.createdDay ?? day,
    lastReadDay: Math.max(...all.map((m) => m.lastReadDay)),
    parents: [...parents].sort(),
    distilled: false,
    archived: false,
  }
}

export function endDay(store: Store, day: number, config: Config, sim: Similarity, options: ClockOptions = {}): ClockReport {
  const { fade = true, putAway = true, fold = true } = options
  const byId = (a: MemoryEntry, b: MemoryEntry) => a.id.localeCompare(b.id)

  // work on copies, so the store changes only through the event below
  const working = new Map<string, MemoryEntry>()
  for (const entry of store.active().sort(byId)) working.set(entry.id, { ...entry })

  const sets: EntrySet[] = []
  let faded = 0
  if (fade) {
    for (const entry of working.values()) {
      // an absorbed claim leaves context on its own clock, read or not
      if (entry.distilled) entry.strength *= 1 - config.DISTILL_DECAY
      else if (entry.lastReadDay === day) continue
      else entry.strength *= 1 - config.DECAY
      sets.push({ id: entry.id, strength: entry.strength, reads: entry.reads, gains: entry.gains, pains: entry.pains, lastReadDay: entry.lastReadDay })
      faded++
    }
  }

  const archive: string[] = []
  if (putAway) {
    for (const entry of working.values()) {
      if (entry.strength < config.S_PRUNE && day - entry.createdDay > config.PRUNE_AGE) {
        archive.push(entry.id)
        working.delete(entry.id)
      }
    }
  }

  const rules = new Map<string, MemoryEntry>()
  let folded = 0
  if (fold) {
    const episodes = () => [...working.values()].filter((e) => e.kind === 'episode').sort(byId)

    // claims an existing rule already covers are folded into it
    for (const rule of [...working.values()].filter((e) => e.kind === 'rule').sort(byId)) {
      const members = episodes().filter((e) => !e.distilled && e.claim === rule.claim && covers(rule.key, e.key))
      if (members.length === 0) continue
      const next = ruleFrom(members, rules.get(rule.id) ?? rule, rule.key, rule.claim, day)
      rules.set(next.id, next)
      working.set(next.id, next)
      for (const m of members) {
        archive.push(m.id)
        working.delete(m.id)
        folded++
      }
    }

    // the rest are grouped: same advice, situations alike enough. Rules group
    // too, so a rule can keep growing more general a day at a time — but a
    // group never grows past a known exception: a proven claim advising
    // something else in a situation the new rule would cover.
    const alike = (a: MemoryEntry, b: MemoryEntry) => Math.max(sim(a.key, b.key), sim(b.key, a.key))
    const exceptions = (claim: string) => [...working.values()].filter((e) =>
      e.claim !== claim && !e.distilled && claimAction(e.claim) !== null &&
      e.gains + e.pains >= config.FOLD_EXCEPTION_ACTED && e.gains / (e.gains + e.pains) >= config.GAIN_RATIO)
    const proved = (e: MemoryEntry) => e.gains + e.pains >= config.FOLD_MIN_ACTED && e.gains / Math.max(1, e.gains + e.pains) >= config.GAIN_RATIO
    const foldable = () => [...working.values()].filter((e) => (e.kind === 'episode' || e.kind === 'rule') && !e.distilled && proved(e)).sort(byId)
    const taken = new Set<string>()
    for (const seed of foldable()) {
      if (taken.has(seed.id) || !working.has(seed.id)) continue
      const known = exceptions(seed.claim)
      const group = [seed]
      for (const e of foldable()) {
        if (e.id === seed.id || taken.has(e.id) || e.claim !== seed.claim || alike(seed, e) < config.MERGE_SIM) continue
        const key = commonKey([...group, e].map((g) => g.key))
        if (known.some((x) => covers(key, x.key))) continue
        group.push(e)
      }
      if (group.length < 2) continue
      const key = commonKey(group.map((g) => g.key))
      if (Object.keys(key.features).length === 0) continue // a rule about everything says nothing
      const id = entryId('rule', key, seed.claim)
      const members = group.filter((g) => g.id !== id)
      const next = ruleFrom(members, rules.get(id) ?? working.get(id) ?? store.entries.get(id), key, seed.claim, day)
      rules.set(next.id, next)
      for (const m of members) {
        taken.add(m.id)
        archive.push(m.id)
        working.delete(m.id)
        folded++
      }
      taken.add(next.id)
      working.set(next.id, next)
    }
  }

  // a fade recorded for an entry that was then folded away is harmless, but a
  // rule's own fade is superseded by the rule written below
  const ruleIds = new Set(rules.keys())
  store.apply({
    type: 'day-end',
    day,
    sets: sets.filter((s) => !ruleIds.has(s.id)),
    rules: [...rules.values()].sort(byId),
    archive: [...new Set(archive)].sort(),
  })
  return { faded, putAway: archive.length - folded, rules: rules.size, folded }
}
