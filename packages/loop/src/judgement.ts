/**
 * A person's judgement, read back from the document of what the agent learned.
 *
 * The document is where the person argues with the agent, so their changes to
 * it are evidence the player could never produce (rule 2):
 *
 *   a line struck out   that claim is disowned — put away, and if it had
 *                       become a habit, the habit is dropped too
 *   a line added        in the document's own form ("When the X is Y:
 *                       **choose Z**.") becomes advice the agent is given,
 *                       and is then judged by the scenarios like any other
 *   anything else       is kept, word for word, as the person's notes
 *
 * Nothing is guessed. A line that looks like advice but names a feature the
 * game does not describe situations by, or a choice the game does not offer,
 * is kept as a note and reported as not understood.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { parse as parseYaml } from 'yaml'
import { Instincts } from './adapter'
import { configWith, type Config } from './config'
import { covers } from './key'
import { FRONT, hash, learnedBody } from './riverbed'
import { Store, entryId, type EntrySet } from './store'
import type { MemoryEntry } from './types'
import type { LoadedGame } from './game/game'
import { claimAction } from './write'

export interface JudgementOptions {
  store: Store
  loaded: LoadedGame
  root: string
  /** The learned document, relative to the root. */
  path: string
  /** Given, a habit struck out is dropped from the instincts as well. */
  instincts?: Instincts
  config?: Partial<Config>
}

export interface JudgementReport {
  /** False when there was nothing new to read: the document is as written, or was read already. */
  read: boolean
  disowned: string[]
  taught: string[]
  notes: string[]
  /** Lines that looked like advice but could not be read as advice. */
  notUnderstood: string[]
}

interface Said {
  features: Record<string, string>
  claim: string
}

const ADVICE = /^- (?:When (.+)|In every situation): \*\*(.+?)\*\*\.(?:\s.*)?$/

/** Read one line in the document's own form, or null when it is not one the game can mean. */
function parse(text: string, loaded: LoadedGame): Said | null {
  const m = ADVICE.exec(text.trim())
  if (!m) return null
  const features: Record<string, string> = {}
  if (m[1]) {
    for (const part of m[1].split(/, (?:and )?| and /)) {
      const f = /^the ([a-z][\w-]*) is (.+)$/.exec(part.trim())
      if (!f || !(f[1]! in loaded.game.situation)) return null
      features[f[1]!] = f[2]!
    }
  }
  const choice = /^choose ([a-z][a-z0-9-]*)$/.exec(m[2]!)
  if (!choice || !loaded.game.actions.options.includes(choice[1]!)) return null
  return { features, claim: m[2]! }
}

const sameFeatures = (a: Record<string, unknown>, b: Record<string, unknown>) => {
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort()
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && String(a[k]) === String(b[k]))
}

export function readJudgement(o: JudgementOptions): JudgementReport {
  const config = configWith(o.config)
  const nothing: JudgementReport = { read: false, disowned: [], taught: [], notes: [], notUnderstood: [] }
  const text = readFileSync(resolve(o.root, o.path), 'utf-8')
  const m = FRONT.exec(text)
  const fm = (m ? parseYaml(m[1]!) : null) as { learned?: { body?: string; written?: string[] } } | null
  const body = m ? text.slice(m[0].length) : text
  const read = hash(body)
  if (fm?.learned?.body === read || o.store.judged.has(read)) return nothing

  // the document's own words, which are never the person's
  const fixed = new Set(learnedBody(new Store(), o.loaded, config).split('\n').map((l) => l.trim()).filter(Boolean))
  fixed.add('_None yet._').add('_Nothing yet._')

  const said: Said[] = []
  const notes: string[] = []
  const notUnderstood: string[] = []
  for (const raw of body.split('\n')) {
    const l = raw.trim()
    if (!l || fixed.has(l)) continue
    const s = l.startsWith('- ') ? parse(l, o.loaded) : null
    if (s) said.push(s)
    else {
      if (ADVICE.test(l)) notUnderstood.push(l)
      notes.push(l)
    }
  }

  const matches = (e: MemoryEntry, s: Said) => e.claim === s.claim && sameFeatures(e.key.features, s.features)
  const disowned = (fm?.learned?.written ?? []).filter((id) => {
    const e = o.store.entries.get(id)
    return e && !e.archived && !said.some((s) => matches(e, s))
  })

  const day = Math.max(0, ...o.store.log.map((ev) => ev.body.day))
  const taught: MemoryEntry[] = []
  const retaught: EntrySet[] = []
  const written = new Set(fm?.learned?.written ?? [])
  for (const s of said) {
    const held = o.store.active().find((e) => matches(e, s))
    if (held) {
      // a line the agent wrote and the person kept is not news; one it held but never wrote is
      if (!written.has(held.id) && !held.taught) {
        retaught.push({ id: held.id, strength: Math.max(held.strength, config.S_CONSOLIDATE), reads: held.reads, gains: held.gains, pains: held.pains, lastReadDay: held.lastReadDay })
      }
      continue
    }
    const key = { features: s.features }
    const kind = Object.keys(s.features).length < Object.keys(o.loaded.game.situation).length ? 'rule' : 'episode'
    const id = entryId(kind, key, s.claim)
    if (taught.some((t) => t.id === id)) continue
    taught.push({
      id, kind, key, claim: s.claim, strength: config.S_CONSOLIDATE, reads: 0, gains: 0, pains: 0,
      createdDay: day, lastReadDay: day, parents: [], distilled: false, archived: false, taught: true,
    })
  }

  o.store.apply({ type: 'judgement', day, read, disowned, taught, retaught, notes })

  if (o.instincts && disowned.length) {
    const gone = disowned.map((id) => o.store.entries.get(id)!)
    const current = o.instincts.current()
    const kept = current.instincts.filter((i) => !disowned.includes(i.from))
    if (kept.length !== current.instincts.length) o.instincts.adopt(Instincts.version(o.instincts.next(), current.version, kept))
    // nor may a later night teach it again from what earlier nights kept
    for (const night of o.instincts.nights) {
      for (let i = night.length - 1; i >= 0; i--) {
        if (gone.some((g) => night[i]!.action === claimAction(g.claim) && covers(g.key, night[i]!.key))) night.splice(i, 1)
      }
    }
  }

  return { read: true, disowned, taught: [...taught.map((t) => t.id), ...retaught.map((r) => r.id)], notes, notUnderstood }
}
