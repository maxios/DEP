/** Timestamp helpers — every fixture date is expressed as "N days ago". */

const DAY_MS = 24 * 60 * 60 * 1000

/** An ISO 8601 timestamp with a local offset, the shape DEP documents use. */
export function isoDaysAgo(days: number): string {
  const then = new Date(Date.now() - days * DAY_MS)
  const offsetMinutes = -then.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const hh = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0')
  const mm = String(Math.abs(offsetMinutes) % 60).padStart(2, '0')
  return then.toISOString().replace(/\.\d{3}Z$/, '') + `${sign}${hh}:${mm}`
}

/** Whole days between an ISO timestamp and now, the way the CLI counts them. */
export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS)
}
