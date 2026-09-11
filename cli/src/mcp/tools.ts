import { existsSync } from 'fs'
import { join, resolve } from 'path'
import { openDocumentationSet, DepError } from '../lib'
import type { DocumentationSet, ContextOptions } from '../lib'
import { buildDapGraph, getNodeTargets } from '../dap/tree-builder'
import { resolveTrees } from '../dap/commands/resolve'
import { formatTrace } from '../dap/output'
import { treeIdFromRef } from '../context/procedure'
import { VERSION } from '../commands/upgrade'
import type { ToolDefinition } from './protocol'

const string = (description: string) => ({ type: 'string', description })
const number = (description: string) => ({ type: 'number', description })
const boolean = (description: string) => ({ type: 'boolean', description })
const rootProperty = { root: string('Project root holding .docspec. Defaults to the root the server was started with.') }

/**
 * DEP's tools as an MCP client sees them. Each call names a project root
 * (or uses the server's default); sets are opened once per root and reused.
 */
export function depTools(defaultRoot: string): ToolDefinition[] {
  const sets = new Map<string, DocumentationSet>()
  const setFor = (args: Record<string, unknown>): DocumentationSet => {
    const root = resolve(typeof args.root === 'string' && args.root ? args.root : defaultRoot)
    let set = sets.get(root)
    if (!set) {
      set = openDocumentationSet(root)
      sets.set(root, set)
    }
    return set
  }
  const dapFor = (args: Record<string, unknown>) => {
    const root = resolve(typeof args.root === 'string' && args.root ? args.root : defaultRoot)
    const dapRoot = join(root, 'dap')
    if (!existsSync(join(dapRoot, '.dapspec'))) {
      throw new DepError('TREE_NOT_FOUND', `the project declares no procedures (${join(dapRoot, '.dapspec')} is missing)`, { dapRoot })
    }
    return buildDapGraph(dapRoot)
  }
  const text = (v: unknown) => (typeof v === 'string' && v ? v : undefined)

  return [
    {
      name: 'dep_context',
      description: "Assemble a context bundle for a question: passages packed to a token budget, ranked by meaning and wording, expanded along typed relationships, with stale knowledge withheld and provenance on every passage. Prefer this over reading whole documents.",
      inputSchema: {
        type: 'object',
        properties: {
          question: string('The question to answer from the documentation set'),
          budget: number('Ceiling in tokens (≈ characters ÷ 4). Default 8000'),
          audience: string('Only documents written for this audience id'),
          type: string('Only documents of this type: tutorial | how-to | reference | explanation | decision-record'),
          tags: { type: 'array', items: { type: 'string' }, description: 'Only documents carrying every one of these tags' },
          within: string('Only documents under this path, relative to the root'),
          freshness: string('withhold-stale (default) | include-stale | fresh-only'),
          depth: number('How many relationships deep expansion may reach. Default 1; 0 disables'),
          minScore: number('Relevance floor 0–1. Default 0.2'),
          ...rootProperty,
        },
        required: ['question'],
      },
      handler: (args) => setFor(args).context(String(args.question ?? ''), pick(args, ['budget', 'audience', 'type', 'tags', 'within', 'freshness', 'depth', 'minScore']) as ContextOptions),
    },
    {
      name: 'dep_search',
      description: 'Documents ranked for a query, the same way a bundle ranks them, without a budget.',
      inputSchema: {
        type: 'object',
        properties: { query: string('Words or a question'), audience: string('Only this audience id'), type: string('Only this document type'), limit: number('Maximum documents. Default 10'), ...rootProperty },
        required: ['query'],
      },
      handler: (args) => setFor(args).search(String(args.query ?? ''), pick(args, ['audience', 'type', 'limit'])),
    },
    {
      name: 'dep_validate',
      description: 'One verdict per document (metadata, type, audience, links, dates, freshness) plus graph integrity (orphans, REQUIRES cycles, entry points).',
      inputSchema: { type: 'object', properties: { ...rootProperty } },
      handler: (args) => setFor(args).validate(),
    },
    {
      name: 'dep_graph',
      description: 'The documentation graph: every document with its type, audiences, freshness and typed links; orphans and cycles.',
      inputSchema: { type: 'object', properties: { ...rootProperty } },
      handler: (args) => {
        const graph = setFor(args).graph()
        return {
          root: setFor(args).root,
          documents: [...graph.nodes.values()].map((n) => ({
            path: n.path, type: n.metadata.type, audience: n.metadata.audience ?? [], confidence: n.metadata.confidence,
            lifecycle: n.lifecycle, tags: n.metadata.tags ?? [],
            links: n.forwardLinks.map((e) => ({ target: e.target, rel: e.rel })),
          })),
          edges: graph.edges.length, orphans: graph.orphans, cycles: graph.cycles,
        }
      },
    },
    {
      name: 'dep_query',
      description: 'Documents narrowed by metadata: type, audience, tag, confidence, lifecycle (FRESH | AGING | STALE), owner.',
      inputSchema: {
        type: 'object',
        properties: { type: string('Document type'), audience: string('Audience id'), tag: string('A tag'), confidence: string('high | medium | low | stale'), lifecycle: string('FRESH | AGING | STALE'), owner: string('Owner handle'), ...rootProperty },
      },
      handler: (args) => {
        const graph = setFor(args).graph()
        const lifecycle = text(args.lifecycle)?.toUpperCase()
        return {
          documents: [...graph.nodes.values()]
            .filter((n) => !text(args.type) || n.metadata.type === args.type)
            .filter((n) => !text(args.audience) || (n.metadata.audience ?? []).includes(String(args.audience)))
            .filter((n) => !text(args.tag) || (n.metadata.tags ?? []).includes(String(args.tag)))
            .filter((n) => !text(args.confidence) || n.metadata.confidence === args.confidence)
            .filter((n) => !lifecycle || n.lifecycle === lifecycle)
            .filter((n) => !text(args.owner) || n.metadata.owner === args.owner)
            .map((n) => ({ path: n.path, type: n.metadata.type, audience: n.metadata.audience ?? [], lifecycle: n.lifecycle, confidence: n.metadata.confidence })),
        }
      },
    },
    {
      name: 'dep_metadata',
      description: "A document's declared metadata with its computed freshness, links and backlinks.",
      inputSchema: { type: 'object', properties: { document: string('Path relative to the root'), ...rootProperty }, required: ['document'] },
      handler: (args) => setFor(args).metadata(String(args.document ?? '')),
    },
    {
      name: 'dep_index',
      description: 'Bring the retrieval index up to date: only changed documents are embedded again. Returns what was processed, reused, removed or unreadable.',
      inputSchema: { type: 'object', properties: { force: boolean('Rebuild everything'), only: string('Confine the update to one document'), ...rootProperty } },
      handler: (args) => setFor(args).index(pick(args, ['force', 'only'])),
    },
    {
      name: 'dap_resolve',
      description: 'Find the decision procedure (DAP tree) that covers a request, with a score and its entry step. Follow it with dap_node, one step at a time.',
      inputSchema: { type: 'object', properties: { query: string('The request, in the user’s own words'), ...rootProperty }, required: ['query'] },
      handler: (args) => ({
        query: String(args.query ?? ''),
        matches: resolveTrees(dapFor(args), String(args.query ?? '')).map((m) => ({ id: m.id, trigger: m.tree.metadata.trigger, entry_node: m.tree.metadata.entry_node, score: Math.round(m.score), path: m.tree.path })),
      }),
    },
    {
      name: 'dap_node',
      description: 'One step of a procedure — and only that step: what to do, what it yields, where it leads. observe [?] gather · decide [>] branch · act [!] do · delegate [@] hand off.',
      inputSchema: { type: 'object', properties: { tree: string('Procedure id'), node: string('Step id'), ...rootProperty }, required: ['tree', 'node'] },
      handler: (args) => {
        const graph = dapFor(args)
        const tree = graph.trees.get(String(args.tree ?? ''))
        if (!tree) throw new DepError('TREE_NOT_FOUND', `procedure "${args.tree}" is not declared; declared procedures: ${[...graph.trees.keys()].join(', ') || '(none)'}`)
        const node = tree.nodes.get(String(args.node ?? ''))
        if (!node) throw new DepError('NODE_NOT_FOUND', `step "${args.node}" is not declared by procedure "${args.tree}"; declared steps: ${[...tree.nodes.keys()].join(', ')}`)
        return {
          tree: tree.metadata.id, node,
          next: getNodeTargets(node),
          ...(node.delegate_to ? { handoff: { tree: treeIdFromRef(node.delegate_to), entry: graph.trees.get(treeIdFromRef(node.delegate_to))?.metadata.entry_node ?? null } } : {}),
        }
      },
    },
    {
      name: 'dap_trace',
      description: 'A whole procedure at once, for review: its steps and the routes through them.',
      inputSchema: { type: 'object', properties: { tree: string('Procedure id'), ...rootProperty }, required: ['tree'] },
      handler: (args) => {
        const graph = dapFor(args)
        const tree = graph.trees.get(String(args.tree ?? ''))
        if (!tree) throw new DepError('TREE_NOT_FOUND', `procedure "${args.tree}" is not declared; declared procedures: ${[...graph.trees.keys()].join(', ') || '(none)'}`)
        return { tree: tree.metadata.id, trigger: tree.metadata.trigger, entry_node: tree.metadata.entry_node, lifecycle: tree.lifecycle, steps: [...tree.nodes.keys()], trace: formatTrace(tree) }
      },
    },
    {
      name: 'dep_version',
      description: 'The version of the dep CLI serving these tools.',
      inputSchema: { type: 'object', properties: {} },
      handler: () => ({ version: VERSION }),
    },
  ]
}

function pick(args: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of keys) if (args[key] !== undefined) out[key] = args[key]
  return out
}
