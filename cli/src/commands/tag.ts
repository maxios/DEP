import { resolve, relative } from 'path'
import { readDepFile, writeDepFile } from '../writer'

interface TagFlags {
  add?: string
  remove?: string
  json?: boolean
}

export function tagCommand(root: string, file: string, flags: TagFlags) {
  if (!flags.add && !flags.remove) {
    console.error('Usage: dep tag <file> --add <tag> [--remove <tag>] [--json]')
    console.error('Example: dep tag docs/ref/schema.md --add cli,tools --remove draft')
    process.exit(1)
  }

  const filePath = resolve(root, file)

  let fileData
  try {
    fileData = readDepFile(filePath)
  } catch (e: any) {
    console.error(e.message)
    process.exit(1)
  }

  const currentTags: string[] = fileData.dep.tags ?? []
  let tags = [...currentTags]
  const added: string[] = []
  const removed: string[] = []
  const warnings: string[] = []

  if (flags.add) {
    const toAdd = flags.add.split(',').map((t) => t.trim())
    for (const tag of toAdd) {
      if (tags.includes(tag)) {
        warnings.push(`Tag "${tag}" already present`)
      } else {
        tags.push(tag)
        added.push(tag)
      }
    }
  }

  if (flags.remove) {
    const toRemove = flags.remove.split(',').map((t) => t.trim())
    for (const tag of toRemove) {
      if (!tags.includes(tag)) {
        warnings.push(`Tag "${tag}" not found`)
      } else {
        tags = tags.filter((t) => t !== tag)
        removed.push(tag)
      }
    }
  }

  fileData.dep.tags = tags
  writeDepFile(filePath, fileData)

  const relPath = relative(root, filePath)

  if (flags.json) {
    console.log(JSON.stringify({ path: relPath, tags, added, removed, warnings }, null, 2))
  } else {
    console.log(relPath)
    if (added.length > 0) console.log(`  added: ${added.join(', ')}`)
    if (removed.length > 0) console.log(`  removed: ${removed.join(', ')}`)
    if (warnings.length > 0) {
      for (const w of warnings) console.log(`  warning: ${w}`)
    }
    console.log(`  tags: [${tags.join(', ')}]`)
  }
}
