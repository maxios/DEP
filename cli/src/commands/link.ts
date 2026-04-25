import { resolve, relative } from 'path'
import { readDepFile, writeDepFile, validateRel } from '../writer'
import { loadDocspec } from '../config'

interface LinkFlags {
  target?: string
  rel?: string
  remove?: boolean
  json?: boolean
}

export function linkCommand(root: string, file: string, flags: LinkFlags) {
  if (!flags.target) {
    console.error('Usage: dep link <file> --target <path> --rel <REL> [--remove] [--json]')
    console.error('Example: dep link docs/ref/schema.md --target docs/ref/types.md --rel TEACHES')
    process.exit(1)
  }

  const filePath = resolve(root, file)
  const config = loadDocspec(root)

  let fileData
  try {
    fileData = readDepFile(filePath)
  } catch (e: any) {
    console.error(e.message)
    process.exit(1)
  }

  const links: Array<{ target: string; rel: string }> = fileData.dep.links ?? []
  const relPath = relative(root, filePath)

  if (flags.remove) {
    const before = links.length
    const filtered = links.filter((l) => l.target !== flags.target)
    if (filtered.length === before) {
      console.error(`No link to "${flags.target}" found in ${relPath}`)
      process.exit(1)
    }
    fileData.dep.links = filtered
    writeDepFile(filePath, fileData)

    if (flags.json) {
      console.log(JSON.stringify({ path: relPath, action: 'removed', target: flags.target, links: filtered }, null, 2))
    } else {
      console.log(`${relPath}`)
      console.log(`  removed link → ${flags.target}`)
      console.log(`  ${filtered.length} link(s) remaining`)
    }
    return
  }

  // Adding a link — rel is required
  if (!flags.rel) {
    console.error('--rel is required when adding a link. Valid: TEACHES, USES, EXPLAINS, DECIDES, REQUIRES, NEXT')
    process.exit(1)
  }

  const relError = validateRel(flags.rel, config)
  if (relError) {
    console.error(relError)
    process.exit(1)
  }

  // Check for duplicate
  const existing = links.find((l) => l.target === flags.target)
  if (existing) {
    if (existing.rel === flags.rel) {
      console.error(`Link to "${flags.target}" with rel "${flags.rel}" already exists`)
      process.exit(1)
    }
    // Update rel on existing link
    existing.rel = flags.rel
  } else {
    links.push({ target: flags.target, rel: flags.rel })
  }

  fileData.dep.links = links
  writeDepFile(filePath, fileData)

  if (flags.json) {
    console.log(JSON.stringify({ path: relPath, action: existing ? 'updated' : 'added', target: flags.target, rel: flags.rel, links }, null, 2))
  } else {
    console.log(`${relPath}`)
    console.log(`  ${existing ? 'updated' : 'added'} link → ${flags.target} [${flags.rel}]`)
    console.log(`  ${links.length} link(s) total`)
  }
}
