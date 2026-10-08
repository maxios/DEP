/**
 * Learning from what came of follow-ups.
 *
 * The heartbeat scores each ask from what was observed afterwards — answered
 * in time, answered late, never answered — and writes the scores to
 * `.pulse/outcomes.jsonl`. Here each score becomes an episode for the store,
 * exactly as a judged level does: the situation the owner was in when it
 * asked, the action it took, and a reward it had no hand in.
 *
 * What worked is proposed as advice for that situation ("choose follow-up");
 * what did not is never proposed, only counted against the baseline. Each
 * outcome is learned once: its episode id is the ask's id.
 *
 * The advice goes back the other way through `followUpAdvisor`: when a loop
 * falls due, the heartbeat asks it what has been learned about that situation
 * and shows the owner the claims — never their strengths — and records which
 * were in front of it. When that ask is scored, the advice it followed is
 * credited or blamed by the same write path a judged level uses.
 */
import { configWith, type Config } from './config'
import { featureSimilarity } from './key'
import { deriveSeed } from './canonical'
import { read } from './read'
import { loadCore } from './vendor/core'
import type { Store } from './store'
import { write } from './write'

/** An outcome as the heartbeat writes it; only these fields are read. */
export interface ScoredAsk {
  id: string
  action: string
  situation: Record<string, string>
  reward: number
  /** The advice that was in front of the owner when it asked. */
  read?: Array<{ id: string; share: number }>
}

/**
 * Whom, about what, how far in, and when. Whom outweighs the rest together:
 * what was learned about following up with one person says little about
 * another, so a claim about a different recipient falls below the similarity
 * a claim needs to be read (4 of 9 < 0.5). A rule that has dropped the
 * recipient still applies wherever it holds.
 */
export const followUpSimilarity = featureSimilarity({ recipient: 5, waiting_on: 1, follow_ups: 1, when: 1, type: 1 })

export function learnFromOutcomes(store: Store, scored: ScoredAsk[], options: { day?: number; config?: Partial<Config> } = {}): { learned: number; skipped: number } {
  const config = configWith(options.config)
  const seen = new Set(store.log.flatMap((e) => (e.body.type === 'episode' ? [e.body.episodeId] : [])))
  const day = options.day ?? Math.max(0, ...store.log.map((e) => e.body.day))
  let learned = 0
  for (const s of scored) {
    const episodeId = `follow-up:${s.id}`
    if (seen.has(episodeId) || typeof s.reward !== 'number' || !/^[a-z][a-z0-9-]*$/.test(s.action)) continue
    seen.add(episodeId)
    const key = { features: { ...s.situation } }
    write(store, {
      episodeId, day,
      traces: [{ step: 0, situation: key, entries: (s.read ?? []).filter((r) => store.entries.has(r.id)), action: s.action }],
      score: { reward: s.reward, pain: s.reward < 0, gain: s.reward > 0 },
      proposals: s.reward > 0 ? [{ kind: 'episode', key, claim: `choose ${s.action}` }] : [],
    }, config, followUpSimilarity)
    learned++
  }
  return { learned, skipped: scored.length - learned }
}

/** What has been learned about following up, for each loop that has fallen due: claim text and shares, best first. */
export function followUpAdvisor(store: Store, options: { config?: Partial<Config> } = {}) {
  const config = configWith(options.config)
  const core = loadCore()
  return {
    advise(loops: Array<{ document: string; situation: Record<string, string> }>) {
      return loops.map((loop) => {
        const shown = read(store, { features: { ...loop.situation } }, core.Rng(deriveSeed(loop.document, JSON.stringify(loop.situation))), config, followUpSimilarity)
        return { document: loop.document, advice: shown.entries.map((e) => ({ id: e.id, claim: e.claim, share: e.share })) }
      })
    },
  }
}
