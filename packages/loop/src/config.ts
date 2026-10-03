/**
 * Starting points from the context-game spec (§14). Each is meant to be tuned
 * against measured runs; where a value here differs from the spec, the reason
 * is next to it.
 */
export const DEFAULTS = {
  TOKEN_BUDGET: 800,
  TOP_K: 8,
  EPS: 0.1,
  SIM_MIN: 0.5,
  LR: 0.05,
  S_INIT: 0.1,
  S_MAX: 1.0,
  SURPRISE: 0.5,
  NOVEL: 0.7,
  DECAY: 0.02,
  S_PRUNE: 0.03,
  PRUNE_AGE: 7,
  // The spec's 0.85 never fires in the maze: two different maze keys are at most
  // 0.8 alike, and 0.7 when they differ only in the side the player came in by —
  // the case a rule should absorb. Measured in liveness-design.md.
  MERGE_SIM: 0.7,
  K: 20,
  GATE_VAR: 0.25,
  S_CONSOLIDATE: 0.6,
  N_MIN: 10,
  GAIN_RATIO: 0.7,
  REPLAY_RATIO: 0.3,
  DELTA: 0.02,
  DISTILL_DECAY: 0.2,
  FORGET_DELTA: 0.03,
  EPISODES_PER_DAY: 50,
}

export type Config = typeof DEFAULTS

export function configWith(overrides: Partial<Config> = {}): Config {
  return { ...DEFAULTS, ...overrides }
}
