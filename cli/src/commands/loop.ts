import { loadDocspec } from '../config'
import { resolveLoop, type LoopSettings } from '../loop-config'

const WHY: Record<string, string> = { default: 'by default', docspec: 'set in .docspec', env: 'DEP_LOOP in the environment' }

/** Each of the loop's parts, on or off, and why — the settings in force, read the way the set reads them. */
export function loopReport(settings: LoopSettings): Array<{ part: string; state: string; why: string }> {
  const why = (key: string) => WHY[settings.sources[key] ?? 'default']!
  const on = (b: boolean) => (b ? 'on' : 'off')
  const h = settings.heartbeat
  return [
    { part: 'loop', state: on(settings.enabled), why: why('enabled') },
    { part: 'recording requests', state: on(settings.trace), why: why('trace') },
    { part: 'usage reports', state: on(settings.usage), why: why('usage') },
    { part: 'heartbeat', state: h.enabled ? (h.act === 'off' ? 'on, acts on nothing' : `on, acts by ${h.act}`) : 'off', why: why(h.enabled ? 'heartbeat.act' : 'heartbeat.enabled') },
    { part: 'proposals', state: settings.proposals === 'off' ? 'off' : 'wait for review', why: why('proposals') },
    { part: 'models', state: settings.models.enabled ? `on: ${settings.models.model}, ${settings.models.effort} effort, ${settings.models.max_requests_per_day} a day` : 'off', why: why('models.enabled') },
  ]
}

export function loopCommand(root: string, flags: { json?: boolean }) {
  const settings = resolveLoop(loadDocspec(root))
  if (flags.json) return console.log(JSON.stringify({ settings, parts: loopReport(settings) }, null, 2))
  for (const r of loopReport(settings)) console.log(`${r.part.padEnd(20)} ${r.state.padEnd(42)} ${r.why}`)
  if (!settings.enabled) console.log('\nDEP is running as pure documentation. Turn the loop on with `loop: { enabled: true }` in .docspec.')
}
