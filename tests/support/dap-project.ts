import { isoDaysAgo } from './dates.ts'
import type { ProjectFixture } from './project.ts'

export type NodeKind = 'observe' | 'decide' | 'act' | 'delegate'

const SYMBOL: Record<NodeKind, string> = {
  observe: '[?]',
  decide: '[>]',
  act: '[!]',
  delegate: '[@]',
}

export interface NodeSpec {
  id: string
  kind: NodeKind
  description?: string
  /** Emitted verbatim as `- **key**: value` lines, in the order given. */
  props?: Record<string, string | boolean | number | undefined>
  /** Decide nodes only: the condition table. */
  conditions?: Array<{ condition: string; next: string }>
}

export interface TreeSpec {
  id: string
  trigger: string
  entryNode: string
  nodes: NodeSpec[]
  triggerPatterns?: Array<string | { intent: string }>
  audience?: string[]
  owner?: string
  confidence?: string
  tags?: string[]
  dependsOn?: string[]
  verifiedDaysAgo?: number
  /** Frontmatter keys to leave out, for the "missing metadata" scenarios. */
  omitMetadata?: string[]
  /** Filename inside the trees directory. Defaults to `<id>.md`. */
  fileName?: string
}

export interface DapspecOverrides {
  reviewCadence?: number
  resolveDepRefs?: boolean
  docspecPath?: string
}

/**
 * The decision half of a fixture project: `dap/.dapspec` plus `dap/trees/*.md`.
 */
export class DapFixture {
  private readonly project: ProjectFixture
  private overrides: DapspecOverrides = {}
  initialised = false

  constructor(project: ProjectFixture) {
    this.project = project
  }

  init(overrides: DapspecOverrides = {}): this {
    this.overrides = { ...this.overrides, ...overrides }
    const o = this.overrides
    this.project.write(
      'dap/.dapspec',
      [
        'dap_version: "0.1.0"',
        '',
        'project:',
        '  name: "Fixture Trees"',
        '  trees_root: "./trees"',
        '  description: "Decision trees built for one acceptance scenario."',
        '',
        'dep_integration:',
        `  docspec_path: "${o.docspecPath ?? '../.docspec'}"`,
        `  resolve_dep_refs: ${o.resolveDepRefs ?? true}`,
        '',
        'intent_registry:',
        '  - id: report_success',
        '    description: "Report successful completion"',
        '    required_params: [message]',
        '  - id: escalate',
        '    description: "Escalate to a human operator"',
        '    required_params: [reason]',
        '  - id: validate_docs',
        '    description: "Run DEP validation and fix issues"',
        '    required_params: []',
        '',
        'governance:',
        `  review_cadence: ${o.reviewCadence ?? 60}`,
        '  fallback_owner: "@dep-core"',
        '',
      ].join('\n'),
    )
    this.initialised = true
    return this
  }

  addTree(spec: TreeSpec): string {
    if (!this.initialised) this.init()

    const omit = new Set(spec.omitMetadata ?? [])
    const fm: string[] = ['---', 'dap:']
    const push = (key: string, value: string) => {
      if (!omit.has(key)) fm.push(`  ${key}: ${value}`)
    }

    push('id', spec.id)
    push('version', '1')
    push('trigger', JSON.stringify(spec.trigger))

    if (spec.triggerPatterns?.length && !omit.has('trigger_patterns')) {
      fm.push('  trigger_patterns:')
      for (const pattern of spec.triggerPatterns) {
        if (typeof pattern === 'string') fm.push(`    - ${JSON.stringify(pattern)}`)
        else fm.push(`    - intent: ${pattern.intent}`)
      }
    }

    push('audience', `[${(spec.audience ?? ['ai-agent']).join(', ')}]`)
    push('owner', JSON.stringify(spec.owner ?? '@dep-core'))
    push('created', isoDaysAgo(120))
    push('last_verified', isoDaysAgo(spec.verifiedDaysAgo ?? 1))
    push('confidence', spec.confidence ?? 'high')

    const dependsOn = spec.dependsOn ?? []
    if (!omit.has('depends_on')) {
      if (dependsOn.length === 0) fm.push('  depends_on: []')
      else {
        fm.push('  depends_on:')
        for (const d of dependsOn) fm.push(`    - ${d}`)
      }
    }

    const tags = spec.tags ?? ['fixture']
    if (!omit.has('tags')) fm.push(`  tags: [${tags.join(', ')}]`)
    push('entry_node', spec.entryNode)

    fm.push('---', '')

    const body: string[] = [`# ${spec.id}`, '', `Decision tree fixture for ${spec.trigger}.`, '']

    for (const node of spec.nodes) {
      body.push(`## ${node.id} ${SYMBOL[node.kind]}`, '')
      if (node.description) body.push(node.description, '')

      for (const [key, value] of Object.entries(node.props ?? {})) {
        if (value === undefined) continue
        body.push(`- **${key}**: ${value}`)
      }
      if (node.props && Object.keys(node.props).length > 0) body.push('')

      if (node.conditions?.length) {
        body.push('| condition | next |', '| --- | --- |')
        for (const c of node.conditions) body.push(`| \`${c.condition}\` | ${c.next} |`)
        body.push('')
      }
    }

    const fileName = spec.fileName ?? `${spec.id}.md`
    return this.project.write(`dap/trees/${fileName}`, `${fm.join('\n')}\n${body.join('\n')}`)
  }

