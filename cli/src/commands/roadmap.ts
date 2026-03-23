import { buildGraph } from '../graph'
import { loadDocspec } from '../config'
import { extractTitle } from '../parser'
import { join } from 'path'

interface RoadmapStep {
  step: number
  path: string
  type: string
  title: string
  seeAlso: Array<{ path: string; title: string; rel: string }>
}

export function roadmapCommand(
  root: string,
  audienceId: string,
  flags: { json?: boolean }
) {
  const config = loadDocspec(root)
  const audience = config.audiences.find((a) => a.id === audienceId)

  if (!audience) {
    const validIds = config.audiences.map((a) => a.id).join(', ')
    console.error(`Unknown audience: ${audienceId}. Valid IDs: ${validIds}`)
    process.exit(1)
  }

  const graph = buildGraph(root)
  const entryPoint = audience.entry_point.replace(/^\.\//, '')

  if (!graph.nodes.has(entryPoint)) {
    console.error(`Entry point not found in graph: ${entryPoint}`)
    process.exit(1)
  }

  const visited = new Set<string>()
  const steps: RoadmapStep[] = []

  // Walk TEACHES and NEXT edges from entry point
  function walk(path: string) {
    if (visited.has(path)) return
    visited.add(path)

    const node = graph.nodes.get(path)
    if (!node) return

    // Only include docs tagged for this audience
    if (!node.metadata.audience.includes(audienceId)) return

    const title = extractTitle(join(root, node.path))
    const seeAlso: RoadmapStep['seeAlso'] = []

    // Collect side references (USES, EXPLAINS edges)
    for (const edge of node.forwardLinks) {
      if (edge.rel === 'USES' || edge.rel === 'EXPLAINS') {
        const targetNode = graph.nodes.get(edge.target)
        if (targetNode) {
          seeAlso.push({
            path: edge.target,
            title: extractTitle(join(root, edge.target)),
            rel: edge.rel,
          })
        }
      }
    }

    steps.push({
      step: steps.length + 1,
      path: node.path,
      type: node.metadata.type,
      title,
      seeAlso,
    })

    // Follow TEACHES and NEXT edges in order
    const nextPaths: string[] = []
    for (const edge of node.forwardLinks) {
      if (edge.rel === 'TEACHES' || edge.rel === 'NEXT') {
        if (!visited.has(edge.target) && graph.nodes.has(edge.target)) {
          nextPaths.push(edge.target)
        }
      }
    }

    for (const next of nextPaths) {
      walk(next)
    }
  }

  walk(entryPoint)

  if (flags.json) {
    console.log(JSON.stringify({ audience: audience.name, audienceId, entryPoint, steps }, null, 2))
    return
  }

  console.log(`Learning Roadmap for: ${audience.name} (${audienceId})`)
  console.log(`Entry point: ${entryPoint}`)
  console.log()

  for (const step of steps) {
    console.log(`  ${step.step}. [${step.type}] ${step.title}`)
    if (step.seeAlso.length > 0) {
      for (const ref of step.seeAlso) {
        console.log(`     See also: ${ref.title} (${ref.rel.toLowerCase()})`)
      }
    }
  }

  console.log()
  console.log(`${steps.length} documents in learning path`)
}
