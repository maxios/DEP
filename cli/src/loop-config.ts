/**
 * The loop's configuration: which of DEP's living parts run in a project.
 *
 * DEP is documentation tooling first. A project whose `.docspec` says nothing
 * about the loop writes nothing beside its documents: no record of requests,
 * no usage, no heartbeat, no proposals, and never a call to a model. The loop
 * is turned on — and each part of it chosen — in a `loop:` block:
 *
 *   loop:
 *     enabled: true            # the master switch; every part needs it
 *     trace: true              # record requests (.dep-trace.jsonl)
 *     usage: true              # accept reports of which passages helped
 *     heartbeat:
 *       enabled: true          # dep beat: pulses, .pulse/, inbox/, leases
 *       act: off               # off | rules | model — how woken owners act
 *       quiet_hours: "22:00-08:00"
 *       timezone: UTC
 *       max_hops: 4
 *       max_follow_ups: 3
 *     proposals: review        # review | off — nothing is ever self-applied
 *     models:
 *       enabled: false         # nothing asks a model unless this is true
 *       model: claude-opus-5-5
 *       effort: low
 *       max_requests_per_day: 200
 *
 * `DEP_LOOP=off` in the environment switches the loop off whatever the
 * configuration says. Nothing in the environment can switch it on.
 *
 * Settings are resolved once, here, and every part reads the result; nothing
 * else interprets the block.
 */
import { DepError } from './context/errors'
import type { DocspecConfig } from './types'

export type HeartbeatAct = 'off' | 'rules' | 'model'
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
export type Source = 'default' | 'docspec' | 'env'

export interface LoopSettings {
  enabled: boolean
  trace: boolean
  usage: boolean
  heartbeat: {
    enabled: boolean
    act: HeartbeatAct
    quiet_hours: string
    timezone: string
    max_hops: number
    max_follow_ups: number
  }
  proposals: 'review' | 'off'
  models: { enabled: boolean; model: string; effort: Effort; max_requests_per_day: number }
  /** Where each setting came from, by its key in the block (`trace`, `heartbeat.act`, …). */
  sources: Record<string, Source>
}

const ACTS: HeartbeatAct[] = ['off', 'rules', 'model']
const EFFORTS: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']

/** Every setting, as it is when the loop is turned on and the block says nothing more. */
const ON = {
  trace: true,
  usage: true,
  'heartbeat.enabled': true,
  'heartbeat.act': 'off' as HeartbeatAct,
  'heartbeat.quiet_hours': '',
  'heartbeat.timezone': 'UTC',
  'heartbeat.max_hops': 4,
  'heartbeat.max_follow_ups': 3,
  proposals: 'review' as 'review' | 'off',
  'models.enabled': false,
  'models.model': 'claude-opus-5-5',
  'models.effort': 'low' as Effort,
  'models.max_requests_per_day': 200,
}

type Key = keyof typeof ON

/** The settings in force: the environment over the configuration over the defaults. */
export function resolveLoop(docspec: Pick<DocspecConfig, 'loop' | 'heartbeat'>, env: Record<string, string | undefined> = process.env): LoopSettings {
  const block = (docspec.loop && typeof docspec.loop === 'object' ? docspec.loop : {}) as Record<string, unknown>
  const nested = (k: string) => (block[k] && typeof block[k] === 'object' ? block[k] as Record<string, unknown> : {})
  // the heartbeat's limits were once a block of their own; they are still read, under the loop
  const legacy = (docspec.heartbeat ?? {}) as Record<string, unknown>
  const declared = (key: Key): unknown => {
    const [head, tail] = key.split('.') as [string, string | undefined]
    if (!tail) return block[head]
    const v = nested(head)[tail]
    return v === undefined && head === 'heartbeat' ? legacy[tail] : v
  }

  const offByEnv = /^(off|false|0|no)$/i.test(env.DEP_LOOP ?? '')
  const enabled = !offByEnv && block.enabled === true
  const sources: Record<string, Source> = { enabled: offByEnv ? 'env' : block.enabled === undefined ? 'default' : 'docspec' }
  const value = <K extends Key>(key: K): (typeof ON)[K] => {
    const given = declared(key)
    const valid = given !== undefined && typeof given === typeof ON[key]
    sources[key] = !enabled ? sources.enabled! : valid ? 'docspec' : 'default'
    if (!enabled) return (typeof ON[key] === 'boolean' ? false : key === 'heartbeat.act' ? 'off' : key === 'proposals' ? 'off' : ON[key]) as (typeof ON)[K]
    return (valid ? given : ON[key]) as (typeof ON)[K]
  }

  const act = value('heartbeat.act')
  const effort = value('models.effort')
  return Object.freeze({
    enabled,
    trace: value('trace'),
    usage: value('usage'),
    heartbeat: {
      enabled: value('heartbeat.enabled'),
      act: ACTS.includes(act) ? act : 'off',
      quiet_hours: value('heartbeat.quiet_hours'),
      timezone: value('heartbeat.timezone'),
      max_hops: value('heartbeat.max_hops'),
      max_follow_ups: value('heartbeat.max_follow_ups'),
    },
    proposals: value('proposals') === 'off' ? 'off' : enabled ? 'review' : 'off',
    models: {
      enabled: value('models.enabled'),
      model: value('models.model'),
      effort: EFFORTS.includes(effort) ? effort : 'low',
      max_requests_per_day: value('models.max_requests_per_day'),
    },
    sources,
  }) as LoopSettings
}

