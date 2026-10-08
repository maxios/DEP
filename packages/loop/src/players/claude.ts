/**
 * A game player that asks Claude.
 *
 * What the model is shown is decided here, and it is deliberately narrow: the
 * situation's features, the game's options, the claims the store handed over
 * (text only, best first, never their strength), and the instinct if there is
 * one. It is never shown the scenario — whose steps name the outcome the judge
 * expects — nor the arena's files, nor anything about how it will be scored.
 * The judge stays the judge.
 *
 * The model answers through structured output: one of the game's options and a
 * short reason. Answers for the whole day are gathered before the day is
 * played (`prepare`), a few at a time. A request that fails rejects the day,
 * so nothing is played on a guess and the store is left as it was.
 */
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { choicePath, type PlannedLevel, type SuitePlayer, type SuiteView, type Write } from '../game/play'
import type { Rng } from '../types'

/** What the model is shown for one level. Built here so it can be inspected, and tested, without a model. */
export interface Prompt {
  system: string
  user: string
  options: string[]
}

export interface Answer {
  choice: string
  reason?: string
}

/** Ask the model once. The default calls the Anthropic API; tests pass their own. */
export type Ask = (prompt: Prompt) => Promise<Answer>

export interface ClaudePlayerOptions {
  /** The arena's path relative to the project root: where choices are written. */
  arena: string
  ask?: Ask
  model?: string
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max'
  /** Requests in flight at once. */
  concurrency?: number
}

const SYSTEM = [
  'You are playing a game of decisions. Each turn describes one situation by its features and lists the options you may choose from.',
  'You may also be given advice the agent has learned from earlier turns, best first. Advice is evidence, not an order: follow it when it fits the situation, and choose otherwise when it does not.',
  'Choose exactly one of the listed options, and say in one sentence why.',
].join('\n')

/** The prompt for one level: the situation, the options, the advice — and nothing else. */
export function promptFor(view: SuiteView, claims: string[]): Prompt {
  const features = Object.entries(view.key.features).map(([k, v]) => `- ${k}: ${String(v)}`).join('\n')
  const advice = claims.length ? claims.map((c, i) => `${i + 1}. ${c}`).join('\n') : '(none yet)'
  const instinct = view.instinct ? `\nWithout being told, you would usually choose: ${view.instinct}\n` : ''
  return {
    system: SYSTEM,
    options: [...view.options],
    user: `Situation:\n${features}\n\nOptions: ${view.options.join(', ')}\n\nAdvice learned so far:\n${advice}\n${instinct}`,
  }
}

/** The Anthropic API, asked for a structured answer: one of the options and a reason. */
export function anthropicAsk(options: { model?: string; effort?: ClaudePlayerOptions['effort']; client?: Anthropic } = {}): Ask {
  const client = options.client ?? new Anthropic()
  const model = options.model ?? 'claude-opus-5-5'
  return async (prompt) => {
    const schema = z.object({ choice: z.enum(prompt.options as [string, ...string[]]), reason: z.string() })
    const response = await client.messages.parse({
      model,
      max_tokens: 2000,
      // the system prompt is the same for every turn; caching it is free when it is long enough to cache
      system: [{ type: 'text', text: prompt.system, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: options.effort ?? 'low', format: zodOutputFormat(schema) },
      messages: [{ role: 'user', content: prompt.user }],
    })
    if (response.stop_reason === 'refusal') throw new Error(`the model declined to answer (${response.stop_details?.category ?? 'no category'})`)
    if (!response.parsed_output) throw new Error(`the model's answer could not be read (stopped: ${response.stop_reason})`)
    return response.parsed_output
  }
}

export class ClaudePlayer implements SuitePlayer {
  private readonly answers = new Map<string, Answer>()
  /** Every prompt the model was shown, in order: what it saw is part of the record. */
  readonly shown: Array<{ level: string; prompt: Prompt }> = []
  private readonly ask: Ask

  constructor(private readonly options: ClaudePlayerOptions) {
    this.ask = options.ask ?? anthropicAsk({ model: options.model, effort: options.effort })
  }

  async prepare(day: PlannedLevel[]): Promise<void> {
    this.answers.clear()
    const queue = [...day]
    const work = async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        const prompt = promptFor(item.view, item.claims)
        this.shown.push({ level: item.view.level.id, prompt })
        let answer: Answer
        try {
          answer = await this.ask(prompt)
        } catch (err) {
          throw new Error(`the model could not be reached for ${item.view.level.id}: ${err instanceof Error ? err.message : String(err)}`)
        }
        this.answers.set(item.view.level.id, answer)
      }
    }
    await Promise.all(Array.from({ length: Math.max(1, this.options.concurrency ?? 4) }, work))
  }

  act(view: SuiteView, _claims: string[], _rng: Rng): { writes: Write[]; choice: string } {
    const answer = this.answers.get(view.level.id)
    if (!answer) throw new Error(`no answer was prepared for ${view.level.id}; play the day with playSuiteDayAsync`)
    return { writes: [{ path: choicePath(this.options.arena, view.level.id), content: JSON.stringify({ option: answer.choice }) }], choice: answer.choice }
  }

  propose(view: SuiteView, passed: boolean, choice: string): unknown[] {
    return passed ? [{ kind: 'episode', key: view.key, claim: `choose ${choice}` }] : []
  }
}
