/**
 * Writes the doc-maintenance arena: what a documentation owner should do with
 * a document, given its type, how fresh it is, whether what it depends on has
 * changed, and how confident its owner is. Every combination is a level.
 * Deterministic — run it again and the file comes out byte for byte the same.
 *
 *   bun packages/loop/arenas/doc-maintenance/generate.ts
 *
 * The policy below is the judge's; it is a draft for the project to review.
 * The document's type has nothing to do with it, on purpose: memory keyed by
 * type learns the same lesson five times, which is what folding into rules
 * is for.
 */
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const TYPES = ['tutorial', 'how-to', 'reference', 'explanation', 'decision-record']
const LIFECYCLES = ['FRESH', 'AGING', 'STALE']
const DEPS = ['changed', 'unchanged', 'none']
const CONFIDENCE = ['high', 'medium', 'low']

/** The policy. The steps reproduce it; the player only ever sees its verdicts. */
export function expected(type: string, lifecycle: string, deps: string, confidence: string): string {
  if (deps === 'changed') return 'propose-fix'
  if (lifecycle === 'STALE') return 'review'
  if (confidence === 'low') return 'review'
  if (lifecycle === 'AGING') return 'bump'
  return 'skip'
}

const width = [15, 9, 9, 10, 11]
const row = (vs: string[]) => '      |' + vs.map((v, i) => ` ${v.padEnd(width[i]!)} `).join('|') + '|'
const rows = TYPES.flatMap((t) => LIFECYCLES.flatMap((l) => DEPS.flatMap((d) => CONFIDENCE.map((c) => row([t, l, d, c, expected(t, l, d, c)])))))

const feature = `@play @maintenance
Feature: Maintaining a documentation set

  Scenario Outline: A document due for attention is handled
    Given a <type> document that is <lifecycle>, whose dependencies are <deps>, held with <confidence> confidence
    When its owner's choice is applied
    Then it is handled by <expected>

    Examples:
${row(['type', 'lifecycle', 'deps', 'confidence', 'expected'])}
${rows.join('\n')}
`

const dir = join(import.meta.dir, 'arena', 'features')
mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, 'maintenance.feature'), feature)
console.log(`wrote ${rows.length} levels to ${join(dir, 'maintenance.feature')}`)
