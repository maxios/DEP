/**
 * The embeddable surface of DEP. Open a documentation set once, then ask it
 * for budgeted context bundles, searches, the graph, validation verdicts or
 * metadata — as values. Nothing here prints, and nothing here exits the
 * process: failures are thrown as DepError.
 */
import { DocumentationSet } from './context/set'
import type { OpenOptions } from './context/types'

export { DocumentationSet } from './context/set'
export { DepError } from './context/errors'
export type { DepErrorCode } from './context/errors'
export type {
  Bundle, Passage, PassageReason, PassageFreshness, Withheld, Omitted, Notice,
  ContextOptions, FreshnessPreference, FreshnessState, IndexOptions, IndexReport, OpenOptions,
  SearchOptions, SearchResults, DocumentMetadata,
} from './context/types'
export type { ValidationReport, ValidationResult } from './commands/validate'
export { ProcedureSession } from './context/procedure'
export type { ProcedureStep, ProcedureStepOptions, SupportPassage, ProcedureSessionState } from './context/procedure'
export type { UsageReceipt, UsageReport } from './context/usage'
export type { TraceEntry, TraceKind, TraceOffered, TraceReceipt, TraceReport } from './context/trace'
export type { Amendment, AmendChange, AmendResult } from './context/amend'
export type { Proposal } from './context/proposals'
export { Heartbeat, HEARTBEAT_DEFAULTS } from './heart/heartbeat'
export type { BeatResult, BeatRecord, Signal, SignalKind, HeartbeatConfig, Advisor } from './heart/heartbeat'
export type { Heart, HeartStatus } from './heart/heart'
export { MockRunner, ACTION_TYPES } from './heart/actions'
export type { Action, ActionOutcome, Runner, Wake } from './heart/actions'
export { inbox } from './heart/inbox'
export { REWARDS, askSituation } from './heart/outcomes'
export type { Outcome, OutcomeKind, OpenAsk, AskSituation } from './heart/outcomes'
export { ClaudeRunner, wakePrompt, anthropicActions } from './heart/runners/claude'
export type { WakePrompt, AskActions } from './heart/runners/claude'
export type { Message, MessageKind } from './heart/inbox'
export type { EmbeddingProvider } from './embeddings/provider'
export { HashEmbeddingProvider } from './embeddings/hash'

export function openDocumentationSet(root: string, options: OpenOptions = {}): DocumentationSet {
  return new DocumentationSet(root, options)
}
