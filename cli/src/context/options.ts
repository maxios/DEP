import type { DocspecConfig } from '../types'
import { DepError } from './errors'
import { FRESHNESS_PREFERENCES, type ContextOptions, type NormalizedOptions } from './types'

export const CANONICAL_TYPES = ['tutorial', 'how-to', 'reference', 'explanation', 'decision-record']
export const DEFAULT_BUDGET = 8000
export const DEFAULT_DEPTH = 1
export const DEFAULT_MIN_SCORE = 0.2

export function normalizeOptions(raw: ContextOptions | undefined, config: DocspecConfig): NormalizedOptions {
  const options = raw ?? {}

  if (options.provenance === false) {
    throw new DepError('PROVENANCE_REQUIRED', 'provenance is part of every bundle and cannot be turned off')
  }

  const budget = options.budget === undefined ? DEFAULT_BUDGET : options.budget
  if (typeof budget !== 'number' || !Number.isFinite(budget) || budget <= 0) {
    throw new DepError('INVALID_BUDGET', 'budget must be a positive number', { budget })
  }

  const freshness = options.freshness ?? 'withhold-stale'
  if (!FRESHNESS_PREFERENCES.includes(freshness)) {
    throw new DepError(
      'INVALID_FRESHNESS',
      `unknown freshness preference "${freshness}"; accepted: ${FRESHNESS_PREFERENCES.join(', ')}`,
      { accepted: FRESHNESS_PREFERENCES }
    )
  }

  const depth = options.depth === undefined ? DEFAULT_DEPTH : options.depth
  if (typeof depth !== 'number' || !Number.isInteger(depth)) {
    throw new DepError('INVALID_DEPTH', 'expansion depth must be a whole number', { depth })
  }
  if (depth < 0) {
    throw new DepError('INVALID_DEPTH', 'expansion depth must not be negative', { depth })
  }

  const minScore = options.minScore === undefined ? DEFAULT_MIN_SCORE : options.minScore
  if (typeof minScore !== 'number' || !Number.isFinite(minScore) || minScore < 0 || minScore > 1) {
    throw new DepError('INVALID_OPTION', 'relevance floor must be a number between 0 and 1', { minScore })
  }

  let audience: string | undefined
  if (options.audience !== undefined) {
    const declared = (config.audiences ?? []).map((a) => a.id)
    if (declared.length === 0) {
      throw new DepError(
        'NO_AUDIENCES',
        'the project declares no audiences to restrict by; an unrestricted request would still succeed',
        { audience: options.audience }
      )
    }
    if (!declared.includes(options.audience)) {
      throw new DepError(
        'UNKNOWN_AUDIENCE',
        `unknown audience "${options.audience}"; the project declares: ${declared.join(', ')}`,
        { audience: options.audience, declared }
      )
    }
    audience = options.audience
  }

  let type: string | undefined
  if (options.type !== undefined) {
    const custom = (config.custom_types ?? []).map((t) => t.id)
    const accepted = [...CANONICAL_TYPES, ...custom]
    if (!accepted.includes(options.type)) {
      throw new DepError(
        'INVALID_TYPE',
        `unknown document type "${options.type}"; accepted types: ${CANONICAL_TYPES.join(', ')}`,
        { type: options.type, accepted: CANONICAL_TYPES }
      )
    }
    type = options.type
  }

  const tags = (options.tags ?? []).map((t) => String(t).trim()).filter(Boolean)

  let within: string | undefined
  if (options.within !== undefined) {
    within = String(options.within).replace(/^\.\//, '').replace(/\/+$/, '')
  }

  return {
    budget,
    audience,
    type,
    tags,
    within,
    freshness,
    depth,
    expand: options.expand !== false && depth > 0,
    minScore,
  }
}
