import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs'
import { parse as yamlParse, stringify as yamlStringify } from 'yaml'
import { join, relative, resolve } from 'path'
import { loadDocspec } from './config'
import type { DocspecConfig } from './types'

export interface DepFileData {
  dep: Record<string, any>
  body: string
  raw: string
}

const VALID_CONFIDENCE = ['high', 'medium', 'low', 'stale']
const CANONICAL_TYPES = ['tutorial', 'how-to', 'reference', 'explanation', 'decision-record']
const CANONICAL_RELS = ['TEACHES', 'USES', 'EXPLAINS', 'DECIDES', 'REQUIRES', 'NEXT']

const SCALAR_FIELDS = ['type', 'owner', 'confidence', 'created', 'last_verified', 'superseded_by', 'review_trigger']
const ARRAY_FIELDS = ['audience', 'depends_on', 'tags', 'participants']

export function readDepFile(filePath: string): DepFileData {
  const raw = readFileSync(filePath, 'utf-8')
  // Extract frontmatter boundaries
  const firstFence = raw.indexOf('---')
  const secondFence = raw.indexOf('---', firstFence + 3)
  if (firstFence === -1 || secondFence === -1) {
    throw new Error(`No frontmatter found in ${filePath}`)
  }
  const fmContent = raw.slice(firstFence + 3, secondFence).trim()

  // Parse the YAML but convert dates back to strings for clean output
  const parsed = yamlParse(fmContent)
  if (!parsed?.dep) {
    throw new Error(`No dep: block in frontmatter of ${filePath}`)
  }
  const dep = parsed.dep

  // Convert any Date objects back to ISO strings
  for (const [key, val] of Object.entries(dep)) {
    if (val instanceof Date) {
      dep[key] = val.toISOString()
    }
  }

  const body = raw.slice(secondFence + 3)

  return { dep, body, raw }
}

export function writeDepFile(filePath: string, fileData: DepFileData): void {
  const raw = fileData.raw

  // Find the dep: block in the original frontmatter and replace it
  const firstFence = raw.indexOf('---')
  const secondFence = raw.indexOf('---', firstFence + 3)
  const beforeFm = raw.slice(0, firstFence)
  const body = fileData.body

  // Serialize just the dep block with yaml package (preserves strings, no Date coercion)
  const depYaml = yamlStringify({ dep: fileData.dep }, {
    lineWidth: 0,
  }).trim()

  // Reconstruct: use only dep block (all our docs only have dep: in frontmatter)
  // body typically starts with \n from original parse — preserve it as-is
  const output = `${beforeFm}---\n${depYaml}\n---${body}`
  writeFileSync(filePath, output)
}

export function generateTimestamp(): string {
  const now = new Date()
  const offset = -now.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')
  const minutes = String(Math.abs(offset) % 60).padStart(2, '0')
  const tz = `${sign}${hours}:${minutes}`
  return now.toISOString().replace('Z', '') + tz
}

export function validateField(
  field: string,
  value: string,
  config?: DocspecConfig,
): string | null {
  if (field === 'confidence') {
    if (!VALID_CONFIDENCE.includes(value)) {
      return `Invalid confidence "${value}". Must be one of: ${VALID_CONFIDENCE.join(', ')}`
    }
  }

  if (field === 'type') {
    const customTypes = config?.custom_types?.map((t) => t.id) ?? []
    const validTypes = [...CANONICAL_TYPES, ...customTypes]
    if (!validTypes.includes(value)) {
      return `Invalid type "${value}". Must be one of: ${validTypes.join(', ')}`
    }
  }

  if (field === 'audience' && config) {
    const audienceIds = config.audiences.map((a) => a.id)
    const values = value.split(',').map((v) => v.trim())
    const invalid = values.filter((v) => !audienceIds.includes(v))
    if (invalid.length > 0) {
      return `Invalid audience(s): ${invalid.join(', ')}. Valid: ${audienceIds.join(', ')}`
    }
  }

  if (field === 'created' || field === 'last_verified') {
    const parsed = new Date(value)
    if (isNaN(parsed.getTime())) {
      return `Invalid date "${value}". Must be valid ISO 8601`
    }
  }

  return null
}

export function validateRel(rel: string, config?: DocspecConfig): string | null {
  const customRels = config?.custom_relationships?.map((r) => r.id) ?? []
  const validRels = [...CANONICAL_RELS, ...customRels]
  if (!validRels.includes(rel)) {
    return `Invalid relationship "${rel}". Must be one of: ${validRels.join(', ')}`
  }
  return null
}

export function parseFieldValue(field: string, value: string): any {
  if (ARRAY_FIELDS.includes(field)) {
    return value.split(',').map((v) => v.trim())
  }
  return value
}

export function isValidField(field: string): boolean {
  return [...SCALAR_FIELDS, ...ARRAY_FIELDS].includes(field)
}

export function resolveFiles(
  pattern: string,
  root: string,
): string[] {
  const fullPath = resolve(root, pattern)

  // Single file
  if (existsSync(fullPath) && statSync(fullPath).isFile()) {
    return [fullPath]
  }

  // Glob-like pattern — walk and match
  const config = loadDocspec(root)
  const docsRoot = join(root, config.project.docs_root)
  const files: string[] = []

  function walk(dir: string) {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir)) {
      const fp = join(dir, entry)
      const stat = statSync(fp)
      if (stat.isDirectory()) {
        walk(fp)
      } else if (entry.endsWith('.md')) {
        files.push(fp)
      }
    }
  }

  walk(docsRoot)

  // Also include seed.md
  const seedPath = join(root, 'seed.md')
  if (existsSync(seedPath)) files.push(seedPath)

  // Filter by glob pattern if it contains wildcards
  if (pattern.includes('*')) {
    const glob = new Bun.Glob(pattern)
    return files.filter((f) => glob.match(relative(root, f)))
  }

  return files
}

export function resolveAllDepFiles(root: string): string[] {
  const config = loadDocspec(root)
  const docsRoot = join(root, config.project.docs_root)
  const files: string[] = []

  function walk(dir: string) {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir)) {
      const fp = join(dir, entry)
      const stat = statSync(fp)
      if (stat.isDirectory()) {
        walk(fp)
      } else if (entry.endsWith('.md')) {
        files.push(fp)
      }
    }
  }

  walk(docsRoot)

  const seedPath = join(root, 'seed.md')
  if (existsSync(seedPath)) files.push(seedPath)

  return files
}
