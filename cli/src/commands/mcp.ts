import { serveStdio } from '../mcp/protocol'
import { depTools } from '../mcp/tools'
import { VERSION } from './upgrade'

/**
 * `dep mcp` — serve DEP and DAP as Model Context Protocol tools over stdio,
 * for Claude Desktop and any other MCP client. stdout is the protocol channel;
 * anything a person should read goes to stderr.
 */
export async function mcpCommand(root: string) {
  process.stderr.write(`dep ${VERSION} mcp server — root ${root}\n`)
  await serveStdio(depTools(root), {
    name: 'dep',
    version: VERSION,
    instructions: 'DEP structures knowledge; DAP structures decisions. Ask dep_context for the passages a task needs (budgeted, stale-withheld, with provenance) instead of reading whole documents. For a procedure, dap_resolve finds the tree and dap_node hands you one step at a time.',
  })
}
