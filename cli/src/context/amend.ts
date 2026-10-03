/**
 * Changing a document's metadata as a value, not as a printed command: one
 * amendment in, a record of what changed out, a DepError when the amendment
 * is not one the schema allows. Built on the same frontmatter primitives the
 * `dep set` / `bump` / `tag` / `link` commands use, so the two agree about
 * what a valid change is.
 */
import { existsSync } from 'fs'
import { resolve, relative, dirname } from 'path'
import {
  readDepFile, writeDepFile, generateTimestamp,
  validateField, validateRel, parseFieldValue, isValidField,
} from '../writer'
import { posix } from '../paths'
import { DepError } from './errors'
import type { DocspecConfig } from '../types'

export interface Amendment {
  /** Set last_verified to now. */
  bump?: boolean
  /** Metadata fields to assign, by their frontmatter names. */
  set?: Record<string, string>
  tags?: { add?: string[]; remove?: string[] }
  link?: { target: string; rel?: string; remove?: boolean }
}

export interface AmendChange {
  field: string
  from: unknown
  to: unknown
}

export interface AmendResult {
  document: string
  changes: AmendChange[]
}

function readable(value: unknown): unknown {
  return value instanceof Date ? value.toISOString() : (value ?? null)
}

export function amendDocument(root: string, config: DocspecConfig, document: string, amendment: Amendment): AmendResult {
  const filePath = resolve(root, document)
  if (!existsSync(filePath)) {
    throw new DepError('DOCUMENT_NOT_FOUND', `${document} is not a document in the set`, { document })
  }

  let fileData
  try {
    fileData = readDepFile(filePath)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new DepError('DOCUMENT_NOT_FOUND', message, { document })
  }

  const changes: AmendChange[] = []

  if (amendment.set) {
    for (const [field, raw] of Object.entries(amendment.set)) {
      const value = String(raw)
      if (!isValidField(field)) {
        throw new DepError('INVALID_OPTION', `"${field}" is not a DEP metadata field`, { field })
      }
      const problem = validateField(field, value, config)
      if (problem) throw new DepError('INVALID_OPTION', problem, { field, value })
      const to = parseFieldValue(field, value)
      changes.push({ field, from: readable(fileData.dep[field]), to })
      fileData.dep[field] = to
    }
  }

  if (amendment.bump) {
    const now = generateTimestamp()
    changes.push({ field: 'last_verified', from: readable(fileData.dep.last_verified), to: now })
    fileData.dep.last_verified = now
  }

  if (amendment.tags) {
    const before: string[] = fileData.dep.tags ?? []
    let tags = [...before]
    for (const tag of amendment.tags.add ?? []) {
      const clean = tag.trim()
      if (!clean) throw new DepError('INVALID_OPTION', 'a tag cannot be empty', { tag })
      if (!tags.includes(clean)) tags.push(clean)
    }
    const removing = (amendment.tags.remove ?? []).map((t) => t.trim())
    if (removing.length > 0) tags = tags.filter((t) => !removing.includes(t))
    if (tags.join(',') !== before.join(',')) {
      changes.push({ field: 'tags', from: before, to: tags })
      fileData.dep.tags = tags
    }
  }

  if (amendment.link) {
    const { target, rel, remove } = amendment.link
    if (!target) throw new DepError('INVALID_OPTION', 'a link needs a target document', {})
    const links: Array<{ target: string; rel: string }> = fileData.dep.links ?? []
    const here = dirname(filePath)
    const asWritten = posix(relative(here, resolve(root, target)))

    if (remove) {
      const kept = links.filter((l) => l.target !== asWritten && l.target !== target)
      if (kept.length === links.length) {
        throw new DepError('INVALID_OPTION', `${document} has no link to ${target}`, { target })
      }
      changes.push({ field: 'links', from: links, to: kept })
      fileData.dep.links = kept
    } else {
      if (!rel) throw new DepError('INVALID_OPTION', 'a link needs a relationship', { target })
      const problem = validateRel(rel, config)
      if (problem) throw new DepError('INVALID_OPTION', problem, { rel })
      if (!existsSync(resolve(root, target))) {
        throw new DepError('DOCUMENT_NOT_FOUND', `${target} is not a document in the set`, { document: target })
      }
      if (posix(relative(root, resolve(root, target))) === posix(relative(root, filePath))) {
        throw new DepError('INVALID_OPTION', 'a document cannot link to itself', { target })
      }
      const existing = links.find((l) => l.target === asWritten || l.target === target)
      const next = existing
        ? links.map((l) => (l === existing ? { ...l, rel } : l))
        : [...links, { target: asWritten, rel }]
      changes.push({ field: 'links', from: links, to: next })
      fileData.dep.links = next
    }
  }

  if (changes.length === 0) {
    throw new DepError('INVALID_OPTION', 'the amendment asked for no change', { document })
  }

  writeDepFile(filePath, fileData)
  return { document: posix(relative(root, filePath)), changes }
}
