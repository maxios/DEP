import { buildGraph } from '../graph'
import { loadDocspec } from '../config'
import { existsSync } from 'fs'
import { join } from 'path'
import type { DepNode } from '../types'

interface ValidationResult {
  path: string
  status: 'PASS' | 'WARN' | 'FAIL'
  checks: Array<{ name: string; passed: boolean; message?: string }>
}

const CANONICAL_TYPES = ['tutorial', 'how-to', 'reference', 'explanation', 'decision-record']
const CANONICAL_RELS = ['TEACHES', 'USES', 'EXPLAINS', 'DECIDES', 'REQUIRES', 'NEXT']

export function validateCommand(root: string, flags: { json?: boolean }) {
  const config = loadDocspec(root)
  const graph = buildGraph(root)
  const audienceIds = config.audiences.map((a) => a.id)
  const customTypes = (config.custom_types ?? []).map((t) => t.id)
  const validTypes = [...CANONICAL_TYPES, ...customTypes]
  const customRels = (config.custom_relationships ?? []).map((r) => r.id)
  const validRels = [...CANONICAL_RELS, ...customRels, 'INLINE']

  const results: ValidationResult[] = []

  // Document-level checks
  for (const [, node] of graph.nodes) {
    const result = validateDocument(node, root, validTypes, audienceIds, validRels)
    results.push(result)
  }

  // Graph-level checks
  const graphChecks = validateGraph(graph, config)

  // Output
  if (flags.json) {
    console.log(JSON.stringify({ documents: results, graph: graphChecks }, null, 2))
  } else {
    printReport(results, graphChecks, graph)
  }

  // Exit code
  const hasFail = results.some((r) => r.status === 'FAIL') || graphChecks.some((c) => !c.passed)
  process.exit(hasFail ? 1 : 0)
}

function validateDocument(
  node: DepNode,
  root: string,
  validTypes: string[],
  audienceIds: string[],
  validRels: string[]
): ValidationResult {
  const checks: ValidationResult['checks'] = []

  // Metadata completeness
  const meta = node.metadata
  const requiredFields = ['type', 'audience', 'owner', 'created', 'last_verified', 'confidence']
  const missing = requiredFields.filter((f) => !(f in meta) || meta[f as keyof typeof meta] === undefined)
  checks.push({
    name: 'Metadata complete',
    passed: missing.length === 0,
    message: missing.length > 0 ? `Missing: ${missing.join(', ')}` : undefined,
  })

  // Type validity
  checks.push({
    name: 'Type valid',
    passed: validTypes.includes(meta.type),
    message: !validTypes.includes(meta.type) ? `Unknown type: ${meta.type}` : undefined,
  })

  // Audience validity
  const invalidAudiences = meta.audience.filter((a) => !audienceIds.includes(a))
  checks.push({
    name: 'Audience valid',
    passed: invalidAudiences.length === 0,
    message: invalidAudiences.length > 0 ? `Unknown audiences: ${invalidAudiences.join(', ')}` : undefined,
  })

  // Link targets exist
  const brokenLinks = node.forwardLinks.filter((e) => {
    const targetPath = join(root, e.target)
    return !existsSync(targetPath)
  })
  checks.push({
    name: 'Links resolve',
    passed: brokenLinks.length === 0,
    message: brokenLinks.length > 0 ? `Broken: ${brokenLinks.map((l) => l.target).join(', ')}` : undefined,
  })

  // Relationship types valid
  const invalidRels = node.forwardLinks.filter((e) => !validRels.includes(e.rel))
  checks.push({
    name: 'Relationship types valid',
    passed: invalidRels.length === 0,
    message: invalidRels.length > 0 ? `Unknown rels: ${invalidRels.map((l) => l.rel).join(', ')}` : undefined,
  })

  // Lifecycle
  checks.push({
    name: `Lifecycle: ${node.lifecycle}`,
    passed: node.lifecycle !== 'STALE',
    message: node.lifecycle === 'STALE' ? 'Document exceeds review cadence' : undefined,
  })

  // Date format validity
  for (const field of ['created', 'last_verified'] as const) {
    const value = meta[field]
    if (value) {
      const parsed = new Date(value)
      checks.push({
        name: `Date format: ${field}`,
        passed: !isNaN(parsed.getTime()),
        message: isNaN(parsed.getTime()) ? `Invalid ISO 8601: "${value}"` : undefined,
      })
    }
  }

  // Confidence
  checks.push({
    name: 'Confidence valid',
    passed: ['high', 'medium', 'low', 'stale'].includes(meta.confidence),
    message: !['high', 'medium', 'low', 'stale'].includes(meta.confidence) ? `Invalid: ${meta.confidence}` : undefined,
  })

  const status = checks.some((c) => !c.passed && c.name !== `Lifecycle: ${node.lifecycle}`)
    ? 'FAIL'
    : checks.some((c) => !c.passed)
      ? 'WARN'
      : 'PASS'

  return { path: node.path, status, checks }
}

function validateGraph(
  graph: DepGraph,
  config: ReturnType<typeof loadDocspec>
): Array<{ name: string; passed: boolean; message?: string }> {
  const checks: Array<{ name: string; passed: boolean; message?: string }> = []

  // Orphan check
  checks.push({
    name: 'No orphans',
    passed: graph.orphans.length === 0,
    message: graph.orphans.length > 0 ? `Orphans: ${graph.orphans.join(', ')}` : undefined,
  })

  // Cycle check
  checks.push({
    name: 'No REQUIRES cycles',
    passed: graph.cycles.length === 0,
    message: graph.cycles.length > 0 ? `Cycles: ${graph.cycles.map((c) => c.join(' → ')).join('; ')}` : undefined,
  })

  // Entry point check
  const missingEntryPoints = config.audiences.filter((a) => {
    const ep = a.entry_point.replace(/^\.\//, '')
    return !graph.nodes.has(ep)
  })
  checks.push({
    name: 'Entry points exist',
    passed: missingEntryPoints.length === 0,
    message: missingEntryPoints.length > 0
      ? `Missing: ${missingEntryPoints.map((a) => `${a.id} → ${a.entry_point}`).join(', ')}`
      : undefined,
  })

  return checks
}

function printReport(
  results: ValidationResult[],
  graphChecks: Array<{ name: string; passed: boolean; message?: string }>,
  graph: ReturnType<typeof buildGraph>
) {
  const passed = results.filter((r) => r.status === 'PASS').length
  const warned = results.filter((r) => r.status === 'WARN').length
  const failed = results.filter((r) => r.status === 'FAIL').length

  console.log('## DEP Validation Report\n')
  console.log(`Documents: ${results.length} | Pass: ${passed} | Warn: ${warned} | Fail: ${failed}\n`)

  for (const result of results) {
    const icon = result.status === 'PASS' ? '✓' : result.status === 'WARN' ? '◐' : '✗'
    console.log(`${icon} ${result.path} — ${result.status}`)
    for (const check of result.checks) {
      if (!check.passed) {
        console.log(`    ✗ ${check.name}${check.message ? ': ' + check.message : ''}`)
      }
    }
  }

  console.log('\n### Graph Integrity\n')
  for (const check of graphChecks) {
    const icon = check.passed ? '✓' : '✗'
    console.log(`${icon} ${check.name}${check.message ? ': ' + check.message : ''}`)
  }
}
