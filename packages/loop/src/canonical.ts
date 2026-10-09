/**
 * One spelling for any value, so a fingerprint depends on content and never on
 * the order something happened to be inserted in. Keys are sorted; numbers are
 * written the way the engine wrote them, which is the same on every engine.
 */
import { createHash } from 'crypto'

export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  const keys = Object.keys(value as Record<string, unknown>).sort()
  return '{' + keys
    .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
    .map((k) => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k]))
    .join(',') + '}'
}

export function fingerprint(value: unknown): string {
  return createHash('sha256').update(canonical(value)).digest('hex')
}

/** Derive a child seed from a parent and a path, so every day and episode has its own stream. */
export function deriveSeed(...parts: Array<number | string>): number {
  const digest = createHash('sha256').update(parts.join('/')).digest()
  return digest.readUInt32LE(0)
}
