import { startConsole, DEFAULT_PORT } from '../console/server'
import { DepError } from '../context/errors'

export interface ConsoleFlags {
  port?: string | boolean
  json?: boolean
}

/**
 * Serve the console and stay up until interrupted. Everything it shows comes
 * from the library, so this is a printer and a signal handler, nothing more.
 */
export async function consoleCommand(root: string, flags: ConsoleFlags) {
  const asked = typeof flags.port === 'string' ? Number(flags.port) : undefined
  if (asked !== undefined && (!Number.isInteger(asked) || asked < 0 || asked > 65535)) {
    throw new DepError('INVALID_OPTION', `--port must be a port number, or 0 for any free one; got "${flags.port}"`, { port: flags.port })
  }

  const server = await startConsole(root, asked === undefined ? {} : { port: asked })

  if (flags.json) {
    console.log(JSON.stringify({ url: server.url, port: server.port, root: server.root }, null, 2))
  } else {
    console.log(`\n  dep console — ${server.root}`)
    console.log(`  ${server.url}\n`)
    console.log('  Press Ctrl+C to stop.\n')
  }

  await new Promise<void>((resolve) => {
    const stop = () => {
      void server.stop().then(() => resolve())
    }
    process.on('SIGINT', stop)
    process.on('SIGTERM', stop)
  })
}

export { DEFAULT_PORT }
