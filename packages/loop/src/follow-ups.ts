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
 */
import { configWith, type Config } from './config'
import { featureSimilarity } from './key'
import type { Store } from './store'
import { write } from './write'

/** An outcome as the heartbeat writes it; only these fields are read. */
export interface ScoredAsk {
  id: string
  action: string
  situation: Record<string, string>
  reward: number
}

/** Whom, about what, how far in, and when — each counted the same. */
export const followUpSimilarity = featureSimilarity({ recipient: 1, waiting_on: 1, follow_ups: 1, when: 1, type: 1 })

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
      traces: [{ step: 0, situation: key, entries: [], action: s.action }],
      score: { reward: s.reward, pain: s.reward < 0, gain: s.reward > 0 },
      proposals: s.reward > 0 ? [{ kind: 'episode', key, claim: `choose ${s.action}` }] : [],
    }, config, followUpSimilarity)
    learned++
  }
  return { learned, skipped: scored.length - learned }
}
