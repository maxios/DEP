import { resolve, relative } from 'path'
import { buildGraph } from '../graph'
import { readDepFile, writeDepFile, generateTimestamp, resolveFiles, resolveAllDepFiles } from '../writer'
import type { DepNode } from '../types'

interface BumpFlags {
  json?: boolean
  dry?: boolean
  all?: boolean
  type?: string
  audience?: string
  tag?: string
  confidence?: string
  lifecycle?: string
  owner?: string
}

export function bumpCommand(root: string, fileOrGlob: string | undefined, flags: BumpFlags) {
  let targetFiles: string[]

  if (flags.all) {
    targetFiles = resolveAllDepFiles(root)

    // Apply filters if specified — need graph for lifecycle
    if (flags.type || flags.audience || flags.tag || flags.confidence || flags.lifecycle || flags.owner) {
      const graph = buildGraph(root)
      const matchingPaths = new Set<string>()

      for (const [, node] of graph.nodes) {
        if (flags.type && node.metadata.type !== flags.type) continue
        if (flags.audience && !node.metadata.audience.includes(flags.audience)) continue
        if (flags.tag && !node.metadata.tags.includes(flags.tag)) continue
        if (flags.confidence && node.metadata.confidence !== flags.confidence) continue
        if (flags.lifecycle && node.lifecycle !== flags.lifecycle.toUpperCase()) continue
        if (flags.owner && node.metadata.owner !== flags.owner) continue
        matchingPaths.add(resolve(root, node.path))
      }

      targetFiles = targetFiles.filter((f) => matchingPaths.has(f))
    }
  } else if (fileOrGlob) {
    targetFiles = resolveFiles(fileOrGlob, root)
  } else {
    console.error('Usage: dep bump <file|glob> [--all] [--type X] [--lifecycle STALE] [--dry] [--json]')
    process.exit(1)
  }

  if (targetFiles.length === 0) {
    if (flags.json) {
      console.log(JSON.stringify({ updated: [] }))
    } else {
      console.log('No matching documents found.')
    }
    return
  }

  const timestamp = generateTimestamp()
  const results: Array<{ path: string; old: string; new: string }> = []
  const skipped: string[] = []

  for (const filePath of targetFiles) {
    try {
      const fileData = readDepFile(filePath)
      const rawOld = fileData.dep.last_verified
      const oldValue = rawOld instanceof Date ? rawOld.toISOString() : (rawOld ?? 'unset')

      if (!flags.dry) {
        fileData.dep.last_verified = timestamp
        writeDepFile(filePath, fileData)
      }

      results.push({
        path: relative(root, filePath),
        old: oldValue,
        new: timestamp,
      })
    } catch {
      skipped.push(relative(root, filePath))
    }
  }

  if (flags.json) {
    console.log(JSON.stringify({ updated: results, skipped, dry: !!flags.dry }, null, 2))
  } else {
    if (flags.dry) {
      console.log('Dry run — no files modified.\n')
    }
    for (const r of results) {
      console.log(`${flags.dry ? '[dry] ' : ''}${r.path}`)
      console.log(`  ${r.old} → ${r.new}`)
    }
    if (skipped.length > 0) {
      console.log(`\nSkipped (no dep: block): ${skipped.join(', ')}`)
    }
    console.log(`\n${results.length} document(s) ${flags.dry ? 'would be ' : ''}updated.`)
  }
}