  /**
   * A sound `validate-and-fix` tree: an observe entry, a branching node with a
   * fallback, a human gate, a revision loop with a way out, a delegation and
   * terminal actions. Mirrors the shape of the project's own tree.
   */
  seedValidateAndFix(overrides: Partial<TreeSpec> = {}): string {
    return this.addTree({
      id: 'validate-and-fix',
      trigger: 'validate DEP documentation and fix issues',
      triggerPatterns: ['validate documentation', 'check docs for issues', { intent: 'validate_docs' }],
      tags: ['validation', 'quality'],
      entryNode: 'run-validation',
      nodes: [
        {
          id: 'run-validation',
          kind: 'observe',
          description: 'Run the DEP validator to get a structured report.',
          props: {
            method: 'tool_call',
            tool: 'dep_validate',
            args: '{ "flags": "--json", "root": "." }',
            outputs: 'validation_report, fail_count, warn_count',
            next: 'assess-results',
          },
        },
        {
          id: 'assess-results',
          kind: 'decide',
          description: 'Route on the validation outcome.',
          conditions: [
            { condition: 'fail_count == 0 AND warn_count == 0', next: 'report-clean' },
            { condition: 'fail_count == 0 AND warn_count > 0', next: 'present-warnings' },
            { condition: 'fail_count > 0', next: 'apply-fixes' },
            { condition: '_otherwise', next: 'report-clean' },
          ],
        },
        {
          id: 'present-warnings',
          kind: 'observe',
          description: 'Warnings found but no hard failures. Ask the author what to do.',
          props: {
            method: 'gate',
            prompt: '"{{ warn_count }} warnings found. Fix them, or acknowledge?"',
            options: 'fix-warnings, acknowledge',
            outputs: 'warning_decision',
            next: 'decide-warning-action',
          },
        },
        {
          id: 'decide-warning-action',
          kind: 'decide',
          description: 'Act on the author’s answer.',
          conditions: [
            { condition: 'warning_decision == "fix-warnings"', next: 'apply-fixes' },
            { condition: '_otherwise', next: 'report-clean' },
          ],
        },
        {
          id: 'apply-fixes',
          kind: 'act',
          description: 'Apply the fix the report asks for.',
          props: {
            action_type: 'document',
            ref: 'dep://docs/how-to/validate-a-document.md',
            summary: 'Repair the metadata the validator rejected',
            on_success: 'run-validation',
            on_failure: 'hand-off-to-generation',
          },
        },
        {
          id: 'hand-off-to-generation',
          kind: 'delegate',
          description: 'The document cannot be repaired; regenerate it instead.',
          props: {
            delegate_to: 'generate-doc-set',
            pass_context: '{ "reason": "unrepairable" }',
            terminal: 'true',
          },
        },
        {
          id: 'report-clean',
          kind: 'act',
          description: 'Everything passes.',
          props: {
            action_type: 'intent',
            intent: 'report_success',
            params: '{ "message": "All documents pass validation." }',
            terminal: 'true',
          },
        },
      ],
      ...overrides,
    })
  }

  /** A second sound tree, so delegation and multi-tree scenarios have somewhere to go. */
  seedGenerateDocSet(overrides: Partial<TreeSpec> = {}): string {
    return this.addTree({
      id: 'generate-doc-set',
      trigger: 'generate documentation for a new system',
      triggerPatterns: ['generate documentation'],
      tags: ['generation'],
      entryNode: 'check-docspec',
      nodes: [
        {
          id: 'check-docspec',
          kind: 'observe',
          description: 'Find out whether the project is configured for DEP.',
          props: {
            method: 'tool_call',
            tool: 'read_file',
            outputs: 'docspec_present',
            next: 'decide-scaffold',
          },
        },
        {
          id: 'decide-scaffold',
          kind: 'decide',
          conditions: [
            { condition: 'docspec_present == true', next: 'write-documents' },
            { condition: '_otherwise', next: 'write-documents' },
          ],
        },
        {
          id: 'write-documents',
          kind: 'act',
          description: 'Generate the document set.',
          props: {
            action_type: 'intent',
            intent: 'report_success',
            params: '{ "message": "Document set generated." }',
            terminal: 'true',
          },
        },
      ],
      ...overrides,
    })
  }

  /** The trees that ship with the fixture project by default. */
  seedStandard(): this {
    this.init()
    this.seedValidateAndFix()
    this.seedGenerateDocSet()
    return this
  }
}
