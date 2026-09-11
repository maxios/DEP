import { spawn, type ChildProcess } from 'child_process'
import { CLI_ENTRY } from './world'

type Message = { jsonrpc: '2.0'; id?: number | string | null; result?: any; error?: any; method?: string }

/** A minimal MCP client over stdio, enough to drive the server in tests. */
export class McpClient {
  private child: ChildProcess
  private buffer = ''
  private pending = new Map<number, { resolve: (m: Message) => void }>()
  private nextId = 1
  /** Messages that answered nothing we asked (a server bug if any appear). */
  unsolicited: Message[] = []
  stderr = ''

  constructor(root: string) {
    this.child = spawn('bun', ['run', CLI_ENTRY, 'mcp', '--root', root], { stdio: ['pipe', 'pipe', 'pipe'] })
    this.child.stdout!.setEncoding('utf-8')
    this.child.stdout!.on('data', (chunk: string) => {
      this.buffer += chunk
      let nl: number
      while ((nl = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, nl).trim()
        this.buffer = this.buffer.slice(nl + 1)
        if (!line) continue
        const message = JSON.parse(line) as Message
        const waiting = typeof message.id === 'number' ? this.pending.get(message.id) : undefined
        if (waiting) {
          this.pending.delete(message.id as number)
          waiting.resolve(message)
        } else {
          this.unsolicited.push(message)
        }
      }
    })
    this.child.stderr!.setEncoding('utf-8')
    this.child.stderr!.on('data', (chunk: string) => { this.stderr += chunk })
  }

  request(method: string, params?: Record<string, unknown>): Promise<Message> {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve })
      this.child.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) }) + '\n')
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`no answer to ${method} within 15s; stderr: ${this.stderr}`)) } }, 15_000)
    })
  }

  notify(method: string, params?: Record<string, unknown>) {
    this.child.stdin!.write(JSON.stringify({ jsonrpc: '2.0', method, ...(params ? { params } : {}) }) + '\n')
  }

  async initialize() {
    const reply = await this.request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'story', version: '0' } })
    this.notify('notifications/initialized')
    return reply
  }

  call(name: string, args: Record<string, unknown> = {}) {
    return this.request('tools/call', { name, arguments: args })
  }

  close() {
    try { this.child.stdin!.end() } catch {}
    try { this.child.kill() } catch {}
  }
}
