# Acceptance tests

Cucumber runs the user stories in [`../docs/user-stories/features`](../docs/user-stories/features)
against the real CLI. The feature files are the ones the splitter generates from
`docs/user-stories/dep.feature.md` — they are never edited here. Everything in
this directory is the other half: the step definitions that turn each black-box
sentence into a `dep` invocation and an assertion.

```bash
cd tests
bun install

bun run test        # the flows that have step definitions — expected green
bun run test:all    # every flow; the ones with no steps report as undefined
bun run test:wip    # only the scenarios parked as assumed behaviour (@wip/@later)
bun run typecheck   # type-check the step definitions and fixtures
```

A single flow, by its tag:

```bash
bunx cucumber-js --tags '@flow-04'
```

Every run also writes `reports/cucumber.html`.

## How a scenario runs

Each scenario gets a throwaway project in a temp directory — its own `.docspec`,
its own documents, and where the story needs one, its own `dap/` with decision
trees. The CLI is then run against that project as a subprocess, exactly as a
user would run it:

```
bun cli/src/index.ts <args> --root <fixture> # cwd = <fixture>
```

The working directory matters: the parser resolves relative link targets against
`process.cwd()`, so it has to agree with `--root` for the graph to come out right.

Fixtures are deleted when a scenario passes and kept when it fails; the failure
output names the directory that was left behind.

## Layout

| Path | What it holds |
| --- | --- |
| `cucumber.mjs` | Profiles: which features run, which tags are excluded |
| `support/world.ts` | Per-scenario world — the fixture project and the CLI runner |
| `support/project.ts` | Builds a DEP project on disk; `seedStandard()` is the compliant set most scenarios start from |
| `support/dap-project.ts` | Builds `.dapspec` and decision trees |
| `support/cli.ts` | Runs `dep`, captures stdout, stderr and the exit code |
| `support/expect.ts` | Assertions that print the CLI output when they fail |
| `steps/*.steps.ts` | One file per flow, plus `common.steps.ts` for steps several flows share |

## Adding a flow

1. Run `bunx cucumber-js --profile all --tags '@flow-NN'`. Cucumber prints a
   snippet for every step it does not recognise.
2. Write the steps in `steps/flow-NN-<topic>.steps.ts`. Build the state the
   Given describes with `this.project` / `this.dap`; act with
   `this.runInProject([...])`; assert against `this.output` or `this.json()`.
3. Add the feature file to `IMPLEMENTED` in `cucumber.mjs`.

Two conventions worth keeping:

- **`runQuiet` for a step's own bookkeeping.** A Then that needs to read the set
  back (say, because the text report only prints failing checks) should use
  `this.runQuiet(...)`, which leaves the scenario's own last result alone.
- **`TOLD` for descriptive phrasing.** Where a feature says *what* I am told
  ("which nodes are unreachable") instead of quoting the message, register the
  phrase in `common.steps.ts`'s `TOLD` map. Anything unregistered is expected in
  the output verbatim.

## Flows not yet covered

`test:all` reports them as undefined. They need a harness this suite does not
have yet: installing a released binary over the network (FLOW-01), downloading
an embedding model (FLOW-07, FLOW-08), or driving the plugin skills rather than
the CLI (FLOW-23). FLOW-10, 11, 12, 17 and 22 are CLI-shaped and only need step
definitions.

## Running in CI

The suite needs bun and nothing else:

```yaml
- run: cd tests && bun install && bun run test
```
