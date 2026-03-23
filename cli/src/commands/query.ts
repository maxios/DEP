import { buildGraph } from '../graph'
import { formatQueryResults } from '../output'
import type { DepNode } from '../types'

interface QueryFlags {
  type?: string
  audience?: string
  tag?: string
  confidence?: string
  lifecycle?: string
  owner?: string
  json?: boolean
}

export function queryCommand(root: string, flags: QueryFlags) {
  const graph = buildGraph(root)

  let results: DepNode[] = Array.from(graph.nodes.values())

  if (flags.type) {
    results = results.filter((n) => n.metadata.type === flags.type)
  }

  if (flags.audience) {
    results = results.filter((n) => n.metadata.audience.includes(flags.audience!))
  }

  if (flags.tag) {
    results = results.filter((n) => n.metadata.tags.includes(flags.tag!))
  }

  if (flags.confidence) {
    results = results.filter((n) => n.metadata.confidence === flags.confidence)
  }

  if (flags.lifecycle) {
    results = results.filter((n) => n.lifecycle === flags.lifecycle!.toUpperCase())
  }

  if (flags.owner) {
    results = results.filter((n) => n.metadata.owner === flags.owner)
  }

  if (flags.json) {
    console.log(JSON.stringify(results.map((n) => ({
      path: n.path,
      type: n.metadata.type,
      audience: n.metadata.audience,
      confidence: n.metadata.confidence,
      lifecycle: n.lifecycle,
      owner: n.metadata.owner,
      tags: n.metadata.tags,
    })), null, 2))
  } else {
    console.log(formatQueryResults(results))
  }
}
