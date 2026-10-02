---
name: dep-build
description: Build the dep CLI binaries and Claude Desktop bundles, verify a built binary the way CI does, reinstall the local ~/.dep/bin/dep, or add a new platform target. Use whenever the user says "build the binary", "rebuild dep", "make the windows exe", "build the bundles / .mcpb", "update my installed dep from source", "add a platform / arm64 / windows build", or asks why a compiled binary behaves differently from `bun run` — even when they just say "compile it".
---

# Build dep

Three artefacts come out of `cli/`: standalone binaries (one per platform), Claude Desktop bundles wrapping them, and — on release only — the installers. A binary compiled with `bun build --compile` is not the source tree with a different launcher: native libraries, embedded-file paths and Windows path separators all behave differently inside it, which is why "verify the built binary" is its own step here and in CI.

## Commands

```bash
cd cli && bun install

bun run build:local                            # this machine only → dist/dep
bun run scripts/build.ts --target=windows-x64  # one platform, named like its release asset
bun run build                                  # all five → dist/dep-<os>-<arch>[.exe]
bun run scripts/bundle.ts --all                # dist/dep-<os>-<arch>.mcpb for every built binary
bun run scripts/bundle.ts --target=darwin-arm64 --binary=<file> --out=<dir>   # tests use this form
```

Targets: `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`, `windows-x64`. A full build takes a few minutes and ~500 MB of `dist/`; run it in the background.

## Verify a built binary (what CI runs on Linux and Windows)

```bash
BIN=cli/dist/dep            # or dist/dep-windows-x64.exe on a Windows runner
$BIN version
$BIN doctor                 # validate · index (hash) · context · mcp handshake on a throwaway project
$BIN vectorize --root . --provider local --json     # the native onnxruntime path — the thing bun run cannot prove
$BIN setup --root . --home "$TMP/dep-home" --desktop-config "$TMP/claude.json" --no-path
```

A bundle checks out with `unzip -l dist/dep-<t>.mcpb` (manifest.json + `server/dep` or `server/dep.exe`, exec bit kept) and `unzip -p … manifest.json` — `manifest_version` 0.3, `server.type` binary, `compatibility.platforms` one entry.

## Reinstall the local binary from source

```bash
cd cli && bun run build:local && cp dist/dep ~/.dep/bin/dep && ~/.dep/bin/dep doctor
```

Keep the previous one if in doubt (`cp ~/.dep/bin/dep ~/.dep/bin/dep.prev` first). The installed binary otherwise upgrades itself only from GitHub releases (`dep upgrade`, and daily when `dep mcp` starts), so a local build is how unreleased work reaches Claude Desktop on this machine. Update the memory note about the installed binary when you do this.

## Adding a platform

Every place that knows the platform list, or the build silently ships a broken target:

| Where | What |
|---|---|
| `cli/scripts/build.ts` `ALL_TARGETS` | the Bun compile target (`bun-<os>-<arch>`); Windows targets get `.exe` |
| `cli/src/embeddings/native/<os>-<arch>.ts` + `native.ts` branch | the onnxruntime shared libraries to embed (`with { type: 'file' }`); on Windows load `DirectML.dll` first — `onnxruntime.dll` imports it, and the loader matches already-loaded modules by name |
| `cli/src/embeddings/native/assets.d.ts` | the file extension as a module declaration |
| `cli/scripts/bundle.ts` `PLATFORMS` | target → Claude Desktop platform id (`darwin` / `linux` / `win32`) |
| `cli/src/commands/upgrade.ts` `platformBinary()` and `packages/dep-mcp/index.mjs` `assetName()` | the release asset name the self-updater and launcher download |
| `install.sh` / `install.ps1` / `install.cmd` | the asset the installer picks |
| `.github/workflows/{ci,release}.yml` `verify` matrix | a runner that executes the binary — without it the platform is unproven |

## Why a compiled binary differs from `bun run`

- Embedded files (`with { type: 'file' }`) resolve to `/$bunfs/…` on macOS/Linux and `B:/~BUN/…` on Windows; anything that must be a real file (a shared library, a `.node` binding's dependency) is copied out under `~/.dep/lib` by `preloadOnnxRuntime()`. Check `isEmbedded()` when adding one.
- `process.execPath` is the binary itself; `runningFromSource()` (`basename(execPath) === 'bun'`) is how commands like `upgrade`, `setup` and `mcp` tell the two apart.
- Document paths must be forward-slash everywhere (`cli/src/paths.ts` `posix()`); Windows only shows the bug on a built binary running against real files.
