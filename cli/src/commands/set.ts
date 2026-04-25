import { resolve, relative } from 'path'
import { readDepFile, writeDepFile, validateField, parseFieldValue, isValidField } from '../writer'
import { loadDocspec } from '../config'

interface SetFlags {
  json?: boolean
  dry?: boolean
  [field: string]: string | boolean | undefined
}

export function setCommand(root: string, file: string, flags: SetFlags) {
  const filePath = resolve(root, file)
  const config = loadDocspec(root)

  // Collect field updates from flags
  const updates: Array<{ field: string; value: string }> = []
  for (const [key, val] of Object.entries(flags)) {
    if (['json', 'dry', 'root'].includes(key)) continue
    if (typeof val !== 'string') continue
    if (!isValidField(key)) {
      console.error(`Unknown metadata field: ${key}`)
      console.error(`Valid fields: type, audience, owner, created, last_verified, confidence, depends_on, tags, superseded_by, review_trigger, participants`)
      process.exit(1)
    }
    updates.push({ field: key, value: val })
  }

  if (updates.length === 0) {
    console.error('Usage: dep set <file> --<field> <value> [--dry] [--json]')
    console.error('Example: dep set docs/ref/schema.md --confidence high --owner "@dep-core"')
    process.exit(1)
  }

  // Validate all values before writing
  for (const { field, value } of updates) {
    const error = validateField(field, value, config)
    if (error) {
      console.error(error)
      process.exit(1)
    }
  }

  let fileData
  try {
    fileData = readDepFile(filePath)
  } catch (e: any) {
    console.error(e.message)
    process.exit(1)
  }

  const changes: Array<{ field: string; old: any; new: any }> = []

  for (const { field, value } of updates) {
    const rawOld = fileData.dep[field]
    const oldValue = rawOld instanceof Date ? rawOld.toISOString() : (rawOld ?? 'unset')
    const newValue = parseFieldValue(field, value)
    changes.push({ field, old: oldValue, new: newValue })

    if (!flags.dry) {
      fileData.dep[field] = newValue
    }
  }

  if (!flags.dry) {
    writeDepFile(filePath, fileData)
  }

  const relPath = relative(root, filePath)

  if (flags.json) {
    console.log(JSON.stringify({ path: relPath, changes, dry: !!flags.dry }, null, 2))
  } else {
    if (flags.dry) {
      console.log('Dry run — file not modified.\n')
    }
    console.log(relPath)
    for (const c of changes) {
      const oldStr = Array.isArray(c.old) ? c.old.join(', ') : String(c.old)
      const newStr = Array.isArray(c.new) ? c.new.join(', ') : String(c.new)
      console.log(`  ${c.field}: ${oldStr} → ${newStr}`)
    }
  }
}
