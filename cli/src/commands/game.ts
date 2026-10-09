/**
 * `dep game templates` and `dep game new --template <name>`: start a game
 * for a kind of agent from a template, written into the project as a game
 * document, its scenarios and its judge.
 */
import { loadDocspec } from '../config'
import { resolveLoop } from '../loop-config'

const loop = () => import('../../../packages/loop/src/game/template')

/** Who a new game document belongs to and is for, as the project declares them. */
export function gameDocumentDefaults(root: string): { docsRoot: string; owner: string; audience: string[] } {
  const config = loadDocspec(root)
  return {
    docsRoot: config.project.docs_root ?? 'docs',
    owner: config.governance?.fallback_owner ?? '@team',
    audience: (config.audiences ?? []).map((a) => a.id),
  }
}

export async function gameCommand(root: string, sub: string | undefined, flags: { json?: boolean; template?: string }) {
  const { listTemplates, startFromTemplate } = await loop()
  if (sub === 'templates' || sub === undefined) {
    const templates = listTemplates()
    if (flags.json) return console.log(JSON.stringify({ templates }, null, 2))
    for (const t of templates) {
      console.log(`${t.name.padEnd(17)} ${t.title}: ${t.levels} levels, chooses ${t.options.join(' | ')}`)
      console.log(`${''.padEnd(17)} teaches ${t.teaches}\n`)
    }
    return console.log('Start one with: dep game new --template <name>')
  }
  if (sub !== 'new') {
    console.error(`Unknown game command "${sub}". Use: dep game templates | dep game new --template <name>`)
    process.exit(1)
  }
  if (!flags.template) {
    console.error('Name a template: dep game new --template <name>  (dep game templates lists them)')
    process.exit(1)
  }
  let started
  try {
    started = startFromTemplate(root, flags.template, gameDocumentDefaults(root))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (flags.json) console.log(JSON.stringify({ error: message, code: (err as { code?: string }).code ?? 'INVALID' }))
    else console.error(message)
    process.exit(1)
  }
  const { describeGame } = await import('../../../packages/loop/src/game/room')
  const game = describeGame(root, started.document)
  if (flags.json) return console.log(JSON.stringify({ ...started, playable: game.playable, why: game.why ?? null }, null, 2))
  console.log(`Started ${started.id} from the ${started.template} template:`)
  for (const f of started.files) console.log(`  ${f}`)
  console.log(game.playable ? `\nIt can be played: ${game.levels} levels.` : `\nIt cannot be played yet: ${game.why}`)
  if (!resolveLoop(loadDocspec(root)).enabled) console.log('The loop is off in this project; turn it on with `loop: { enabled: true }` in .docspec to play it from the console.')
  console.log(`Link ${started.document} from a document your readers start from (dep link <that document> --target ... --rel NEXT), or dep validate reports it as an orphan.`)
}
