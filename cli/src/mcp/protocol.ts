/**
 * The Model Context Protocol over stdio, without a framework: newline-delimited
 * JSON-RPC 2.0 on stdin/stdout. Only the server side, only what a tool server
 * needs — initialize, ping, tools/list, tools/call — plus empty answers for
 * resources and prompts so a client that asks for them is not confused.
 *
 * stdout is the wire. Nothing else in the process may write to it while the
 * server runs; diagnostics go to stderr.
 */

import type { Readable } from 'stream'

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  handler: (args: Record<string, unknown>) => Promise<unknown> | unknown
}

export interface ServerInfo {
  name: string
  version: string
  instructions?: string
}

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: number | string | null
  method: string
  params?: Record<string, unknown>
}

const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']

export class ToolError extends Error {}

export interface StdioServerOptions {
  input?: Readable
  output?: { write(chunk: string): unknown }
}

/** Serve tools until the input closes. Resolves when it does. */
export function serveStdio(tools: ToolDefinition[], info: ServerInfo, options: StdioServerOptions = {}): Promise<void> {
  const input = options.input ?? process.stdin
  const output = options.output ?? process.stdout
  const byName = new Map(tools.map((t) => [t.name, t]))
  const send = (message: unknown) => { output.write(JSON.stringify(message) + '\n') }

  const handle = async (request: JsonRpcRequest): Promise<void> => {
    const isNotification = request.id === undefined
    const reply = (result: unknown) => { if (!isNotification) send({ jsonrpc: '2.0', id: request.id, result }) }
    const fail = (code: number, message: string, data?: unknown) => {
      if (!isNotification) send({ jsonrpc: '2.0', id: request.id, error: { code, message, ...(data === undefined ? {} : { data }) } })
    }

    switch (request.method) {
      case 'initialize': {
        const asked = String(request.params?.protocolVersion ?? '')
        reply({
          protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: info.name, version: info.version },
          ...(info.instructions ? { instructions: info.instructions } : {}),
        })
        return
      }
      case 'notifications/initialized':
      case 'notifications/cancelled':
      case 'notifications/roots/list_changed':
        return
      case 'ping':
        reply({})
        return
      case 'tools/list':
        reply({ tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) })
        return
      case 'resources/list':
        reply({ resources: [] })
        return
      case 'prompts/list':
        reply({ prompts: [] })
        return
      case 'tools/call': {
        const name = String(request.params?.name ?? '')
        const tool = byName.get(name)
        if (!tool) {
          fail(-32602, `unknown tool: ${name}`, { available: [...byName.keys()] })
          return
        }
        const args = (request.params?.arguments ?? {}) as Record<string, unknown>
        try {
          const result = await tool.handler(args)
          const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          reply({
            content: [{ type: 'text', text }],
            ...(typeof result === 'object' && result !== null ? { structuredContent: result } : {}),
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          const code = err instanceof Error && 'code' in err ? (err as { code?: unknown }).code : undefined
          reply({
            content: [{ type: 'text', text: message }],
            isError: true,
            ...(code ? { structuredContent: { error: message, code } } : {}),
          })
        }
        return
      }
      default:
        fail(-32601, `method not found: ${request.method}`)
    }
  }

  return new Promise<void>((resolve) => {
    let buffer = ''
    let chain: Promise<void> = Promise.resolve()
    input.setEncoding('utf-8')
    input.on('data', (chunk: string | Buffer) => {
      buffer += String(chunk)
      let newline: number
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        if (!line) continue
        let parsed: unknown
        try {
          parsed = JSON.parse(line)
        } catch {
          send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } })
          continue
        }
        const messages = Array.isArray(parsed) ? parsed : [parsed]
        for (const message of messages) {
          if (!message || typeof message !== 'object' || typeof (message as JsonRpcRequest).method !== 'string') {
            send({ jsonrpc: '2.0', id: (message as JsonRpcRequest)?.id ?? null, error: { code: -32600, message: 'invalid request' } })
            continue
          }
          chain = chain.then(() => handle(message as JsonRpcRequest))
        }
      }
    })
    input.on('end', () => { chain.then(() => resolve()) })
    input.on('close', () => { chain.then(() => resolve()) })
  })
}
