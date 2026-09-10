import { openDocumentationSet, DepError } from '../lib'
import type { Bundle, ContextOptions } from '../lib'

export interface ContextFlags {
  budget?: string | boolean
  audience?: string | boolean
  type?: string | boolean
  tag?: string | boolean
  within?: string | boolean
  freshness?: string | boolean
  depth?: string | boolean
  'no-expand'?: boolean
  'min-score'?: string | boolean
  json?: boolean
}

function numberOrRaw(value: string | boolean | undefined): number | string | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'boolean') return String(value)
  return /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value
}

function text(value: string | boolean | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export async function contextCommand(root: string, question: string, flags: ContextFlags) {
  const options: ContextOptions = {
    budget: numberOrRaw(flags.budget) as number | undefined,
    audience: text(flags.audience),
    type: text(flags.type),
    tags: text(flags.tag)?.split(',').map((t) => t.trim()).filter(Boolean),
    within: text(flags.within),
    freshness: text(flags.freshness) as ContextOptions['freshness'],
    depth: numberOrRaw(flags.depth) as number | undefined,
    expand: flags['no-expand'] ? false : undefined,
    minScore: numberOrRaw(flags['min-score']) as number | undefined,
  }
  for (const key of Object.keys(options) as Array<keyof ContextOptions>) {
    if (options[key] === undefined) delete options[key]
  }

  try {
    const set = openDocumentationSet(root)
    const bundle = await set.context(question, options)
    set.close()
    if (flags.json) {
      console.log(JSON.stringify(bundle, null, 2))
    } else {
      console.log(formatBundle(bundle))
    }
  } catch (err) {
    if (err instanceof DepError) {
      console.error(err.message)
      process.exit(1)
    }
    throw err
  }
}

export function formatBundle(bundle: Bundle): string {
  const lines: string[] = []
  lines.push(`Context for "${bundle.question}"`)
  lines.push(`  ${bundle.passages.length} passage(s), ${bundle.budget.used}/${bundle.budget.declared} ${bundle.budget.unit} used, ranking: ${bundle.ranking}, ${bundle.considered} document(s) considered`)
  lines.push('')
  bundle.passages.forEach((p, i) => {
    const why = p.reason.kind === 'match' ? 'matched' : `${p.reason.kind} ${p.reason.via} (${p.reason.rel})`
    const fresh = p.freshness.note ? `${p.freshness.state} — ${p.freshness.note}` : p.freshness.state
    lines.push(`[${i + 1}] ${p.document} › ${p.section}`)
    lines.push(`    score ${p.score} · ${p.tokens} tokens · ${why} · ${fresh} · owner ${p.owner.id}${p.owner.inherited ? ' (inherited)' : ''}${p.outOfSync ? ' · OUT OF SYNC' : ''}`)
    lines.push('')
    for (const line of p.content.split('\n')) lines.push(`    ${line}`)
    lines.push('')
  })
  if (bundle.withheld.length > 0) {
    lines.push('Withheld:')
    for (const w of bundle.withheld) lines.push(`  ${w.document} › ${w.section} (${w.reason}, last verified ${w.lastVerified ?? 'unknown'})`)
    lines.push('')
  }
  if (bundle.omitted.length > 0) {
    lines.push('Left out:')
    for (const o of bundle.omitted) lines.push(`  ${o.document} › ${o.section} (${o.reason}${o.requiredBy ? `, required by ${o.requiredBy}` : ''}, ${o.tokens} tokens)`)
    lines.push('')
  }
  if (bundle.notices.length > 0) {
    lines.push('Notes:')
    for (const n of bundle.notices) lines.push(`  ${n.code}: ${n.message}${n.hint ? ` — ${n.hint}` : ''}`)
    lines.push('')
  }
  lines.push(`bundle ${bundle.id}${bundle.index.builtAt ? ` · index built ${bundle.index.builtAt}` : ' · no index'}`)
  return lines.join('\n')
}
