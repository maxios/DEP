/**
 * Proposals: a new version of a document that waits for a person before it
 * becomes documentation.
 *
 * Anything that writes documents on its own — the loop writing out what an
 * agent learned, for one — proposes instead. A proposal is kept outside the
 * documentation, in `.dep-proposals/`, so nothing in it is served as context
 * until someone accepts it. Each records a fingerprint of the document as it
 * stood when proposed; if the document changes in the meantime, accepting is
 * refused rather than overwriting what changed.
 */
import { createHash } from 'crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { DepError } from './errors'

export const PROPOSALS_DIR = '.dep-proposals'

export interface Proposal {
  /** The document it would replace or create, relative to the project root. */
  document: string
  /** Who proposed it. */
  from: string
  at: string
  /** The document as it is now; null when it does not exist yet. */
  current: string | null
  proposed: string
  /** The document has changed since this was proposed; accepting it would overwrite that change. */
  changedSince: boolean
}

interface Stored {
  document: string
  from: string
  at: string
  base: string | null
  proposed: string
}

const sha = (text: string) => createHash('sha256').update(text).digest('hex')
const fileOf = (root: string, document: string) => join(root, PROPOSALS_DIR, `${sha(document).slice(0, 16)}.json`)

function currentText(root: string, document: string): string | null {
  const full = resolve(root, document)
  return existsSync(full) ? readFileSync(full, 'utf-8') : null
}

function load(root: string, document: string): Stored {
  const file = fileOf(root, document)
  if (!existsSync(file)) throw new DepError('UNKNOWN_PROPOSAL', `nothing is waiting for review for ${document}`, { document })
  return JSON.parse(readFileSync(file, 'utf-8')) as Stored
}

/** Propose a new version of a document. A later proposal for the same document replaces an earlier one. */
export function propose(root: string, document: string, proposed: string, from: string, now: Date = new Date()): Proposal {
  const current = currentText(root, document)
  const stored: Stored = { document, from, at: now.toISOString(), base: current === null ? null : sha(current), proposed }
  const file = fileOf(root, document)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(stored, null, 2) + '\n')
  return { document, from, at: stored.at, current, proposed, changedSince: false }
}

export function listProposals(root: string): Proposal[] {
  const dir = join(root, PROPOSALS_DIR)
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => {
    const s = JSON.parse(readFileSync(join(dir, f), 'utf-8')) as Stored
    const current = currentText(root, s.document)
    return { document: s.document, from: s.from, at: s.at, current, proposed: s.proposed, changedSince: (current === null ? null : sha(current)) !== s.base }
  }).sort((a, b) => a.document.localeCompare(b.document))
}

/** Land a proposal, unless the document changed after it was proposed. */
export function acceptProposal(root: string, document: string): { document: string; accepted: true } {
  const s = load(root, document)
  const current = currentText(root, document)
  if ((current === null ? null : sha(current)) !== s.base) {
    throw new DepError('PROPOSAL_STALE', `${document} changed after this was proposed; it was left as it is`, { document })
  }
  const full = resolve(root, document)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, s.proposed)
  rmSync(fileOf(root, document))
  return { document, accepted: true }
}

export function rejectProposal(root: string, document: string): { document: string; rejected: true } {
  load(root, document)
  rmSync(fileOf(root, document))
  return { document, rejected: true }
}
