import { existsSync, appendFileSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import type { Notice } from './types'

export type TraceKind = 'context' | 'search' | 'procedure' | 'validate'

export interface TraceOffered {
  id: string
  document: string
  section: string
  /** Why this passage was in the answer: a direct match, or how it was reached. */
  reason: string
}

export interface TraceEntry {
  /** The request's own id — the bundle id when the request produced one. */
  id: string
  kind: TraceKind
  /** How the consumer identified itself when it opened the set. */
  caller: string
  at: string
  /** The question, query or step the consumer asked for. */
  question: string
  outcome: 'answered' | 'refused'
  error?: { code: string; message: string }
  budget?: { declared: number; used: number }
  offered: TraceOffered[]
  /** Passages the consumer later reported using. Empty until it reports. */
  used: string[]
}

export interface TraceReport {
  entries: TraceEntry[]
  /** Requests the record no longer holds, because it keeps a bounded number. */
  dropped: number
  /** Set when the report was narrowed to one consumer. */
  caller?: string
}

export interface TraceReceipt {
  recorded: boolean
  /** Why the request could not be recorded — said once, then silenced. */
  reason?: string
  silenced?: boolean
}

/** How many requests a record keeps when the consumer does not say. */
export const DEFAULT_KEEP = 500

type Line =
  | { t: 'meta'; dropped: number }
  | { t: 'req'; e: TraceEntry }
  | { t: 'use'; id: string; used: string[] }

/**
 * An ordered, local record of the requests a documentation set answered: what
 * was asked, by whom, what was offered and what came back used. Append-only so
 * another program can read it while the set is still answering, and bounded so
 * it cannot grow without limit.
 */
export class TraceStore {
  readonly path: string
  readonly keep: number
  private writeFailed = false
  private lines: number | null = null

  constructor(path: string, options: { keep?: number } = {}) {
    this.path = path
    this.keep = options.keep && options.keep > 0 ? Math.floor(options.keep) : DEFAULT_KEEP
  }

  record(entry: TraceEntry): TraceReceipt {
    return this.append({ t: 'req', e: entry })
  }

  /** Attach what a consumer reported using to the request it came from. */
  attach(id: string, used: string[]): TraceReceipt {
    return this.append({ t: 'use', id, used })
  }

  report(options: { caller?: string } = {}): TraceReport {
    const folded = this.fold()
    let entries = folded.entries
    let dropped = folded.dropped
    if (entries.length > this.keep) {
      dropped += entries.length - this.keep
      entries = entries.slice(-this.keep)
    }
    if (options.caller === undefined) return { entries, dropped }
    return { entries: entries.filter((e) => e.caller === options.caller), dropped, caller: options.caller }
  }

  clear(): { cleared: boolean; removed: number } {
    const removed = this.fold().entries.length
    if (existsSync(this.path)) unlinkSync(this.path)
    this.lines = 0
    this.writeFailed = false
    return { cleared: true, removed }
  }

  private append(line: Line): TraceReceipt {
    try {
      appendFileSync(this.path, `${JSON.stringify(line)}\n`)
      this.lines = (this.lines ?? this.countLines()) + 1
      this.writeFailed = false
      this.compactIfLong()
      return { recorded: true }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      if (this.writeFailed) return { recorded: false, silenced: true }
      this.writeFailed = true
      return { recorded: false, reason: `the request could not be recorded: ${reason}` }
    }
  }

  /**
   * Keep the file from growing without limit. The bound itself is applied when
   * the record is read, so this is only about disk, and a failure to compact is
   * never worth telling the consumer about.
   */
  private compactIfLong(): void {
    if ((this.lines ?? 0) <= this.keep * 3) return
    try {
      const { entries, dropped } = this.fold()
      if (entries.length <= this.keep) return
      const kept = entries.slice(-this.keep)
      const lines: Line[] = [{ t: 'meta', dropped: dropped + entries.length - kept.length }]
      for (const e of kept) lines.push({ t: 'req', e })
      writeFileSync(this.path, lines.map((l) => `${JSON.stringify(l)}\n`).join(''))
      this.lines = lines.length
    } catch {
      // a record that cannot be compacted is still a usable record
    }
  }

  private countLines(): number {
    if (!existsSync(this.path)) return 0
    return readFileSync(this.path, 'utf-8').split('\n').filter((l) => l.trim()).length
  }

  private fold(): { entries: TraceEntry[]; dropped: number } {
    if (!existsSync(this.path)) return { entries: [], dropped: 0 }
    let raw: string
    try {
      raw = readFileSync(this.path, 'utf-8')
    } catch {
      return { entries: [], dropped: 0 }
    }
    const entries: TraceEntry[] = []
    let dropped = 0
    for (const text of raw.split('\n')) {
      if (!text.trim()) continue
      let line: Line
      try {
        line = JSON.parse(text) as Line
      } catch {
        continue // a half-written line is not a reason to lose the rest
      }
      if (line.t === 'meta') {
        dropped += line.dropped
      } else if (line.t === 'req') {
        entries.push({ ...line.e, used: line.e.used ?? [] })
      } else if (line.t === 'use') {
        for (let i = entries.length - 1; i >= 0; i--) {
          if (entries[i]!.id === line.id) {
            entries[i]!.used = line.used
            break
          }
        }
      }
    }
    return { entries, dropped }
  }
}

export function traceNotice(receipt: TraceReceipt): Notice | null {
  if (receipt.recorded || !receipt.reason) return null
  return { code: 'trace-not-recorded', message: receipt.reason }
}
