import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join, resolve } from 'path'
import { spawnSync } from 'child_process'
import { depHome } from '../embeddings/native'
import { runDoctor, redact } from './doctor'
import { VERSION, runningFromSource, selfCommand } from './upgrade'

export interface SetupStep {
  step: 'install' | 'path' | 'desktop' | 'doctor'
  ok: boolean
  skipped?: boolean
  detail: string
}

export interface SetupReport {
  ok: boolean
  version: string
  binary: string
  desktopConfig: string | null
  steps: SetupStep[]
}

export interface SetupFlags {
  root?: string
  home?: string
  desktopConfig?: string
  noDesktop?: boolean
  noPath?: boolean
  json?: boolean
  pause?: boolean
}

/** Where the desktop client keeps its configuration on this platform. */
export function desktopConfigPath(): string {
  if (process.platform === 'win32') return join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json')
  if (process.platform === 'darwin') return join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'Claude', 'claude_desktop_config.json')
}

/**
 * Turn a downloaded copy of the CLI into an installation: copy itself to
 * <home>/bin, put that directory on the user's search path (Windows), register
 * itself with the desktop client for a project, then prove it works. Needs no
 * shell, no script, no other runtime — the point on a locked-down machine.
 */
export async function runSetup(flags: SetupFlags = {}): Promise<SetupReport> {
  const steps: SetupStep[] = []
  const home = flags.home ? resolve(flags.home) : depHome()
  const binDir = join(home, 'bin')
  const target = join(binDir, process.platform === 'win32' ? 'dep.exe' : 'dep')
  const fromSource = runningFromSource()

  // ── install ──
  try {
    mkdirSync(binDir, { recursive: true })
    if (fromSource) {
      steps.push({ step: 'install', ok: true, skipped: true, detail: 'running from source: nothing to copy; the desktop entry will run the source tree' })
    } else if (existsSync(target) && realpathSync(process.execPath) === realpathSync(target)) {
      steps.push({ step: 'install', ok: true, detail: `already installed at ${redact(target)}` })
    } else {
      const temp = `${target}.download`
      copyFileSync(process.execPath, temp)
      chmodSync(temp, 0o755)
      if (existsSync(target)) renameSync(target, `${target}.prev`)
      renameSync(temp, target)
      steps.push({ step: 'install', ok: true, detail: `copied to ${redact(target)}` })
    }
  } catch (err) {
    steps.push({ step: 'install', ok: false, detail: `could not install to ${redact(target)}: ${err instanceof Error ? err.message : String(err)}` })
  }

  // ── search path ──
  if (flags.noPath) {
    steps.push({ step: 'path', ok: true, skipped: true, detail: 'search path left alone (--no-path)' })
  } else if (process.platform === 'win32') {
    steps.push(windowsUserPath(binDir))
  } else {
    const onPath = (process.env.PATH ?? '').split(':').includes(binDir)
    steps.push({ step: 'path', ok: true, skipped: !onPath, detail: onPath ? `${redact(binDir)} is on the search path` : `add to your shell profile: export PATH="${redact(binDir)}:$PATH"` })
  }

  // ── desktop client ──
  let desktopConfig: string | null = null
  if (flags.noDesktop) {
    steps.push({ step: 'desktop', ok: true, skipped: true, detail: 'desktop client left alone (--no-desktop)' })
  } else {
    const root = flags.root ? resolve(flags.root) : existsSync(join(process.cwd(), '.docspec')) ? process.cwd() : null
    if (!root) {
      steps.push({ step: 'desktop', ok: true, skipped: true, detail: 'no project named: pass --root <project> to register the desktop client' })
    } else {
      desktopConfig = flags.desktopConfig ? resolve(flags.desktopConfig) : desktopConfigPath()
      try {
        const command = fromSource ? selfCommand() : { command: target, args: [] as string[] }
        const written = mergeDesktopConfig(desktopConfig, { command: command.command, args: [...command.args, 'mcp', '--root', root] })
        steps.push({ step: 'desktop', ok: true, detail: `${redact(desktopConfig)}: "dep" serves ${redact(root)}${written.others ? ` (${written.others} other server(s) kept)` : ''}${written.backedUp ? ', previous kept as .bak' : ''}` })
      } catch (err) {
        steps.push({ step: 'desktop', ok: false, detail: `could not write ${redact(desktopConfig)}: ${err instanceof Error ? err.message : String(err)}` })
      }
    }
  }

  // ── prove it ──
  const previousHome = process.env.DEP_HOME
  process.env.DEP_HOME = home
  try {
    const doctor = await runDoctor()
    const failed = doctor.checks.filter((c) => !c.ok).map((c) => c.name)
    steps.push({ step: 'doctor', ok: doctor.ok, detail: doctor.ok ? `all ${doctor.checks.length} checks pass` : `${failed.join(', ')} failed — run: dep doctor --issue` })
  } catch (err) {
    steps.push({ step: 'doctor', ok: false, detail: err instanceof Error ? err.message : String(err) })
  } finally {
    if (previousHome === undefined) delete process.env.DEP_HOME
    else process.env.DEP_HOME = previousHome
  }

  return { ok: steps.every((s) => s.ok), version: VERSION, binary: redact(target), desktopConfig: desktopConfig ? redact(desktopConfig) : null, steps }
}

