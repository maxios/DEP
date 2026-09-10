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
export type { EmbeddingProvider } from './embeddings/provider'
export { HashEmbeddingProvider } from './embeddings/hash'

export function openDocumentationSet(root: string, options: OpenOptions = {}): DocumentationSet {
  return new DocumentationSet(root, options)
}
