/**
 * What counts as "the same situation" — rule 7, the ceiling. Generalisation is
 * bounded by this function, so it is pluggable, and the maze's version is just
 * one of them.
 */
import type { SituationKey } from './types'

export type Similarity = (a: SituationKey, b: SituationKey) => number

/**
 * Weighted feature match: the share of weight on features that agree.
 *
 * `a` is the situation, `b` the stored key. A feature the stored key leaves out
 * matches anything — that is what a rule is: a claim that kept only what its
 * situations had in common, and so applies wherever those features hold.
 */
export function featureSimilarity(weights: Record<string, number>): Similarity {
  return (a, b) => {
    let total = 0
    let agree = 0
    for (const [feature, weight] of Object.entries(weights)) {
      total += weight
      if (!(feature in b.features) || a.features[feature] === b.features[feature]) agree += weight
    }
    return total === 0 ? 0 : agree / total
  }
}

/** The features every key agrees on — a rule's key. */
export function commonKey(keys: SituationKey[]): SituationKey {
  const [first, ...rest] = keys
  if (!first) return { features: {} }
  const features: Record<string, string | number | boolean> = {}
  for (const [feature, value] of Object.entries(first.features)) {
    if (rest.every((k) => k.features[feature] === value)) features[feature] = value
  }
  return { features }
}

/** True when every feature of the general key holds in the specific one. */
export function covers(general: SituationKey, specific: SituationKey): boolean {
  return Object.entries(general.features).every(([feature, value]) => specific.features[feature] === value)
}

/**
 * The maze presents which of N, E, S, W are walled and which way the player
 * came in. Walls are the situation; the entry side refines it. The weights say
 * a cell with the same walls is mostly the same situation whichever way it was
 * entered, which is what lets a claim reach beyond the cell it was learned in.
 */
export function mazeKey(situation: string): SituationKey {
  const [walls = '', from = '-'] = situation.split(':')
  return { features: { walls, from } }
}

export const mazeSimilarity = featureSimilarity({ walls: 0.7, from: 0.3 })

/** Which way the goal lies from a cell, as compass letters: 'SE', 'N', '' at the goal. */
export function bearing(x: number, y: number, goal: [number, number]): string {
  return (goal[1] > y ? 'S' : goal[1] < y ? 'N' : '') + (goal[0] > x ? 'E' : goal[0] < x ? 'W' : '')
}

/**
 * A richer key: the walls, the entry side, and which way the goal lies. A claim
 * about a crossroads can now say something about where it leads, which the
 * bare key cannot — the measured difference between the two is rule 7.
 */
export function mazeKeyWithBearing(situation: string, goalBearing: string): SituationKey {
  const base = mazeKey(situation)
  return { features: { ...base.features, bearing: goalBearing } }
}

export const mazeBearingSimilarity = featureSimilarity({ walls: 0.5, bearing: 0.3, from: 0.2 })

/** The two keys this engine knows for the maze. */
export type MazeKeying = 'situation' | 'situation+bearing'

export function keyText(key: SituationKey): string {
  return Object.keys(key.features).sort().map((k) => `${k}=${key.features[k]}`).join(' ')
}
