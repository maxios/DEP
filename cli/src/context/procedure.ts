import type { DapNode } from '../dap/types'
import type { Notice, Passage } from './types'

export interface ProcedureSessionState {
  declared: number
  used: number
  remaining: number
}

/**
 * A budget carried across the steps of a procedure — and across a handoff to
 * another procedure. Remembers what was supplied so nothing is handed over
 * twice.
 */
export class ProcedureSession {
  readonly declared: number
  used = 0
  readonly supplied = new Map<string, { document: string; step: string; tree: string }>()

  constructor(budget: number) {
    this.declared = budget
  }

  get remaining(): number {
    return Math.max(0, this.declared - this.used)
  }

  snapshot(): ProcedureSessionState {
    return { declared: this.declared, used: this.used, remaining: this.remaining }
  }
}

export type SupportPart = 'description' | 'prompt' | 'summary'

export interface SupportPassage extends Passage {
  /** Which part of the step this passage supports. */
  supports: SupportPart
}

export interface ProcedureStepOptions {
  budget?: number
  session?: ProcedureSession
}

export interface ProcedureStep {
  tree: string
  step: DapNode & { tokens: number }
  /** Steps this one can lead to. */
  next: string[]
  /** Where a delegate step hands control to. */
  handoff: { tree: string; entry: string } | null
  support: {
    passages: SupportPassage[]
    alreadySupplied: Array<{ id: string; document: string; step: string; tree: string }>
    budget: { declared: number; used: number; remaining: number }
  }
  session: ProcedureSessionState | null
  notices: Notice[]
}

export function stepParts(node: DapNode): Array<{ part: SupportPart; text: string }> {
  const parts: Array<{ part: SupportPart; text: string }> = []
  if (node.description) parts.push({ part: 'description', text: node.description })
  if (node.prompt) parts.push({ part: 'prompt', text: node.prompt })
  if (node.summary) parts.push({ part: 'summary', text: node.summary })
  return parts
}

export function treeIdFromRef(ref: string): string {
  return ref.replace(/^dap:\/\//, '').replace(/\.md$/, '')
}
