import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, posix, relative, resolve } from 'node:path'
import matter from 'gray-matter'
import { isoDaysAgo } from './dates.ts'

export interface LinkSpec {
  /** Target path relative to the project root. */
  target: string
  rel: string
}

export interface DocSpec {
  /** Path relative to the project root, e.g. "docs/reference/types.md". */
  path: string
  type?: string
  audience?: string[]
  owner?: string
  confidence?: string
  createdDaysAgo?: number
  verifiedDaysAgo?: number
  tags?: string[]
  dependsOn?: string[]
  links?: LinkSpec[]
  title?: string
  body?: string
  /** Raw overrides written verbatim into the dep: block, for invalid values. */
  raw?: Record<string, string>
  /** Metadata keys to leave out entirely, for the "missing field" scenarios. */
  omit?: string[]
  /** Extra markdown appended after the body, e.g. prose links. */
  append?: string
}

export interface AudienceSpec {
  id: string
  entry_point: string
}

export interface DocspecOverrides {
  docsRoot?: string
  audiences?: AudienceSpec[]
  reviewCadence?: Record<string, number>
  customTypes?: Array<{ id: string; extends: string }>
  customRelationships?: Array<{ id: string; meaning: string }>
  requireIndexFiles?: boolean
}

export const DEFAULT_AUDIENCES: AudienceSpec[] = [
  { id: 'ai-generator', entry_point: './seed.md' },
  { id: 'ai-agent', entry_point: './docs/tutorials/integrate-dep-into-agent.md' },
  { id: 'human-author', entry_point: './docs/tutorials/write-your-first-dep-document.md' },
  { id: 'project-lead', entry_point: './docs/tutorials/bootstrap-dep-for-your-project.md' },
]

