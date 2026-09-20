---
name: dep-release
description: Release a new version of the dep CLI end to end — preflight suites, version bump across the three manifests, push, wait for CI to prove the Linux and Windows binaries, tag, watch the release workflow, verify the 13 assets and the GitHub Packages launcher, then upgrade the local install from the real release. Use whenever the user says "release", "cut a version", "tag vX.Y.Z", "publish dep", "ship this", asks why a release failed, or wants a change to reach install.sh / dep upgrade / Claude Desktop users — even if they only say "push a tag".
---

# Release dep

Releasing is a procedure with two human decisions (which version; what to do when CI fails) and a lot of waiting. The decision logic lives in the DAP tree `release-dep`; follow it one node at a time rather than improvising — every step exists because a release once went wrong without it.

```bash
dep dap resolve "release dep" --json --root .
dep dap node release-dep preflight --json --root .    # then follow `next`
```

## What the tree does, and why each gate exists

```
  preflight ──▶ choose-version (gate) ──▶ bump ──▶ commit+push ──▶ wait CI
                                                                    │
                                        ┌── fix & push again ◀── diagnose-ci (gate)
                                        │                            │ green
                                        ▼                            ▼
                                   (back to wait CI)        tag ──▶ watch release ──▶ verify assets ──▶ upgrade local
                                                                    │ red
                                                     diagnose-release (gate) ──▶ retag (move tag) ──▶ watch release
```

- **Preflight on a clean `main`.** A tag is a pointer to a commit; a dirty tree or a branch means tagging something other than what was tested. Run all three suites — `cd cli && bun test && bun run test:stories`, `cd tests && bun run test` — plus `dep validate --root .`. Stories run under Bun (`bun --bun`) because the library needs `bun:sqlite`.
- **Version is a human choice.** Patch for fixes, minor for a new command/tool/platform, major for a break. It lives in three places that must agree — `cli/package.json`, `.claude-plugin/plugin.json`, `packages/dep-mcp/package.json` — and is quoted for readers in `prompts/install-dep.md` and `USAGE.md` (`dep X.Y.Z`). Grep for stragglers.
- **CI before tag, always.** `.github/workflows/ci.yml` builds every target and runs the *real* Linux and Windows binaries through `vectorize --provider local`, `context`, `setup` and `doctor`. That is the only place a Windows-only failure shows up before users see it; three of them were found exactly there (see pitfalls).
- **Tag on the proven commit.** `git tag -a vX.Y.Z -m "dep X.Y.Z" && git push origin vX.Y.Z`. The release workflow re-runs the same gates, then publishes.
- **A failed release leaves no Release behind**, so the tag can move: `git push origin :refs/tags/vX.Y.Z && git tag -d vX.Y.Z`, fix on main, wait for CI, re-tag, push.
- **"Released" is observable.** `gh release view vX.Y.Z --json assets` must list 13: `dep-{darwin-arm64,darwin-x64,linux-arm64,linux-x64}`, `dep-windows-x64.exe`, the same five as `.mcpb`, `install.sh`, `install.ps1`, `install.cmd`. `npm view @maxios/dep-mcp version --registry=https://npm.pkg.github.com` must print the new version (the `publish-launcher` job publishes it with `GITHUB_TOKEN`; a local `npm publish` needs a PAT with `write:packages` and is not the normal path).
- **Upgrade the local install from the release** — `~/.dep/bin/dep upgrade && ~/.dep/bin/dep doctor` — because that is the path every user's machine takes, and the memory note about the installed binary should record the new version.

## Watching runs without blocking

`gh run watch <id> --exit-status --interval 20` blocks for minutes; run it in the background and continue only when it reports. Find the id with `gh run list --workflow CI --branch main --limit 1 --json databaseId --jq '.[0].databaseId'` (or `--workflow Release`). Read a failing job with `gh run view --job <jobId> --log` and grep for the first `error`, `✗` or `Error:` line — the stack below it is rarely the cause.

## Pitfalls that have already cost a release

| Symptom in CI | Cause | Where fixed |
|---|---|---|
| Windows: binding wants ORT API 21, gets 1.17 | embedded files live at `B:/~BUN/…` on Windows, not `/$bunfs/`; libraries were never copied out so System32's onnxruntime won | `cli/src/embeddings/native.ts` `isEmbedded()` |
| Windows: every document fails validate | `path.relative` yields backslashes; links use forward slashes | `cli/src/paths.ts` `posix()` |
| Windows: `doctor` EBUSY | a killed child still holds the fixture's files | `doctor.ts` drains the MCP child, retries removal |
| Linux stories: EPIPE on the *next* scenario | `stdin.end()` on a dead child | test client destroys stdin after kill |
| Every story fails in `Before` | harness scratch dir pointed at a local machine path | `features/support/world.ts` uses `os.tmpdir()` |
| Release `test` job fails on a date | a unit test compared against a hardcoded verification date | fixture trees dated relative to now |

## Report back

Version, the release URL, the asset count, the launcher version, and the local `dep doctor` verdict — in that order, five lines.
