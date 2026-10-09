/**
 * Game templates: a game for a kind of agent, written as policy data. Each
 * names the situations the agent meets (every combination is a level), the
 * options it may choose, and the policy — ordered rules, first match wins —
 * that its judge holds. ../template.ts turns one into a game document, its
 * scenarios and its judge, all from the same rules, so the document states
 * exactly what the judge checks.
 *
 * Policies are drafts for a team to change: the game document's table is
 * where a person reads them, the template is where they are generated from.
 */
import { tester } from './tester'
import { reactComponent } from './react-component'
import { codeReviewer } from './code-reviewer'
import { apiChange } from './api-change'

export interface GameTemplate {
  /** What `dep game new --template` takes. */
  name: string
  title: string
  /** One sentence: what an agent learns by playing it. */
  teaches: string
  /** The game's id, and the scenario wording. */
  id: string
  feature: string
  scenario: string
  /** The situation as a sentence; each <dimension> is filled from a row, one word each. */
  given: string
  /** How the agent's choice is applied, and how the outcome is said. */
  when: string
  dimensions: Array<{ name: string; values: string[] }>
  options: string[]
  /** First match wins; a rule matches when every named dimension has one of the listed values. */
  rules: Array<{ when: Record<string, string | string[]>; then: string; why: string }>
  otherwise: { then: string; why: string }
}

export const TEMPLATES: GameTemplate[] = [tester, reactComponent, codeReviewer, apiChange]

/** The rule a situation falls under: the first that matches, or the fallback. */
export function ruleFor(template: GameTemplate, situation: Record<string, string>): { then: string; why: string } {
  for (const rule of template.rules) {
    const matches = Object.entries(rule.when).every(([dim, want]) => (Array.isArray(want) ? want : [want]).includes(situation[dim]!))
    if (matches) return rule
  }
  return template.otherwise
}

/** Every situation the template describes, in a stable order. */
export function situations(template: GameTemplate): Array<Record<string, string>> {
  return template.dimensions.reduce<Array<Record<string, string>>>(
    (all, dim) => all.flatMap((s) => dim.values.map((v) => ({ ...s, [dim.name]: v }))), [{}])
}
