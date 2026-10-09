/**
 * A local console over the documentation set: the graph, the health of it, one
 * document at a time, the procedures, and the record of what agents have been
 * asking for. Everything it serves comes from the embeddable surface, so the
 * console and the CLI can never disagree about what the set contains.
 *
 * It listens on the loopback address only. Nothing it serves leaves the machine.
 */
import { existsSync, readFileSync, watch, type FSWatcher } from 'fs'
import { join, resolve, relative, isAbsolute } from 'path'
import { openDocumentationSet } from '../lib'
import type { DocumentationSet } from '../lib'
import { DepError } from '../context/errors'
import { buildDapGraph, getNodeTargets } from '../dap/tree-builder'
import { loopReport } from '../commands/loop'
import { consolePage } from './page'

export const DEFAULT_PORT = 4317

export interface ConsoleOptions {
  /** 0 takes any free port. Omitted means the default. */
  port?: number
}

export interface ConsoleServer {
  url: string
  port: number
  hostname: string
  root: string
  stop(): Promise<void>
}

interface Server {
  port: number
  stop(closeActive?: boolean): void | Promise<void>
}

const HOSTNAME = '127.0.0.1'

export async function startConsole(root: string, options: ConsoleOptions = {}): Promise<ConsoleServer> {
  const projectRoot = resolve(root)
  // the console reads the record of requests; it must not fill it with its own
  const set = openDocumentationSet(projectRoot, { caller: 'console', trace: { record: false } })
  const port = options.port === undefined ? DEFAULT_PORT : options.port

  let dirty = false
  const watchers: FSWatcher[] = []
  const docsRoot = join(projectRoot, set.config().project.docs_root ?? 'docs')
  for (const target of [docsRoot, projectRoot]) {
    if (!existsSync(target)) continue
    try {
      const watcher = watch(target, { recursive: target === docsRoot }, () => { dirty = true })
      watcher.on('error', () => { dirty = true })
      // a console is not a reason for a process to stay alive
      if (typeof (watcher as unknown as { unref?: () => void }).unref === 'function') {
        (watcher as unknown as { unref: () => void }).unref()
      }
      watchers.push(watcher)
    } catch {
      dirty = true // no watcher here: read the set again on every request instead
    }
  }

  const current = (): DocumentationSet => {
    if (dirty) {
      dirty = false
      try {
        set.refresh()
      } catch {
        // a project mid-edit is not a reason to stop answering
      }
    }
    return set
  }

  // known only once a port of 0 has been resolved to a real one
  let boundPort = 0
  const listen = (on: number): Server => Bun.serve({
    port: on,
    hostname: HOSTNAME,
    reusePort: false,
    development: false,
    fetch: (request: Request) => answer(request, current, projectRoot, boundPort),
  }) as unknown as Server

  let server: Server
  try {
    server = listen(port)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!/EADDRINUSE|address already in use|in use/i.test(message)) throw err
    // a port the caller named is a requirement; the default is only a preference
    if (options.port !== undefined) {
      throw new DepError('PORT_TAKEN', `port ${port} is already taken; pass a different --port, or 0 for any free one`, { port })
    }
    server = listen(0)
  }

  boundPort = server.port

  return {
    url: `http://${HOSTNAME}:${server.port}`,
    port: server.port,
    hostname: HOSTNAME,
    root: projectRoot,
    async stop() {
      for (const watcher of watchers) {
        try { watcher.close() } catch {}
      }
      await server.stop(true)
      set.close()
    },
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/** Codes that mean the caller asked for something it should not have. */
const CALLER_ERRORS = new Set(['INVALID_OPTION', 'INVALID_BUDGET', 'INVALID_DEPTH', 'INVALID_FRESHNESS', 'INVALID_TYPE', 'UNKNOWN_AUDIENCE', 'OUTSIDE_SET', 'UNKNOWN_BUNDLE', 'UNKNOWN_PASSAGE'])

const STATUS: Record<string, number> = { DOCUMENT_NOT_FOUND: 404, UNKNOWN_PROPOSAL: 404, UNKNOWN_MESSAGE: 404, PROPOSAL_STALE: 409, LOOP_OFF: 403 }

function failure(err: unknown): Response {
  if (err instanceof DepError) {
    const status = STATUS[err.code] ?? (CALLER_ERRORS.has(err.code) ? 400 : 500)
    return json({ error: err.message, code: err.code }, status)
  }
  return json({ error: err instanceof Error ? err.message : String(err) }, 500)
}

/**
 * A console that can change the project is worth attacking from a page the
 * person happens to have open, or through a name that resolves to their own
 * machine. Both carry headers that give them away.
 */
function notForUs(request: Request, port: number): string | null {
  const host = (request.headers.get('host') ?? '').split(':')[0]!.replace(/^\[|\]$/g, '')
  if (host && host !== '127.0.0.1' && host !== 'localhost' && host !== '::1') {
    return `this console answers only to this machine, not to ${host}`
  }
  const origin = request.headers.get('origin')
  if (origin && origin !== `http://127.0.0.1:${port}` && origin !== `http://localhost:${port}`) {
    return `a page served from ${origin} may not change this project`
  }
  return null
}

async function answer(request: Request, current: () => DocumentationSet, root: string, port: number): Promise<Response> {
  const url = new URL(request.url)
  try {
    if (url.pathname === '/api/amend') {
      if (request.method !== 'POST') return json({ error: 'changing a document is a POST' }, 405)
      const refused = notForUs(request, port)
      if (refused) return json({ error: refused, code: 'NOT_FOR_US' }, 403)
      let body: { document?: string } & Record<string, unknown>
      try {
        body = await request.json() as typeof body
      } catch {
        return json({ error: 'the amendment is not JSON' }, 400)
      }
      const document = typeof body.document === 'string' ? body.document : ''
      if (!document) return json({ error: 'no document was named' }, 400)
      const { document: _named, ...amendment } = body
      return json(current().amend(document, amendment))
    }
    if (url.pathname === '/api/proposals' && request.method === 'POST') {
      const refused = notForUs(request, port)
      if (refused) return json({ error: refused, code: 'NOT_FOR_US' }, 403)
      let body: { document?: unknown; decision?: unknown }
      try {
        body = await request.json() as typeof body
      } catch {
        return json({ error: 'the decision is not JSON' }, 400)
      }
      const document = typeof body.document === 'string' ? body.document : ''
      if (!document) return json({ error: 'no document was named' }, 400)
      if (body.decision === 'accept') return json(current().acceptProposal(document))
      if (body.decision === 'reject') return json(current().rejectProposal(document))
      return json({ error: 'the decision is accept or reject' }, 400)
    }
    if (url.pathname === '/api/reply' && request.method === 'POST') {
      const refused = notForUs(request, port)
      if (refused) return json({ error: refused, code: 'NOT_FOR_US' }, 403)
      let body: { message?: unknown; body?: unknown }
      try {
        body = await request.json() as typeof body
      } catch {
        return json({ error: 'the reply is not JSON' }, 400)
      }
      if (typeof body.message !== 'string' || !body.message) return json({ error: 'no message was named' }, 400)
      return json(current().replyAsPerson(body.message, typeof body.body === 'string' ? body.body : ''))
    }
    switch (url.pathname) {
      case '/api/heartbeat':
        // a project without the heartbeat has none to show
        if (!current().loop.heartbeat.enabled) break
        return json(current().heartbeatOverview())
      case '/api/learned':
        if (!current().loop.enabled) break
        return json(current().learnedSummary())
      case '/api/loop':
        return json({ ...current().loop, parts: loopReport(current().loop) })
      case '/api/proposals':
        // a project that takes no proposals has nothing to review
        if (current().loop.proposals === 'off') break
        return json({ proposals: current().proposals() })
      case '/':
      case '/index.html':
        return new Response(consolePage(current().config().project.name ?? 'documentation'), {
          headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
        })
      case '/api/graph':
        return json(graphPayload(current()))
      case '/api/validate':
        return json(current().validate())
      case '/api/document':
        return json(documentPayload(current(), root, url.searchParams.get('path') ?? ''))
      case '/api/trace': {
        const caller = url.searchParams.get('caller')
        return json(current().traceReport(caller ? { caller } : {}))
      }
      case '/api/procedures':
        return json(procedurePayload(root))
      default:
        break
    }
    return json({ error: `${url.pathname} is not something the console serves` }, 404)
  } catch (err) {
    return failure(err)
  }
}

function graphPayload(set: DocumentationSet) {
  const graph = set.graph()
  const config = set.config()
  const nodes = [...graph.nodes.values()].map((node) => ({
    path: node.path,
    title: node.path.split('/').pop()?.replace(/\.md$/, '') ?? node.path,
    type: node.metadata.type,
    audience: node.metadata.audience,
    confidence: node.metadata.confidence,
    owner: node.metadata.owner,
    tags: node.metadata.tags ?? [],
    lastVerified: node.metadata.last_verified ?? null,
    lifecycle: node.lifecycle,
    inbound: node.backlinks.length,
    outbound: node.forwardLinks.length,
  }))
  const edges: Array<{ source: string; target: string; rel: string }> = []
  const seen = new Set<string>()
  for (const node of graph.nodes.values()) {
    for (const link of node.forwardLinks) {
      const key = `${link.source}|${link.rel}|${link.target}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({ source: link.source, target: link.target, rel: link.rel })
    }
  }
  return {
    project: config.project.name,
    nodes,
    edges,
    orphans: graph.orphans,
    cycles: graph.cycles,
    stats: { documents: nodes.length, edges: edges.length, orphans: graph.orphans.length, cycles: graph.cycles.length },
    cadence: config.governance?.review_cadence ?? {},
    audiences: (config.audiences ?? []).map((a) => ({ id: a.id, name: a.name })),
  }
}

function documentPayload(set: DocumentationSet, root: string, asked: string) {
  if (!asked) throw new DepError('DOCUMENT_NOT_FOUND', 'no document was named', { document: asked })
  if (isAbsolute(asked) || relative(root, resolve(root, asked)).startsWith('..')) {
    throw new DepError('OUTSIDE_SET', `${asked} is outside the documentation set`, { document: asked })
  }
  const metadata = set.metadata(asked)
  const node = set.graph().nodes.get(asked)
  const full = join(root, asked)
  let content = ''
  try {
    content = readFileSync(full, 'utf-8')
  } catch {
    content = ''
  }
  const declared = metadata.declared as Record<string, unknown>
  return {
    ...metadata,
    type: node?.metadata.type ?? String(declared.type ?? ''),
    owner: node?.metadata.owner ?? String(declared.owner ?? ''),
    confidence: node?.metadata.confidence ?? String(declared.confidence ?? ''),
    audience: node?.metadata.audience ?? (Array.isArray(declared.audience) ? declared.audience : []),
    tags: Array.isArray(declared.tags) ? declared.tags : [],
    content,
    forwardLinks: node?.forwardLinks ?? [],
    backlinks: node?.backlinks ?? [],
  }
}

function procedurePayload(root: string) {
  const dapRoot = join(root, 'dap')
  if (!existsSync(join(dapRoot, '.dapspec'))) return { trees: [] }
  const dap = buildDapGraph(dapRoot)
  const trees = [...dap.trees.values()].map((tree) => ({
    id: tree.metadata.id,
    trigger: tree.metadata.trigger,
    entry: tree.metadata.entry_node,
    lifecycle: tree.lifecycle,
    confidence: tree.metadata.confidence,
    steps: [...tree.nodes.values()].map((node) => ({
      id: node.id,
      type: node.type,
      description: node.description ?? '',
      method: node.method ?? '',
      tool: node.tool ?? '',
      next: getNodeTargets(node),
      conditions: (node.conditions ?? []).map((c) => ({ condition: c.condition, next: c.next })),
      handoff: node.delegate_to ?? null,
    })),
    handsOffTo: [...new Set(
      [...tree.nodes.values()]
        .map((node) => node.delegate_to)
        .filter((ref): ref is string => Boolean(ref))
        .map((ref) => ref.replace(/^dap:\/\//, '').replace(/\.md$/, ''))
    )],
  }))
  return { trees }
}
