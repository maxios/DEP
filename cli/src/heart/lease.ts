/**
 * Leases: the exclusive right, for a while, to act on one document. A beat
 * takes a lease on each document it will act on and skips any another beat
 * holds; a lease that has run out can be taken over. Leases live in
 * `.leases/`, which is never committed.
 */
import { createHash } from 'crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface Lease {
  document: string
  agent: string
  beatId: string
  expires: string
}

const fileFor = (root: string, document: string) =>
  join(root, '.leases', `${createHash('sha256').update(document).digest('hex').slice(0, 16)}.json`)

export function heldBy(root: string, document: string, now: Date): Lease | null {
  const file = fileFor(root, document)
  if (!existsSync(file)) return null
  const lease = JSON.parse(readFileSync(file, 'utf-8')) as Lease
  return new Date(lease.expires).getTime() > now.getTime() ? lease : null
}

/** Take the lease unless another beat holds it. The same beat taking it again is fine. */
export function take(root: string, document: string, agent: string, beatId: string, now: Date, ttlMs: number): boolean {
  const held = heldBy(root, document, now)
  if (held && held.beatId !== beatId) return false
  mkdirSync(join(root, '.leases'), { recursive: true })
  const lease: Lease = { document, agent, beatId, expires: new Date(now.getTime() + ttlMs).toISOString() }
  writeFileSync(fileFor(root, document), JSON.stringify(lease) + '\n')
  return true
}

export function release(root: string, document: string, beatId: string): void {
  const file = fileFor(root, document)
  if (!existsSync(file)) return
  const lease = JSON.parse(readFileSync(file, 'utf-8')) as Lease
  if (lease.beatId === beatId) rmSync(file)
}
