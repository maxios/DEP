import type { DocspecConfig } from '../types'
import type { FreshnessState } from './types'

export interface Freshness {
  state: FreshnessState
  lastVerified: string | null
  cadenceDays: number | null
  daysSince: number | null
  futureDated: boolean
  cadenceMissing: boolean
}

const DAY = 1000 * 60 * 60 * 24

/**
 * Freshness at a point in time, from the document's own metadata and the
 * project's review cadence for its type. Unlike the graph's lifecycle it does
 * not assume a cadence when none is declared, and it notices a verification
 * date in the future rather than treating it as extra-fresh.
 */
export function computeFreshness(
  metadata: { last_verified?: string | Date; type: string },
  config: DocspecConfig,
  now: Date
): Freshness {
  const raw = metadata.last_verified
  const lastVerified = raw instanceof Date ? raw.toISOString() : raw ? String(raw) : null
  const cadence = config.governance?.review_cadence?.[metadata.type]
  const cadenceMissing = typeof cadence !== 'number'

  if (!lastVerified || isNaN(new Date(lastVerified).getTime())) {
    return { state: 'unknown', lastVerified, cadenceDays: cadence ?? null, daysSince: null, futureDated: false, cadenceMissing }
  }

  let daysSince = Math.floor((now.getTime() - new Date(lastVerified).getTime()) / DAY)
  const futureDated = daysSince < 0
  if (futureDated) daysSince = 0

  if (cadenceMissing) {
    return { state: 'unknown', lastVerified, cadenceDays: null, daysSince, futureDated, cadenceMissing }
  }

  let state: FreshnessState = 'stale'
  if (daysSince <= cadence) state = 'fresh'
  else if (daysSince <= cadence * 2) state = 'aging'

  return { state, lastVerified, cadenceDays: cadence, daysSince, futureDated, cadenceMissing }
}