export const DEFAULT_CADENCE: Record<string, number> = {
  tutorial: 90,
  'how-to': 60,
  reference: 30,
  explanation: 180,
  'decision-record': 365,
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/

function yamlScalar(value: string): string {
  if (ISO_DATE.test(value)) return value
  return JSON.stringify(value)
}

/**
 * A throwaway DEP project on disk.
 *
 * Steps describe the project they need ("a document tagged metadata"); this
 * builder turns that into the files the CLI reads.
 */
export class ProjectFixture {
  readonly root: string
  private audiences: AudienceSpec[] = DEFAULT_AUDIENCES
  private docspecOverrides: DocspecOverrides = {}
  seeded = false

  constructor(root: string) {
    this.root = root
    mkdirSync(root, { recursive: true })
  }

  // ── files ────────────────────────────────────────────────────────────────

  absolute(relPath: string): string {
    return resolve(this.root, relPath)
  }

  write(relPath: string, contents: string): string {
    const full = this.absolute(relPath)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, contents)
    return full
  }

  read(relPath: string): string {
    return readFileSync(this.absolute(relPath), 'utf-8')
  }

  exists(relPath: string): boolean {
    return existsSync(this.absolute(relPath))
  }

  remove(relPath: string): void {
    rmSync(this.absolute(relPath), { force: true, recursive: true })
  }

  /** The `dep:` metadata block of a document, as currently written to disk. */
  metadataOf(relPath: string): Record<string, any> {
    const parsed = matter(this.read(relPath))
    return (parsed.data.dep ?? {}) as Record<string, any>
  }

  /**
   * One metadata value exactly as written in the file.
   *
   * YAML parsers turn unquoted timestamps into dates; the CLI reports and
   * compares the text, so the text is what the assertions need.
   */
  declaredValue(relPath: string, field: string): string {
    const match = this.read(relPath).match(new RegExp(`^\\s+${field}:\\s*(.+)$`, 'm'))
    if (!match) throw new Error(`${relPath} declares no "${field}".`)
    return match[1]!.trim().replace(/^["']|["']$/g, '')
  }

  /** Everything after the frontmatter. */
  bodyOf(relPath: string): string {
    return matter(this.read(relPath)).content
  }

  // ── .docspec ─────────────────────────────────────────────────────────────

  configure(overrides: DocspecOverrides): this {
    this.docspecOverrides = { ...this.docspecOverrides, ...overrides }
    if (overrides.audiences) this.audiences = overrides.audiences
    this.writeDocspec()
    return this
  }

  writeDocspec(): this {
    const o = this.docspecOverrides
    const cadence = { ...DEFAULT_CADENCE, ...(o.reviewCadence ?? {}) }
    const lines: string[] = [
      'dep_version: "0.1.0"',
      '',
      'project:',
      '  name: "Fixture Project"',
      `  docs_root: "${o.docsRoot ?? './docs'}"`,
      '  description: "A throwaway project built for one acceptance scenario."',
      '',
      'audiences:',
    ]

    for (const audience of this.audiences) {
      lines.push(
        `  - id: ${audience.id}`,
        `    name: "${audience.id}"`,
        `    goal: "Exercise the ${audience.id} path"`,
        '    context: "Fixture audience"',
        `    entry_point: "${audience.entry_point}"`,
        '    vocabulary_level: intermediate',
        '    time_budget: scanning',
        '    success_criteria: "Reaches the documents meant for it"',
      )
    }

    lines.push(
      '',
      'architecture:',
      '  directory_map:',
      '    tutorials: docs/tutorials',
      '    how-to: docs/how-to',
      '    reference: docs/reference',
      '    explanation: docs/explanation',
      '    decision-records: docs/decision-records',
      `  require_index_files: ${o.requireIndexFiles ?? true}`,
      '  link_style: relative',
      '',
      'governance:',
      '  ownership_strategy: per-document',
      '  fallback_owner: "@dep-core"',
      '  review_cadence:',
    )
    for (const [type, days] of Object.entries(cadence)) {
      lines.push(`    ${type}: ${days}`)
    }

    if (o.customTypes?.length) {
      lines.push('', 'custom_types:')
      for (const t of o.customTypes) {
        lines.push(`  - id: ${t.id}`, `    extends: ${t.extends}`, '    additional_required_patterns: []')
      }
    }

    if (o.customRelationships?.length) {
      lines.push('', 'custom_relationships:')
      for (const r of o.customRelationships) {
        lines.push(`  - id: ${r.id}`, `    meaning: "${r.meaning}"`)
      }
    }

    lines.push('', 'generation:', '  ai_provider: constrained', '  require_human_review: false', '')

    this.write('.docspec', lines.join('\n'))
    return this
  }

  audienceIds(): string[] {
    return this.audiences.map((a) => a.id)
  }

  // ── documents ────────────────────────────────────────────────────────────

  addDoc(spec: DocSpec): string {
    const fm: string[] = ['---', 'dep:']
    const push = (key: string, value: string) => fm.push(`  ${key}: ${value}`)

    const raw = spec.raw ?? {}
    const omitted = new Set(spec.omit ?? [])
    const has = (key: string) => key in raw || omitted.has(key)

    if (!has('type')) push('type', yamlScalar(spec.type ?? 'reference'))
    if (!has('audience')) {
      const audience = spec.audience ?? ['human-author']
      fm.push('  audience:')
      for (const a of audience) fm.push(`    - ${a}`)
    }
    if (!has('owner')) push('owner', yamlScalar(spec.owner ?? '@dep-core'))
    if (!has('created')) push('created', isoDaysAgo(spec.createdDaysAgo ?? 200))
    if (!has('last_verified')) push('last_verified', isoDaysAgo(spec.verifiedDaysAgo ?? 1))
    if (!has('confidence')) push('confidence', yamlScalar(spec.confidence ?? 'high'))

    const dependsOn = spec.dependsOn ?? []
    if (!has('depends_on')) {
      if (dependsOn.length === 0) fm.push('  depends_on: []')
      else {
        fm.push('  depends_on:')
        for (const d of dependsOn) fm.push(`    - ${d}`)
      }
    }

    const tags = spec.tags ?? []
    if (!has('tags')) {
      if (tags.length === 0) fm.push('  tags: []')
      else {
        fm.push('  tags:')
        for (const t of tags) fm.push(`    - ${t}`)
      }
    }

    const links = spec.links ?? []
    if (links.length === 0) {
      if (!has('links')) fm.push('  links: []')
    } else {
      fm.push('  links:')
      for (const link of links) {
        fm.push(`    - target: ${this.relativeLink(spec.path, link.target)}`, `      rel: ${link.rel}`)
      }
    }

    for (const [key, value] of Object.entries(raw)) {
      fm.push(`  ${key}: ${value}`)
    }

    fm.push('---', '')

    const title = spec.title ?? titleFromPath(spec.path)
    const body = spec.body ?? `Placeholder prose for ${title}.`
    const append = spec.append ? `\n${spec.append}\n` : ''

    return this.write(spec.path, `${fm.join('\n')}\n# ${title}\n\n${body}\n${append}`)
  }

  /** A markdown file the parser will skip — no `dep:` block. */
  addPlainMarkdown(relPath: string, contents?: string): string {
    return this.write(
      relPath,
      contents ?? `# Not a DEP document\n\nThis file carries no DEP metadata at all.\n`,
    )
  }

  /** A markdown file with frontmatter but no `dep:` block. */
  addNonDepFrontmatter(relPath: string): string {
    return this.write(relPath, `---\ntitle: Plain\n---\n\n# Plain\n\nFrontmatter, but nothing DEP about it.\n`)
  }

  /** Link targets are written relative to the linking document's directory. */
  private relativeLink(fromDoc: string, targetFromRoot: string): string {
    const rel = posix.relative(posix.dirname(fromDoc), targetFromRoot)
    return rel.startsWith('.') ? rel : `./${rel}`
  }

  // ── the standard set ─────────────────────────────────────────────────────

  /**
   * A small, fully compliant documentation set: several types, typed links,
   * an index, every audience entry point present, no orphans, no cycles.
   */
  seedStandard(): this {
    if (this.seeded) return this
    this.seeded = true
    this.writeDocspec()

    this.addDoc({
      path: 'seed.md',
      type: 'explanation',
      audience: ['ai-generator'],
      tags: ['seed', 'protocol'],
      title: 'The DEP Seed',
      links: [{ target: 'docs/reference/metadata-schema.md', rel: 'TEACHES' }],
      body: 'The seed document defines the protocol every other document follows.',
    })

    this.addDoc({
      path: 'docs/index.md',
      type: 'reference',
      audience: ['human-author', 'ai-agent'],
      tags: ['index'],
      title: 'Documentation Index',
      links: [
        { target: 'docs/reference/types.md', rel: 'USES' },
        { target: 'docs/reference/review-cadence.md', rel: 'USES' },
        { target: 'docs/explanation/why-type-purity-matters.md', rel: 'USES' },
        { target: 'docs/decision-records/adr-001-metadata-in-frontmatter.md', rel: 'USES' },
        { target: 'docs/how-to/validate-a-document.md', rel: 'USES' },
      ],
      body: 'Every document in this set, listed by type.',
    })

    this.addDoc({
      path: 'docs/tutorials/write-your-first-dep-document.md',
      type: 'tutorial',
      audience: ['human-author'],
      tags: ['authoring'],
      title: 'Write Your First DEP Document',
      links: [
        { target: 'docs/reference/metadata-schema.md', rel: 'TEACHES' },
        { target: 'docs/how-to/validate-a-document.md', rel: 'NEXT' },
      ],
      body: 'Follow these steps to write a document that passes validation.',
    })

    this.addDoc({
      path: 'docs/tutorials/integrate-dep-into-agent.md',
      type: 'tutorial',
      audience: ['ai-agent'],
      tags: ['cli', 'agents'],
      title: 'Integrate DEP Into an Agent',
      links: [{ target: 'docs/reference/types.md', rel: 'TEACHES' }],
      body: 'Wire the dep CLI into an agent loop so it reads documentation on demand.',
    })

    this.addDoc({
      path: 'docs/tutorials/bootstrap-dep-for-your-project.md',
      type: 'tutorial',
      audience: ['project-lead'],
      tags: ['adoption'],
      title: 'Bootstrap DEP for Your Project',
      links: [{ target: 'docs/tutorials/write-your-first-dep-document.md', rel: 'NEXT' }],
      body: 'Create a .docspec and scaffold the directories your documentation will live in.',
    })

    this.addDoc({
      path: 'docs/how-to/validate-a-document.md',
      type: 'how-to',
      audience: ['human-author', 'ai-agent'],
      tags: ['validation', 'cli'],
      title: 'Validate a Document',
      links: [{ target: 'docs/reference/metadata-schema.md', rel: 'REQUIRES' }],
      body: [
        'Run validation before you publish anything.',
        '',
        'Validation reports one verdict per document and one for the set as a whole.',
      ].join('\n'),
    })

    this.addDoc({
      path: 'docs/reference/metadata-schema.md',
      type: 'reference',
      audience: ['ai-generator', 'ai-agent', 'human-author'],
      owner: '@dep-core',
      confidence: 'medium',
      tags: ['metadata', 'schema'],
      dependsOn: ['seed.md'],
      title: 'DEP Metadata Schema',
      body: [
        'Every field of the metadata block, with its constraints.',
        '',
        'The lifecycle state of a document is derived, never declared.',
        '',
        'A document is checked again once its review cadence has elapsed.',
        '',
        'Type purity is enforced per document, and validation reports it as a check.',
      ].join('\n'),
    })

    this.addDoc({
      path: 'docs/reference/types.md',
      type: 'reference',
      audience: ['ai-generator', 'human-author'],
      owner: '@docs-team',
      tags: ['types', 'schema'],
      title: 'Document Type Signatures',
      body: 'The five canonical document types and the mental operation each performs.',
    })

    this.addDoc({
      path: 'docs/reference/review-cadence.md',
      type: 'reference',
      audience: ['human-author'],
      owner: '@docs-team',
      tags: ['lifecycle'],
      title: 'Review Cadence and Freshness',
      body: [
        'How often each document type is re-verified, and what happens when it is not.',
        '',
        'A review cadence is declared per type in the project configuration.',
      ].join('\n'),
    })

    this.addDoc({
      path: 'docs/explanation/why-type-purity-matters.md',
      type: 'explanation',
      audience: ['human-author'],
      tags: ['type-purity', 'lifecycle'],
      title: 'Why Type Purity Matters',
      body: [
        'A document that answers two questions answers neither one well.',
        '',
        'Type purity keeps the lifecycle of a document independent of its neighbours,',
        'and it is the reason a long document is split rather than extended endlessly with more and more sections that nobody has the appetite to review.',
      ].join('\n'),
    })

    this.addDoc({
      path: 'docs/decision-records/adr-001-metadata-in-frontmatter.md',
      type: 'decision-record',
      audience: ['project-lead'],
      tags: ['metadata'],
      title: 'ADR-001: Metadata Lives in Frontmatter',
      body: 'Metadata is carried in YAML frontmatter so that a document stays a single file.',
    })

    return this
  }

  /**
   * The standard set, widened so that every query dimension has both a
   * matching and a non-matching document: mixed owners, confidences,
   * freshness states, tags and audiences.
   */
  seedVaried(): this {
    this.seedStandard()

    this.addDoc({
      path: 'docs/reference/stale-reference.md',
      type: 'reference',
      audience: ['ai-agent'],
      owner: '@dep-core',
      confidence: 'low',
      tags: ['metadata', 'cli'],
      verifiedDaysAgo: 200,
      title: 'A Reference Nobody Has Re-verified',
      body: 'This reference is well past its review cadence.',
    })

    this.addDoc({
      path: 'docs/how-to/add-dep-metadata.md',
      type: 'how-to',
      audience: ['ai-agent'],
      owner: '@docs-team',
      confidence: 'low',
      tags: ['metadata'],
      title: 'Add DEP Metadata to a Document',
      body: 'Add the metadata block to a document that does not yet carry one.',
    })

    // Keep both newcomers reachable so the set has no accidental orphans.
    this.addDoc({
      path: 'docs/index.md',
      type: 'reference',
      audience: ['human-author', 'ai-agent'],
      tags: ['index'],
      title: 'Documentation Index',
      links: [
        { target: 'docs/reference/types.md', rel: 'USES' },
        { target: 'docs/reference/review-cadence.md', rel: 'USES' },
        { target: 'docs/reference/stale-reference.md', rel: 'USES' },
        { target: 'docs/explanation/why-type-purity-matters.md', rel: 'USES' },
        { target: 'docs/decision-records/adr-001-metadata-in-frontmatter.md', rel: 'USES' },
        { target: 'docs/how-to/validate-a-document.md', rel: 'USES' },
        { target: 'docs/how-to/add-dep-metadata.md', rel: 'USES' },
      ],
      body: 'Every document in this set, listed by type.',
    })

    return this
  }
}

function titleFromPath(path: string): string {
  const base = path.split('/').pop()!.replace(/\.md$/, '')
  return base
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function relativeToRoot(root: string, absolutePath: string): string {
  return relative(root, absolutePath)
}

export { join }
