/**
 * Messages between owners, and to and from the person: plain markdown files
 * in `inbox/<owner>/`, outside the documentation, so they are versioned with
 * the project but never served as context.
 *
 * A message's file name comes from its dedupe key, so sending the same
 * message twice — a beat run again after a crash — writes nothing new.
 */
import { createHash } from 'crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { parse as parseYaml, stringify } from 'yaml'

export type MessageKind = 'question' | 'answer' | 'task' | 'notice' | 'escalation'

export interface Message {
  id: string
  from: string
  to: string
  kind: MessageKind
  /** The document or message it is about. */
  re?: string
  created_at: string
  read: boolean
  dedupe: string
  /** The exchange it belongs to: the id of the message that started it. */
  thread?: string
  /** How many messages between owners the exchange has had, this one included. */
  hops?: number
  urgent?: boolean
  /** Held until then: the person's quiet hours. */
  deliver_at?: string
  body: string
  /** Where it is, relative to the project root. */
  path: string
}

export const INBOX = 'inbox'

export const box = (owner: string) => owner.replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, '_') || 'unnamed'
const idFor = (dedupe: string) => `msg.${createHash('sha256').update(dedupe).digest('hex').slice(0, 12)}`
const FRONT = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

function parse(root: string, path: string): Message | null {
  const text = readFileSync(join(root, path), 'utf-8')
  const m = FRONT.exec(text)
  const meta = (m ? parseYaml(m[1]!) : null) as { message?: Omit<Message, 'body' | 'path'> } | null
  if (!meta?.message) return null
  const created = meta.message.created_at as unknown
  const deliver = meta.message.deliver_at as unknown
  return {
    ...meta.message, created_at: created instanceof Date ? created.toISOString() : String(created),
    ...(deliver ? { deliver_at: deliver instanceof Date ? deliver.toISOString() : String(deliver) } : {}),
    body: text.slice(m![0].length).trim(), path }
}

/** Every message in an owner's inbox, oldest first. Given a time, only what has been delivered by then. */
export function inbox(root: string, owner: string, options: { now?: Date } = {}): Message[] {
  const dir = join(root, INBOX, box(owner))
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
    .map((f) => parse(root, `${INBOX}/${box(owner)}/${f}`))
    .filter((m): m is Message => m !== null)
    .filter((m) => !options.now || !m.deliver_at || new Date(m.deliver_at).getTime() <= options.now.getTime())
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
}

/** Where the message with this dedupe key to this owner is, relative to the project root. */
export const messagePath = (to: string, dedupe: string) => `${INBOX}/${box(to)}/${idFor(dedupe)}.md`

/** Send a message. Returns it, and whether it was new: the same dedupe key never sends twice. */
export interface Outgoing {
  from: string
  to: string
  kind: MessageKind
  re?: string
  body: string
  dedupe: string
  at: Date
  thread?: string
  hops?: number
  urgent?: boolean
  deliverAt?: Date | null
}

export function send(root: string, m: Outgoing): { message: Message; sent: boolean } {
  const id = idFor(m.dedupe)
  const path = `${INBOX}/${box(m.to)}/${id}.md`
  const full = join(root, path)
  if (existsSync(full)) return { message: parse(root, path)!, sent: false }
  const meta = {
    id, from: m.from, to: m.to, kind: m.kind, ...(m.re ? { re: m.re } : {}), created_at: m.at.toISOString(), read: false, dedupe: m.dedupe,
    thread: m.thread ?? id, hops: m.hops ?? 1, ...(m.urgent ? { urgent: true } : {}), ...(m.deliverAt ? { deliver_at: m.deliverAt.toISOString() } : {}),
  }
  mkdirSync(join(root, INBOX, box(m.to)), { recursive: true })
  writeFileSync(full, `---\n${stringify({ message: meta })}---\n${m.body.trim()}\n`)
  return { message: { ...meta, body: m.body.trim(), path }, sent: true }
}

export function markRead(root: string, message: Message): void {
  const text = readFileSync(join(root, message.path), 'utf-8')
  const m = FRONT.exec(text)!
  const meta = parseYaml(m[1]!) as { message: Record<string, unknown> }
  if (meta.message.read === true) return
  meta.message.read = true
  writeFileSync(join(root, message.path), `---\n${stringify(meta)}---\n${text.slice(m[0].length)}`)
}
