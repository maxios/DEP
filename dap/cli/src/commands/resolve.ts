import { buildDapGraph } from '../tree-builder'
import type { DapTree } from '../types'

export function resolveCommand(dapRoot: string, query: string, flags: { json?: boolean }) {
  const graph = buildDapGraph(dapRoot)
  const matches: Array<{ id: string; tree: DapTree; score: number }> = []

  const queryLower = query.toLowerCase()
  const queryWords = queryLower.split(/\s+/)

  for (const [id, tree] of graph.trees) {
    let score = 0

    // Check trigger text
    const triggerLower = tree.metadata.trigger.toLowerCase()
    if (triggerLower === queryLower) {
      score = 100 // Exact match
    } else if (triggerLower.includes(queryLower)) {
      score = 80 // Substring match
    } else {
      // Word overlap scoring
      const triggerWords = triggerLower.split(/\s+/)
      const overlap = queryWords.filter((w) => triggerWords.some((tw) => tw.includes(w)))
      if (overlap.length > 0) {
        score = (overlap.length / queryWords.length) * 60
      }
    }

    // Check trigger patterns
    if (tree.metadata.trigger_patterns) {
      for (const pattern of tree.metadata.trigger_patterns) {
        if (typeof pattern === 'string') {
          const patternLower = pattern.toLowerCase()
          const patternRegex = new RegExp('^' + patternLower.replace(/\*/g, '.*') + '$')
          if (patternRegex.test(queryLower)) {
            score = Math.max(score, 90)
          }
        } else if (pattern && typeof pattern === 'object' && 'intent' in pattern) {
          if (queryLower === pattern.intent.toLowerCase()) {
            score = Math.max(score, 95)
          }
        }
      }
    }

    // Check tags
    for (const tag of tree.metadata.tags) {
      if (queryWords.includes(tag.toLowerCase())) {
        score = Math.max(score, score + 10)
      }
    }

    if (score > 0) {
      matches.push({ id, tree, score })
    }
  }

  matches.sort((a, b) => b.score - a.score)

  if (flags.json) {
    console.log(JSON.stringify({
      query,
      matches: matches.map((m) => ({
        id: m.id,
        trigger: m.tree.metadata.trigger,
        entry_node: m.tree.metadata.entry_node,
        score: m.score,
        path: m.tree.path,
      })),
    }, null, 2))
  } else {
    if (matches.length === 0) {
      console.log(`No trees match: "${query}"`)
    } else {
      console.log(`Matches for "${query}":\n`)
      for (const m of matches) {
        console.log(`  ${m.id} (score: ${Math.round(m.score)})`)
        console.log(`    trigger: ${m.tree.metadata.trigger}`)
        console.log(`    entry: ${m.tree.metadata.entry_node}`)
        console.log(`    path: ${m.tree.path}`)
        console.log('')
      }
    }
  }
}
