# dep-loop

The loop engine: a context game and, later, a heartbeat, over a DEP
documentation set. Design and measured results are in
[`docs/desired-user-stories/liveness-design.md`](../../docs/desired-user-stories/liveness-design.md).

**Phase A** plays the context game on the reference maze from
[`intel-loop`](../../../../intel-loop): a store of claims keyed by situation,
strengthened only by a Scorer the player cannot reach.

```
bun test                          # the pin, and the core's version
bun run typecheck
bun scripts/compare.ts            # no store vs the store under each key
```

The behaviour is specified as FLOW-44 in the desired stories and runs with the
rest of them: `cd ../../cli && bun --bun cucumber-js --tags @flow-44`.

## The pinned core

`src/vendor/maze-core.js` is a copy of `intel-loop/code/maze-core.js`, pinned
in `maze-core.pin.json` by its `VERSION` and SHA-256. The loader hashes the
file and then evaluates those same bytes, and refuses a core that has moved.

Every number this engine reports was measured against the pinned core, so a
new core is a deliberate act: copy it, update the pin, re-run
`scripts/compare.ts`, and record what moved. Where `intel-loop` is checked out
beside this repo, `bun test` also fails if upstream has drifted from the pin.
