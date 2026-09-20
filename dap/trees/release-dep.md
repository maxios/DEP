---
dap:
  id: release-dep
  version: 1
  trigger: "release a new version of the dep CLI"
  trigger_patterns:
    - "release dep"
    - "cut a release"
    - "publish a new version"
    - "tag and release"
    - "ship version *"
    - intent: release_dep
  audience: [ai-agent]
  owner: "@dep-core"
  created: 2026-09-20T10:00:00+03:00
  last_verified: 2026-09-20T10:00:00+03:00
  confidence: high
  depends_on:
    - .github/workflows/ci.yml
    - .github/workflows/release.yml
    - cli/scripts/build.ts
    - cli/scripts/bundle.ts
  tags: [release, ci, maintenance]
  entry_node: preflight
---

# Release dep

Take `main` from "green on this machine" to a published GitHub Release with five binaries, five Claude Desktop bundles, three installers and the launcher on GitHub Packages — with CI proving the Linux and Windows binaries before anything is published, and the local install upgraded from the real release afterwards.

## preflight [?]

Everything a release depends on, checked before a single file changes. A dirty tree or a red suite is far cheaper to hear about here than after a tag exists.

- **method**: tool_call
- **tool**: shell
- **args**: { "cmd": "git status --porcelain && git branch --show-current && (cd cli && bun test && bun run test:stories) && (cd tests && bun run test) && bun run cli/src/index.ts validate --root ." }
- **outputs**: branch, dirty, unit_ok, stories_ok, shipped_ok, validate_ok, current_version
- **next**: assess-preflight

## assess-preflight [>]

| condition | next |
| --- | --- |
| `dirty == true OR branch != "main"` | stop-unclean |
| `unit_ok AND stories_ok AND shipped_ok AND validate_ok` | choose-version |
| `_otherwise` | stop-red |

## stop-unclean [!]

- **action_type**: intent
- **intent**: escalate
- **params**: { "reason": "Release from a clean checkout of main only: uncommitted changes or a feature branch would be tagged. Commit, merge or stash first." }
- **terminal**: true

## stop-red [!]

- **action_type**: intent
- **intent**: escalate
- **params**: { "reason": "A suite or check is red (unit, stories, shipped, validate, CI or release). Fix it first; the release workflow gates on the same checks and would refuse anyway." }
- **terminal**: true

## choose-version [?]

The version is a claim about compatibility, so a person makes it: patch for fixes, minor for new capabilities (a new command, tool or platform), major for a break.

- **method**: gate
- **prompt**: "Current version is {{ current_version }}. Patch (fixes), minor (new capability), or major (breaking)?"
- **options**: patch, minor, major
- **outputs**: bump
- **next**: bump-version

## bump-version [!]

Three manifests carry the version and must agree, or the launcher, plugin and CLI drift apart; the install prompt and USAGE quote the version the reader must see.

- **action_type**: tool_call
- **tool**: shell
- **params**: { "cmd": "set version={{ bump }} in cli/package.json, .claude-plugin/plugin.json, packages/dep-mcp/package.json; replace 'dep {{ current_version }}' in prompts/install-dep.md and USAGE.md; grep for stragglers" }
- **on_success**: commit-and-push
- **on_failure**: stop-red

## commit-and-push [!]

- **action_type**: tool_call
- **tool**: shell
- **params**: { "cmd": "git add -A && git commit -m 'release: v<version>' && git push origin main" }
- **on_success**: wait-ci
- **on_failure**: stop-red

## wait-ci [?]

CI runs the suites, builds all targets and smoke-tests the real Linux and Windows binaries with the local embedding provider, `setup` and `doctor`. This is the only place a Windows-only regression can be seen before it ships.

- **method**: tool_call
- **tool**: shell
- **args**: { "cmd": "gh run list --workflow CI --branch main --limit 1 --json databaseId --jq '.[0].databaseId' | xargs -I{} gh run watch {} --exit-status --interval 20" }
- **outputs**: ci_ok, failed_job
- **next**: assess-ci

