# Desired-story acceptance tests

Cucumber runs the **desired** user stories in
[`../../docs/desired-user-stories/features`](../../docs/desired-user-stories/features)
against the library in `src/lib.ts`. The feature files are generated from
`docs/desired-user-stories/dep-context.feature.md` — never edited here. This
directory holds the other half: a World that builds a throwaway DEP project per
scenario, and the step definitions that turn each black-box sentence into a
library call (or, where the story says so, a `dep` invocation) plus an assertion.

```bash
cd cli
bun run test:stories                       # every desired flow
bun --bun cucumber-js --tags @flow-27      # one flow
bun --bun cucumber-js --name "budget"      # scenarios whose name matches
```

It has to run under Bun (`bun --bun`): the library uses `bun:sqlite` and Bun's
hashing, so the steps import it in-process rather than shelling out. The
shipped stories (FLOW-01…23) have their own harness in [`../../tests`](../../tests),
which black-boxes the CLI as a subprocess; the two are deliberately separate.

## How a scenario runs

`Given` steps only *describe* the project — documents, audiences, cadences,
relationships, trees. The first `When` materialises it: writes `.docspec` and
the documents under a scratch directory, opens the set, builds the index with
the deterministic `hash` embedding provider (no model download, no network),
and performs the request. `Then` steps assert on the bundle, the error, or the
captured CLI output. Every scenario's directory is removed afterwards.

Time is injected (`now`), so freshness scenarios are reproducible; network,
process spawning and the output streams are observed by wrapping the globals
for the duration of a request.

## Layout

```
features/
├── support/world.ts     # fixture builder + request helpers + captured state
├── support/hooks.ts     # per-scenario setup/teardown, World registration
└── steps/
    ├── common.steps.ts  # project setup, asking, generic verdicts
    └── flow-NN.steps.ts # one file per flow
```
