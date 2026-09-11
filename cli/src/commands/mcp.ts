import { resolve } from 'path'
import { serveStdio } from '../mcp/protocol'
import { depTools } from '../mcp/tools'
import { VERSION, selfCommand, selfUpgradeIfDue } from './upgrade'

/**
 * `dep mcp` — serve DEP and DAP as Model Context Protocol tools over stdio,
 * for Claude Desktop and any other MCP client. stdout is the protocol channel;
 * anything a person should read goes to stderr. Before serving, the binary
 * looks for a newer release (at most daily; DEP_MCP_UPGRADE=never turns it
 * off), so a desktop client pointed straight at the binary stays current
 * without any other runtime.
 */
export async function mcpCommand(root: string, flags: { printConfig?: boolean } = {}) {
  if (flags.printConfig) {
    console.log(JSON.stringify(desktopConfig(root), null, 2))
    return
  }
  const note = await selfUpgradeIfDue({ log: (line) => process.stderr.write(`dep mcp: ${line}\n`) })
  process.stderr.write(`dep ${VERSION} mcp server — root ${root} — ${note}\n`)
  await serveStdio(depTools(root), {
    name: 'dep',
    version: VERSION,
    instructions: 'DEP structures knowledge; DAP structures decisions. Ask dep_context for the passages a task needs (budgeted, stale-withheld, with provenance) instead of reading whole documents. For a procedure, dap_resolve finds the tree and dap_node hands you one step at a time.',
  })
}

/** The claude_desktop_config.json entry for this machine: the CLI itself, absolute paths, no other runtime. */
export function desktopConfig(root: string) {
  const self = selfCommand()
  return {
    mcpServers: {
      dep: {
        command: self.command,
        args: [...self.args, 'mcp', '--root', resolve(root)],
      },
    },
  }
}
