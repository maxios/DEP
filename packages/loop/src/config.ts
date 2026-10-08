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
  // The spec's 0.7 refused any claim within 0.7 of one already held, and
  // folding needs claims at least MERGE_SIM alike: two claims alike enough to
  // fold could never both be stored, so no rule ever formed. A claim is now
  // refused only when one already held covers its situation exactly.
  // Measured in liveness-design.md.
  NOVEL: 1,
  DECAY: 0.02,
  S_PRUNE: 0.03,
  PRUNE_AGE: 7,
  // The spec's 0.85 never fires in the maze: two different maze keys are at most
  // 0.8 alike, and 0.7 when they differ only in the side the player came in by —
  // the case a rule should absorb. Measured in liveness-design.md.
  MERGE_SIM: 0.7,
  /** Acted on this often, and right as often as not, a claim is an exception no rule may fold over. */
  FOLD_EXCEPTION_ACTED: 5,
  /** Only claims acted on this often, and right as often as not, are folded into rules. */
  FOLD_MIN_ACTED: 5,
  K: 20,
  // The spec's gate — pain slope ≤ 0 and reward variance < 0.25 — shut on
  // healthy days (fresh mazes make rewards vary 0.22–0.40) and opened on
  // disasters (failing every maze is perfectly steady). The gate below asks
  // what maze-core's gate asks: is the player competent, and not deteriorating.
  //
  // Variance is off. It measures the environment, not the player: on the maze
  // how different the mazes were, in a pass/fail game the pass rate itself
  // (4p(1−p) — 0.91 at 65%). It never caught a bad day in either, and shut
  // every good day in the second. A game with continuous rewards may set it.
  // Measured in liveness-design.md.
  GATE_VAR: Number.POSITIVE_INFINITY,
  /** Late-day pain rate above this shuts the gate. */
  GATE_PAIN: 0.7,
  /** Late-day pain rate exceeding early-day pain rate by more than this shuts it. */
  GATE_DRIFT: 0.2,
  S_CONSOLIDATE: 0.6,
  N_MIN: 10,
  // Of the times a claim was acted on, how often the episode gained. Credit is
  // per episode, so this is capped near the day's success rate; strong claims
  // measured 0.39–0.65. Strength already measures advantage over no advice,
  // so the ratio only has to clear chance.
  GAIN_RATIO: 0.5,
  REPLAY_RATIO: 0.3,
  DELTA: 0.02,
  DISTILL_DECAY: 0.2,
  FORGET_DELTA: 0.03,
  EPISODES_PER_DAY: 50,
  /** Held-out mazes a night plays to check it has not made the player worse. */
  REGRESSION_MAZES: 20,
}

export type Config = typeof DEFAULTS

export function configWith(overrides: Partial<Config> = {}): Config {
  return { ...DEFAULTS, ...overrides }
}
