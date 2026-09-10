export type DepErrorCode =
  | 'NOT_A_DIRECTORY'
  | 'CONFIG_MISSING'
  | 'INVALID_BUDGET'
  | 'INVALID_FRESHNESS'
  | 'INVALID_DEPTH'
  | 'INVALID_OPTION'
  | 'UNKNOWN_AUDIENCE'
  | 'NO_AUDIENCES'
  | 'INVALID_TYPE'
  | 'PROVENANCE_REQUIRED'
  | 'PROVIDER_MISMATCH'
  | 'CREDENTIAL_MISSING'
  | 'OUTSIDE_SET'
  | 'TREE_NOT_FOUND'
  | 'NODE_NOT_FOUND'
  | 'UNKNOWN_PASSAGE'
  | 'UNKNOWN_BUNDLE'
  | 'DOCUMENT_NOT_FOUND'

/**
 * The one error type the library raises. Carries a stable code a program can
 * branch on and a message a person can read. The library never prints and
 * never exits the process; it throws this instead.
 */
export class DepError extends Error {
  readonly code: DepErrorCode
  readonly details: Record<string, unknown>

  constructor(code: DepErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'DepError'
    this.code = code
    this.details = details
  }
}
