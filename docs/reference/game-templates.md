---
dep:
  type: reference
  audience:
    - ai-agent
    - project-lead
  owner: "@dep-core"
  created: 2026-10-09T10:30:00+03:00
  last_verified: 2026-10-09T10:30:00+03:00
  confidence: high
  depends_on:
    - packages/loop/src/game/template.ts
    - packages/loop/src/game/templates/index.ts
    - cli/src/commands/game.ts
  tags:
    - game
    - loop
    - templates
  links:
    - target: loop-configuration.md
      rel: USES
    - target: ../games/react-component.md
      rel: NEXT
---

# Game templates

A template is a game for a kind of agent, ready to play. Starting one writes
three things into the project, all generated from the same policy rules, so
the document states exactly what the judge checks:

| File | What it is |
|---|---|
| `<docs_root>/games/<name>.md` | The game document: a DEP reference with a `game:` block and the policy as a When/Then table |
| `games/<name>/features/<name>.feature` | One Scenario Outline; every row is a situation and the choice the policy expects |
| `games/<name>/steps/<name>.steps.ts` | The judge: compares the agent's choice with the row's expected column |

`games/<name>/.gitignore` keeps the agent's per-level choices (`choices/`) out of git.

## Commands

| Command | Does |
|---|---|
| `dep game templates [--json]` | Lists the templates: what each teaches, its options, its levels |
| `dep game new --template <name> [--json]` | Starts a game; refuses if the game's files already exist |

The console's Games tab offers the same templates (New game), through
`GET /api/games/templates` and `POST /api/games/new {template}`. Like every
console write, a request from another site is refused.

## The templates

| Name | Id | Situation | Options | Levels |
|---|---|---|---|---|
| `tester` | `game.tester` | change, surface, risk, coverage, tests | unit-test, integration-test, e2e-test, contract-test, quarantine-flaky, skip | 180 |
| `react-component` | `game.react-component` | data, device, state, copy, logic, reuse | pure-component, container, extract-hook, move-copy, lift-state, memoize | 96 |
| `code-reviewer` | `game.code-reviewer` | size, area, tests, api, ci | approve, request-changes, ask-for-tests, split, escalate | 72 |
| `api-change` | `game.api-change` | change, versioning, consumers, data | ship, migrate-then-ship, deprecate-first, add-version, refuse | 60 |

Each policy is a draft. Rules are tried in order and the first that matches
decides; a level that matches none takes the fallback. To change a policy,
edit the expected column of the feature file and the document's table
together.

## What a project needs

- **The loop on** (`loop: { enabled: true }` in `.docspec`) to play from the console.
- **Cucumber where the arena can reach it.** The judge runs the Cucumber its
  steps import, found by walking up from the arena directory. Without it the
  game's `RUNNER` check fails and says how to install it:
  `bun add -d @cucumber/cucumber`.
- **Bun on the PATH**, which runs the judge.
- **A link to the game document** from a document your readers reach, or
  `dep validate` reports it as an orphan.

The document's owner is `.docspec`'s `governance.fallback_owner` and its
audience is every audience `.docspec` declares; change them with `dep set`.
