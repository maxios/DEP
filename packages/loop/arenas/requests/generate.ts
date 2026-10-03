/**
 * Writes the reference arena: request-handling scenarios with a known ground
 * truth, the way the maze is a known world. Deterministic — run it again and
 * the files come out byte for byte the same.
 *
 *   bun packages/loop/arenas/requests/generate.ts
 *
 * The right way to handle a request follows a hidden rule over its size,
 * currency and the customer's tier. Each feature is a product area, and the
 * area has nothing to do with the rule: a player that keys its memory by area
 * learns the same lesson five times over, which is what folding claims into
 * rules is for.
 */
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const HERE = import.meta.dir
const SIZES = ['small', 'medium', 'large']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY']
const TIERS = ['new', 'silver', 'gold', 'platinum']
const AREAS = ['billing', 'payouts', 'refunds', 'transfers', 'invoices']
const ROWS_PER_OUTLINE = 12

/** The hidden rule. The steps reproduce it; the player only ever sees its verdicts. */
export function expected(size: string, currency: string, tier: string): string {
  if (size === 'large' && tier === 'new') return 'refused'
  if (currency !== 'USD') return 'converted'
  if (tier === 'new') return 'pending'
  return 'accepted'
}

// mulberry32, so the arena does not depend on the engine's seeding
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const combos = SIZES.flatMap((s) => CURRENCIES.flatMap((c) => TIERS.map((t) => [s, c, t] as const)))

function sample(seed: number): (typeof combos)[number][] {
  const next = rng(seed)
  const pool = [...combos]
  const out: (typeof combos)[number][] = []
  while (out.length < ROWS_PER_OUTLINE) out.push(pool.splice(Math.floor(next() * pool.length), 1)[0]!)
  return out
}

function table(rows: (typeof combos)[number][]): string {
  const width = [6, 8, 8, 9]
  const cell = (v: string, i: number) => ` ${v.padEnd(width[i]!)} `
  const line = (vs: string[]) => '      |' + vs.map(cell).join('|') + '|'
  return [line(['size', 'currency', 'tier', 'outcome']), ...rows.map(([s, c, t]) => line([s, c, t, expected(s, c, t)]))].join('\n')
}

function feature(area: string, index: number): string {
  return `@play @area-${area}
Feature: Handling ${area} requests

  @happy-path
  Scenario Outline: A ${area} request is handled
    Given a <size> request in <currency> from a <tier> customer
    When the request is handled under this scenario's policy
    Then the request is <outcome>

    Examples:
${table(sample(1000 + index * 2))}

  @edge-case
  Scenario Outline: A ${area} request at the edge of policy is handled
    Given a <size> request in <currency> from a <tier> customer
    When the request is handled under this scenario's policy
    Then the request is <outcome>

    Examples:
${table(sample(1001 + index * 2))}

  @validation
  Scenario: A ${area} request with no amount is refused
    Given a request with no amount
    When the request is handled under this scenario's policy
    Then the request is refused
`
}

const features = join(HERE, 'arena', 'features')
mkdirSync(features, { recursive: true })
AREAS.forEach((area, i) => writeFileSync(join(features, `${area}.feature`), feature(area, i)))
console.log(`wrote ${AREAS.length} features, ${AREAS.length * (2 * ROWS_PER_OUTLINE + 1)} levels`)