function windowsUserPath(binDir: string): SetupStep {
  const query = spawnSync('reg', ['query', 'HKCU\\Environment', '/v', 'Path'], { encoding: 'utf-8' })
  const line = (query.stdout ?? '').split(/\r?\n/).find((l) => /\bPath\b/.test(l)) ?? ''
  const current = line.replace(/^\s*Path\s+REG_(EXPAND_)?SZ\s+/, '').trim()
  if (current.split(';').some((p) => p.trim().toLowerCase() === binDir.toLowerCase())) {
    return { step: 'path', ok: true, detail: `${redact(binDir)} is already on the user's search path` }
  }
  const next = current ? `${binDir};${current}` : binDir
  const add = spawnSync('reg', ['add', 'HKCU\\Environment', '/v', 'Path', '/t', 'REG_EXPAND_SZ', '/d', next, '/f'], { encoding: 'utf-8' })
  if (add.status !== 0) {
    return { step: 'path', ok: false, detail: `could not add ${redact(binDir)} to the user's search path: ${(add.stderr || add.stdout || '').trim()}` }
  }
  return { step: 'path', ok: true, detail: `${redact(binDir)} added to the user's search path (new terminals will see it)` }
}

function mergeDesktopConfig(path: string, entry: { command: string; args: string[] }): { others: number; backedUp: boolean } {
  mkdirSync(dirname(path), { recursive: true })
  let config: Record<string, unknown> = {}
  let backedUp = false
  if (existsSync(path)) {
    const raw = readFileSync(path, 'utf-8')
    config = raw.trim() ? (JSON.parse(raw) as Record<string, unknown>) : {}
    writeFileSync(`${path}.bak`, raw)
    backedUp = true
  }
  const servers = (config.mcpServers ?? {}) as Record<string, unknown>
  const others = Object.keys(servers).filter((k) => k !== 'dep').length
  servers.dep = entry
  config.mcpServers = servers
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n')
  return { others, backedUp }
}

export async function setupCommand(flags: SetupFlags) {
  const report = await runSetup(flags)
  if (flags.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`dep ${report.version} setup`)
    console.log('')
    for (const s of report.steps) console.log(`  ${s.ok ? (s.skipped ? '–' : '✓') : '✗'} ${s.step.padEnd(8)} ${s.detail}`)
    console.log('')
    if (report.ok && report.desktopConfig) console.log('Done. Restart Claude Desktop to see the "dep" server.')
    else if (report.ok) console.log('Done.')
    else console.log('Setup did not complete. File the report with: dep doctor --issue')
  }
  if (flags.pause) {
    process.stdout.write('\nPress Enter to close this window.')
    await new Promise<void>((done) => { process.stdin.once('data', () => done()); process.stdin.resume() })
  }
  process.exit(report.ok ? 0 : 1)
}
