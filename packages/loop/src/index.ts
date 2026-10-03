/**
 * The loop engine. Phase A: a context game played on the reference maze, with
 * a store that only scored outcomes can strengthen.
 */
export { DEFAULTS, configWith, type Config } from './config'
export { Store, entryId, type StoreEvent, type EventBody } from './store'
export { read } from './read'
export { write, claimAction } from './write'
export { score, PAIN_ABOVE } from './scorer'
export { mazeKey, mazeKeyWithBearing, mazeSimilarity, mazeBearingSimilarity, bearing, featureSimilarity, keyText, commonKey, covers, type Similarity, type MazeKeying } from './key'
export { endDay, type ClockOptions, type ClockReport } from './clock'
export { Instincts, instinctFor, type Adapter, type Instinct, type SftExample } from './adapter'
export { sleepNight, gate, select, MockTrainer, type Trainer, type TrainJob, type Dataset, type PreferencePair, type NightReport, type NightOptions, type GateVerdict } from './sleep'
export { MockPlayer, loopErased, type Player, type PlayerView } from './players/mock'
export { playEpisode } from './env/maze'
export { playDay, type DayResult, type DayMetrics, type DayOptions } from './day'
export { loadCore, readPin, CorePinError, DEFAULT_CORE_PATH, type MazeCore } from './vendor/core'
export { canonical, fingerprint, deriveSeed } from './canonical'
export type * from './types'
export { loadGame, GameError, type Game, type Level, type LoadedGame, type Scoring, type GameErrorCode } from './game/game'
export { judge, type Verdict } from './game/suite'
export { playSuiteDay, ChoosingPlayer, choicePath, refusal, type SuitePlayer, type SuiteView, type SuiteDayResult, type SuiteDayOptions, type SuiteEpisode, type Write } from './game/play'
