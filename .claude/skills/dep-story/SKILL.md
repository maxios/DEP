---
name: dep-story
description: Add a capability to dep the way this repo works — write the black-box Gherkin story first (docs/desired-user-stories), regenerate the per-flow mirrors, write Cucumber steps, watch them fail, implement, watch them pass, commit per flow. Use whenever the user asks to "add a feature", "implement X with TDD", "write a story for", "add a flow", "new dep command / tool / option", or starts describing behaviour dep should have — even before they mention tests or stories.
---

# Add a capability, story first

In this repo the stories are the spec *and* the acceptance suite: a new capability is a new `FLOW-NN` feature whose scenarios fail, then pass. Skipping the story leaves nothing that proves the behaviour later, and the desired suite (`cli/features`) is what CI runs.

## The loop

```
  story  ──▶  split  ──▶  steps (red)  ──▶  code  ──▶  steps (green)  ──▶  commit
   │            │              │                                            │
   │            │              └─ bun --bun cucumber-js --tags @flow-NN      └─ one flow per commit
   │            └─ bun scripts/user-stories/split-flows.ts <source> <out> "<title>"
   └─ append to docs/desired-user-stories/dep-context.feature.md, inside the single ```gherkin block
```

1. **Write the feature** in `docs/desired-user-stories/dep-context.feature.md`, separated from the previous one by a `# ═══` rule, numbered after the last flow (shipped stories are FLOW-01…23; desired ones continue from 24 so a tag means one thing everywhere). Black-box only: every step is an input the actor gives or an output they can observe — no screens, buttons, internals, algorithms. Cover `@happy-path`, `@validation`, `@edge-case`, `@error` (plus `@security` where it applies); enumerations become `Scenario Outline`; a `# Design:` comment points at `context-engine-design.md` and `# Source:` at the code it touches. Anything assumed goes to the *Open questions* list at the end, and a scenario the suite cannot run offline is tagged `@later` (the harness skips `@wip`/`@later`).
2. **Regenerate the mirrors**: `bun scripts/user-stories/split-flows.ts docs/desired-user-stories/dep-context.feature.md docs/desired-user-stories/features "DEP Desired User Stories — Index"`. Never edit the generated files. Then the vocabulary check: `grep -niE '\b(tap|button|screen|arrow|icon|checkmark|scroll|swipe|dropdown|enabled|disabled|click|checkbox)\b' docs/desired-user-stories/features/*.feature` must be empty.
3. **Steps** go in `cli/features/steps/flow-NN.steps.ts`. The `DepWorld` (`cli/features/support/world.ts`) builds a throw-away project per scenario: `Given` steps only *describe* it (`addDoc`, `relate`, `trees`, notes), the first `When` materialises it (`ask()` for the library, `runCliAsync()` for the CLI — never `spawnSync` when the scenario also hosts a server in-process). Shared phrasings live in `common.steps.ts`; reuse them rather than defining a near-duplicate, and mind that Cucumber refuses two definitions for one sentence.
4. **Run red**: `cd cli && bun --bun cucumber-js --tags @flow-NN` — undefined or failing steps are the point.
5. **Implement** in `cli/src/` — behaviour in the library (`src/context/`, `src/lib.ts`) that returns values and throws `DepError`; the CLI command as a thin printer over it, so `--json` and the library can never disagree. New commands get a `case` in `src/index.ts` and a line in its help text.
6. **Run green**, then the whole set — unit (`bun test`), desired (`bun run test:stories`), shipped (`cd tests && bun run test`), and `dep validate --root .` if docs changed. Then one commit for the flow, message saying *why*.

## Things the harness already knows how to do

- Deterministic retrieval: fixtures use `vectorization.provider: hash` (offline, lexical) — the local model is never downloaded in tests.
- Time: `this.now` is injected, so freshness scenarios can move a day forward.
- External services: FLOW-33/35 run a fake GitHub-releases server in-process (`startFakeReleases`) — reuse it for anything that downloads.
- Observability: `capturingOutput`, `watchingNetwork`, `countingProcesses` wrap a request to assert nothing was printed, fetched or spawned.
- MCP: `features/support/mcp-client.ts` speaks the protocol to `dep mcp` over stdio.

## When a story needs documentation too

A new capability that people use directly gets DEP documents like any other (`docs/how-to/…`, a `docs/reference/…` if it has a schema): frontmatter via the CLI (`dep set`, `dep link`, `dep bump`), never by hand; `dep index --root .` regenerates the index pages so nothing is an orphan; `dep validate --root .` must stay at 0 failures. USAGE.md and README get a line if the CLI gained a command. Then `/dep-release` when it should reach users.
