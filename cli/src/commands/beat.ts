import { openDocumentationSet, MockRunner, ClaudeRunner, DepError } from '../lib'

export interface BeatFlags {
  json?: boolean
  record?: boolean
  stop?: boolean
  start?: boolean
  /** Act on what the beat finds, with the rule runner (no model). */
  act?: boolean
  /** With --act: decide with Claude instead of the rules (a model id, or true for the default). */
  model?: string | boolean
}

/**
 * One beat of an owner's heart: pulse their documents, say whether anything
 * needs them, and when they will be checked next. `--record` shows every beat
 * so far and the wake ratio; `--stop` / `--start` turn the kill switch on and
 * off.
 */
export async function beatCommand(root: string, owner: string | undefined, flags: BeatFlags) {
  const set = openDocumentationSet(root, { caller: 'cli:beat', trace: { record: false } })
  try {
    const runner = !flags.act ? undefined
      : flags.model ? new ClaudeRunner({ model: typeof flags.model === 'string' ? flags.model : set.loop.models.model, effort: set.loop.models.effort })
      : new MockRunner()
    let heart
    try {
      heart = set.heartbeat(runner ? { runner } : {})
    } catch (err) {
      if (err instanceof DepError && err.code === 'LOOP_OFF') {
        console.error(err.message)
        process.exit(1)
      }
      throw err
    }
    if (flags.stop || flags.start) {
      const { stopped } = heart.killSwitch(!!flags.stop)
      console.log(stopped ? 'Kill switch on: owners are pulsed but never woken.' : 'Kill switch off.')
      return
    }
    if (flags.record) {
      const record = heart.record(owner)
      if (flags.json) return console.log(JSON.stringify(record, null, 2))
      for (const b of record.beats) {
        console.log(`${b.at}  ${b.agent.padEnd(16)} ${b.woke ? 'woke' : b.stopped ? 'stop' : '  · '}  ${b.signals.map((s) => s.kind).join(', ')}`)
      }
      console.log(`\n${record.beats.length} beats, ${record.wakes} woke — wake ratio ${record.wakeRatio.toFixed(2)}`)
      return
    }
    if (!owner) {
      console.error('Usage: dep beat <owner> [--json] | dep beat [<owner>] --record | dep beat --stop | --start')
      process.exit(1)
    }
    const result = await heart.beatAsync(owner)
    if (flags.json) return console.log(JSON.stringify(result, null, 2))
    if (result.signals.length === 0) console.log(`Nothing needs ${owner}.`)
    else {
      console.log(result.woke ? `${owner} would be woken for:` : `${owner} is not woken (kill switch on), but would be for:`)
      for (const s of result.signals) console.log(`  ${s.kind.padEnd(15)} ${s.document} — ${s.why}`)
    }
    for (const a of result.actions) {
      const what = (a.action as { type?: string }).type ?? 'something'
      console.log(`  ${a.outcome.padEnd(13)} ${what}${a.reason ? ` — ${a.reason}` : ''}`)
    }
    for (const s of result.held) console.log(`  left alone    ${s.document} — another beat holds it`)
    if (result.error) console.log(`  nothing done  ${result.error}`)
    console.log(`Next beat ${result.nextBeat}.`)
  } finally {
    set.close()
  }
}