## assess-ci [>]

| condition | next |
| --- | --- |
| `ci_ok == true` | tag |
| `_otherwise` | diagnose-ci |

## diagnose-ci [?]

Read the failing job's log before deciding; the fix is usually small and the pitfalls are known: embedded files live at `B:/~BUN/…` on Windows, document paths must be forward-slash, a killed child holds files for a moment on Windows (EBUSY), ending a dead child's stdin raises EPIPE on Linux, the harness must not depend on this machine's paths.

- **method**: gate
- **prompt**: "CI failed in {{ failed_job }}. Fix and push again, or abort the release?"
- **options**: fix, abort
- **outputs**: ci_decision
- **next**: decide-ci

## decide-ci [>]

| condition | next |
| --- | --- |
| `ci_decision == "fix"` | commit-and-push |
| `_otherwise` | stop-red |

## tag [!]

The tag is what triggers the release workflow; it must sit on the commit CI just proved.

- **action_type**: tool_call
- **tool**: shell
- **params**: { "cmd": "git tag -a v<version> -m 'dep <version>' && git push origin v<version>" }
- **on_success**: watch-release
- **on_failure**: stop-red

## watch-release [?]

- **method**: tool_call
- **tool**: shell
- **args**: { "cmd": "gh run list --workflow Release --limit 1 --json databaseId --jq '.[0].databaseId' | xargs -I{} gh run watch {} --exit-status --interval 20" }
- **outputs**: release_ok, failed_job
- **next**: assess-release

## assess-release [>]

| condition | next |
| --- | --- |
| `release_ok == true` | verify-assets |
| `_otherwise` | diagnose-release |

## diagnose-release [?]

A failed release run leaves no GitHub Release behind, so the tag can be moved: fix on main, delete the remote tag, re-tag the new commit, push again.

- **method**: gate
- **prompt**: "The release workflow failed in {{ failed_job }}. Fix, move the tag and retry — or abort?"
- **options**: retag, abort
- **outputs**: release_decision
- **next**: decide-release

## decide-release [>]

| condition | next |
| --- | --- |
| `release_decision == "retag"` | retag |
| `_otherwise` | stop-red |

## retag [!]

- **action_type**: tool_call
- **tool**: shell
- **params**: { "cmd": "git push origin :refs/tags/v<version> && git tag -d v<version> && (fix, commit, push main, wait for CI) && git tag -a v<version> -m 'dep <version>' && git push origin v<version>" }
- **on_success**: watch-release
- **on_failure**: stop-red

## verify-assets [?]

Thirteen assets and the launcher version are the observable definition of "released"; anything short of that means a job silently did less than it should.

- **method**: tool_call
- **tool**: shell
- **args**: { "cmd": "gh release view v<version> --json assets --jq '[.assets[].name]' && npm view @maxios/dep-mcp version --registry=https://npm.pkg.github.com" }
- **outputs**: assets_ok, asset_count, launcher_version
- **next**: assess-assets

## assess-assets [>]

| condition | next |
| --- | --- |
| `asset_count == 13 AND launcher_version == version` | upgrade-local |
| `_otherwise` | stop-red |

## upgrade-local [!]

The installed binary upgrading itself from the real release is the last proof — the same path every user's machine will take.

- **action_type**: tool_call
- **tool**: shell
- **params**: { "cmd": "~/.dep/bin/dep upgrade && ~/.dep/bin/dep doctor" }
- **on_success**: report-done
- **on_failure**: stop-red

## report-done [!]

- **action_type**: intent
- **intent**: report_success
- **params**: { "message": "Released v<version>: 5 binaries, 5 bundles, 3 installers, launcher @maxios/dep-mcp@<version>; local dep upgraded and doctor passes. Update the memory note about the installed binary." }
- **terminal**: true