/** Everything wrong with a `loop:` block, as sentences; empty when it makes sense. */
export function loopProblems(block: unknown): string[] {
  if (block === undefined) return []
  if (!block || typeof block !== 'object' || Array.isArray(block)) return ['loop is not a block of settings']
  const b = block as Record<string, unknown>
  const problems: string[] = []
  const known = { top: ['enabled', 'trace', 'usage', 'heartbeat', 'proposals', 'models'], heartbeat: ['enabled', 'act', 'quiet_hours', 'timezone', 'max_hops', 'max_follow_ups'], models: ['enabled', 'model', 'effort', 'max_requests_per_day'] }
  for (const k of Object.keys(b)) if (!known.top.includes(k)) problems.push(`loop.${k} is not a setting`)
  const bool = (path: string, v: unknown) => { if (v !== undefined && typeof v !== 'boolean') problems.push(`${path} is "${String(v)}", not true or false`) }
  const count = (path: string, v: unknown) => { if (v !== undefined && !(Number.isInteger(v) && (v as number) >= 0)) problems.push(`${path} is "${String(v)}", not a whole number`) }
  bool('loop.enabled', b.enabled)
  bool('loop.trace', b.trace)
  bool('loop.usage', b.usage)
  if (b.proposals !== undefined && b.proposals !== 'review' && b.proposals !== 'off') problems.push(`loop.proposals is "${String(b.proposals)}", not review or off`)
  const h = (b.heartbeat ?? {}) as Record<string, unknown>
  const m = (b.models ?? {}) as Record<string, unknown>
  for (const [name, sub] of [['heartbeat', h], ['models', m]] as const) {
    if (typeof sub !== 'object' || Array.isArray(sub)) { problems.push(`loop.${name} is not a block of settings`); continue }
    for (const k of Object.keys(sub)) if (!known[name].includes(k)) problems.push(`loop.${name}.${k} is not a setting`)
  }
  bool('loop.heartbeat.enabled', h.enabled)
  if (h.act !== undefined && !ACTS.includes(h.act as HeartbeatAct)) problems.push(`loop.heartbeat.act is "${String(h.act)}", not one of ${ACTS.join(', ')}`)
  if (h.quiet_hours !== undefined && !(typeof h.quiet_hours === 'string' && /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(h.quiet_hours))) problems.push(`loop.heartbeat.quiet_hours is "${String(h.quiet_hours)}", not a span like 22:00-08:00`)
  count('loop.heartbeat.max_hops', h.max_hops)
  count('loop.heartbeat.max_follow_ups', h.max_follow_ups)
  bool('loop.models.enabled', m.enabled)
  if (m.effort !== undefined && !EFFORTS.includes(m.effort as Effort)) problems.push(`loop.models.effort is "${String(m.effort)}", not one of ${EFFORTS.join(', ')}`)
  count('loop.models.max_requests_per_day', m.max_requests_per_day)
  if (h.act === 'model' && m.enabled !== true) problems.push('loop.heartbeat.act is model, but loop.models.enabled is not true, so no model will ever be asked')
  return problems
}

/** The error for a part of the loop that is off: which setting turns it on. */
export function loopOff(part: string, setting: string, settings: LoopSettings): DepError {
  const why = settings.sources.enabled === 'env' ? 'DEP_LOOP is off in the environment'
    : !settings.enabled ? 'the loop is off in .docspec (set loop.enabled: true)'
    : `${setting} is off in .docspec`
  return new DepError('LOOP_OFF', `${part} is not available: ${why}`, { setting, enabled: settings.enabled })
}
