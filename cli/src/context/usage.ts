import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { terms } from './tokens'
import type { Notice } from './types'

export interface UsageReceipt {
  recorded: boolean
  version?: number
  /** Why the report could not be recorded — said once, then silenced. */
  reason?: string
  silenced?: boolean
}

export interface UsageReport {
  version: number
  bundles: number
  passages: Record<string, { document: string; offered: number; used: number; questions: string[] }>
  /** Documents retrieved often and used rarely, most passed-over first. */
  passedOver: Array<{ document: string; offered: number; used: number; passedOver: number; suggestion: 'rewrite-or-retire' }>
}

interface UsageFile {
  version: number
  bundles: Record<string, { question: string; passages: string[]; at: string }>
  passages: Record<string, { document: string; offered: number; used: number; terms: Record<string, number>; questions: string[] }>
}

export interface OfferedBundle {
  question: string
  passages: Array<{ id: string; document: string }>
}

const EMPTY: UsageFile = { version: 0, bundles: {}, passages: {} }
const USAGE_BOOST = 0.5
const REMEMBERED_BUNDLES = 200

/**
 * What consumers reported actually using. Local to the project, written only
 * when a report arrives, and additive: with nothing recorded, ranking is
 * exactly what it would be without a record.
 */
export class UsageStore {
  readonly path: string
  private data: UsageFile | null = null
  private offered = new Map<string, OfferedBundle>()
  private writeFailed = false

  constructor(path: string) {
    this.path = path
  }

  get version(): number {
    return this.load().version
  }

  /** Remember a bundle so a later report about it can be checked. */
  offer(bundleId: string, bundle: OfferedBundle): void {
    this.offered.set(bundleId, bundle)
    if (this.offered.size > REMEMBERED_BUNDLES) {
      const oldest = this.offered.keys().next().value
      if (oldest !== undefined) this.offered.delete(oldest)
    }
  }

  knows(bundleId: string): OfferedBundle | null {
    const live = this.offered.get(bundleId)
    if (live) return live
    const stored = this.load().bundles[bundleId]
    if (!stored) return null
    const passages = stored.passages.map((id) => ({ id, document: this.load().passages[id]?.document ?? '' }))
    return { question: stored.question, passages }
  }

  /** Multiplier above 1 for a passage that has proved useful for questions like this one. */
  factor(passageId: string, questionTerms: string[]): number {
    const entry = this.load().passages[passageId]
    if (!entry || entry.offered === 0) return 1
    const distinct = [...new Set(questionTerms)]
    if (distinct.length === 0) return 1
    const overlap = distinct.filter((t) => entry.terms[t]).length / distinct.length
    return 1 + USAGE_BOOST * (entry.used / entry.offered) * overlap
  }

  record(bundleId: string, bundle: OfferedBundle, used: string[]): UsageReceipt {
    const data = this.load()
    const questionTerms = [...new Set(terms(bundle.question))]
    for (const p of bundle.passages) {
      const entry = data.passages[p.id] ?? { document: p.document, offered: 0, used: 0, terms: {}, questions: [] }
      entry.document = p.document || entry.document
      entry.offered++
      for (const t of questionTerms) entry.terms[t] = (entry.terms[t] ?? 0) + 1
      if (!entry.questions.includes(bundle.question)) entry.questions.push(bundle.question)
      data.passages[p.id] = entry
    }
    for (const id of new Set(used)) data.passages[id]!.used++
    data.bundles[bundleId] = { question: bundle.question, passages: bundle.passages.map((p) => p.id), at: new Date().toISOString() }
    data.version++
    return this.persist(data)
  }

  report(): UsageReport {
    const data = this.load()
    const byDocument = new Map<string, { offered: number; used: number }>()
    const passages: UsageReport['passages'] = {}
    for (const [id, entry] of Object.entries(data.passages)) {
      passages[id] = { document: entry.document, offered: entry.offered, used: entry.used, questions: [...entry.questions] }
      const doc = byDocument.get(entry.document) ?? { offered: 0, used: 0 }
      doc.offered += entry.offered
      doc.used += entry.used
      byDocument.set(entry.document, doc)
    }
    const passedOver = [...byDocument.entries()]
      .map(([document, d]) => ({ document, offered: d.offered, used: d.used, passedOver: d.offered - d.used, suggestion: 'rewrite-or-retire' as const }))
      .filter((d) => d.passedOver > 0)
      .sort((a, b) => b.passedOver - a.passedOver || a.document.localeCompare(b.document))
    return { version: data.version, bundles: Object.keys(data.bundles).length, passages, passedOver }
  }

  clear(): { cleared: boolean; removed: number } {
    const removed = Object.keys(this.load().passages).length
    if (existsSync(this.path)) unlinkSync(this.path)
    this.data = { ...EMPTY, bundles: {}, passages: {} }
    this.writeFailed = false
    return { cleared: true, removed }
  }

  private load(): UsageFile {
    if (this.data) return this.data
    if (existsSync(this.path)) {
      try {
        const parsed = JSON.parse(readFileSync(this.path, 'utf-8')) as Partial<UsageFile>
        this.data = { version: parsed.version ?? 0, bundles: parsed.bundles ?? {}, passages: parsed.passages ?? {} }
        return this.data
      } catch {
        // an unreadable record is treated as no record
      }
    }
    this.data = { ...EMPTY, bundles: {}, passages: {} }
    return this.data
  }

  private persist(data: UsageFile): UsageReceipt {
    try {
      writeFileSync(this.path, JSON.stringify(data, null, 2))
      this.data = data
      this.writeFailed = false
      return { recorded: true, version: data.version }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      if (this.writeFailed) return { recorded: false, silenced: true }
      this.writeFailed = true
      return { recorded: false, reason: `the usage record could not be written: ${reason}` }
    }
  }
}

export function usageNotice(receipt: UsageReceipt): Notice | null {
  if (receipt.recorded || !receipt.reason) return null
  return { code: 'usage-not-recorded', message: receipt.reason }
}
