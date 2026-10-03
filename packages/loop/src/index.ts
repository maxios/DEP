/**
 * The loop engine. Phase A: a context game played on the reference maze, with
 * a store that only scored outcomes can strengthen.
 */
export { DEFAULTS, configWith, type Config } from './config'
export { Store, entryId, type StoreEvent, type EventBody } from './store'
export { read } from './read'
export { write, claimAction } from './write'
export { score, PAIN_ABOVE } from './scorer'
export { mazeKey, mazeKeyWithBearing, mazeSimilarity, mazeBearingSimilarity, bearing, featureSimilarity, keyText, type Similarity, type MazeKeying } from './key'
export { MockPlayer, loopErased, type Player, type PlayerView } from './players/mock'
export { playEpisode } from './env/maze'
export { playDay, type DayResult, type DayMetrics, type DayOptions } from './day'
export { loadCore, readPin, CorePinError, DEFAULT_CORE_PATH, type MazeCore } from './vendor/core'
export { canonical, fingerprint, deriveSeed } from './canonical'
export type * from './types'
