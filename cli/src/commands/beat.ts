import { openDocumentationSet } from '../lib'

export interface BeatFlags {
  json?: boolean
  record?: boolean
  stop?: boolean
  start?: boolean
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
    const heart = set.heartbeat()
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
    const result = heart.beat(owner)
    if (flags.json) return console.log(JSON.stringify(result, null, 2))
    if (result.signals.length === 0) console.log(`Nothing needs ${owner}.`)
    else {
      console.log(result.woke ? `${owner} would be woken for:` : `${owner} is not woken (kill switch on), but would be for:`)
      for (const s of result.signals) console.log(`  ${s.kind.padEnd(15)} ${s.document} — ${s.why}`)
    }
    console.log(`Next beat ${result.nextBeat}.`)
  } finally {
    set.close()
  }
}
