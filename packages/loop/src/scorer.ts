/**
 * The Scorer — rule 2's sole authority. It is handed facts by the environment
 * (did the player reach the goal, in how many moves, against what shortest
 * path) and nothing by the player. There is no parameter through which a
 * player could reach it.
 */
import type { Score } from './types'

export interface Outcome {
  reached: boolean
  moves: number
  shortest: number
}

/** A run longer than this multiple of the shortest path counts as falling short. */
export const PAIN_ABOVE = 3

export function score(outcome: Outcome): Score {
  if (!outcome.reached || outcome.moves <= 0) return { reward: -1, pain: true, gain: false }
  const efficiency = Math.min(1, outcome.shortest / outcome.moves)
  // 2e − 1: a perfect run is +1, twice the shortest path is 0, failing is −1
  const reward = 2 * efficiency - 1
  const pain = outcome.moves > PAIN_ABOVE * outcome.shortest
  return { reward, pain, gain: !pain }
}
