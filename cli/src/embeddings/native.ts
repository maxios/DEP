import { dlopen } from 'bun:ffi'
import { mkdir, rename } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { version as ONNXRUNTIME_VERSION } from 'onnxruntime-node/package.json'

/**
 * A shared library that `onnxruntime-node`'s native binding links against.
 *
 * `bun build --compile` embeds the `.node` binding and extracts it to a temp
 * directory at load time, but not the libraries it links with `@rpath` /
 * `$ORIGIN`, so `dlopen` fails inside the standalone binary. We embed those
 * libraries ourselves, materialise them under `~/.dep/lib` and load them into
 * the process before the binding is required — the dynamic linker then
 * satisfies the binding's dependency from the already-loaded image.
 */
export interface NativeLibrary {
  /** File name the binding links against (its install name / SONAME). */
  name: string
  /** Path from a `with { type: 'file' }` import: real file in dev, `/$bunfs/...` when compiled. */
  source: string
  /** Load into the process before the binding. Defaults to true. */
  preload?: boolean
}

/** DEP's per-user home: binaries in `bin/`, native libraries in `lib/`, model cache in `cache/`. */
export function depHome(): string {
  return process.env.DEP_HOME || join(homedir(), '.dep')
}

const EMBEDDED_PREFIX = '/$bunfs/'

/** Each branch is resolved at build time from the compile target, so a binary only embeds its own platform's libraries. */
async function embeddedLibraries(): Promise<NativeLibrary[]> {
  if (process.platform === 'darwin' && process.arch === 'arm64') return (await import('./native/darwin-arm64')).default
  if (process.platform === 'darwin' && process.arch === 'x64') return (await import('./native/darwin-x64')).default
  if (process.platform === 'linux' && process.arch === 'x64') return (await import('./native/linux-x64')).default
  if (process.platform === 'linux' && process.arch === 'arm64') return (await import('./native/linux-arm64')).default
  return []
}

/** Copy an embedded library out of the executable unless an identical copy is already there. */
async function materialise(lib: NativeLibrary, dir: string): Promise<string> {
  const target = join(dir, lib.name)
  const source = Bun.file(lib.source)
  const existing = Bun.file(target)
  if ((await existing.exists()) && existing.size === source.size) return target
  await mkdir(dir, { recursive: true })
  const partial = `${target}.${process.pid}.partial`
  await Bun.write(partial, source)
  await rename(partial, target)
  return target
}

let preloaded: Promise<void> | undefined

/**
 * Make `onnxruntime-node`'s shared libraries loadable, whether running from
 * source or from a standalone executable. Idempotent; safe to call every time
 * the local embedding provider initialises.
 */
export function preloadOnnxRuntime(): Promise<void> {
  preloaded ??= (async () => {
    const libDir = join(depHome(), 'lib', `onnxruntime-${ONNXRUNTIME_VERSION}`)
    for (const lib of await embeddedLibraries()) {
      const path = lib.source.startsWith(EMBEDDED_PREFIX) ? await materialise(lib, libDir) : lib.source
      // bun:ffi refuses an empty symbol table; OrtGetApiBase is the C API entry point every build exports.
      if (lib.preload !== false) dlopen(path, { OrtGetApiBase: { args: [], returns: 'ptr' } })
    }
  })()
  return preloaded
}
