---
dep:
  type: reference
  audience: [ai-generator, ai-agent, human-author, project-lead]
  owner: "@dep-core"
  created: 2026-10-09T06:58:34Z
  last_verified: 2026-10-09T06:58:34Z
  confidence: medium
  depends_on: [games/react-component/features/react-component.feature, games/react-component/steps/react-component.steps.ts]
  tags: [game, react-component]
game:
  id: game.react-component
  arena: games/react-component
  levels: "@play and not @wip"
  levels_independent: true
  situation:
    data: "row:data"
    device: "row:device"
    state: "row:state"
    copy: "row:copy"
    logic: "row:logic"
    reuse: "row:reuse"
  actions:
    may_write: ["games/react-component/choices/**"]
    never_write: []
    options: [pure-component, container, extract-hook, move-copy, lift-state, memoize]
  scoring:
    authority: suite
    pass: 1
    fail: -1
    regression: -2
---

# The react component agent game

React component agents learn how to shape a component: data and devices only in containers, copy out of the JSX, logic in hooks, shared state lifted, reused components memoized. Each level is one situation:
**data** (none, fetched), **device** (none, used), **state** (none, local, shared), **copy** (none, inline), **logic** (light, heavy), **reuse** (once, many). The agent chooses one of
`pure-component`, `container`, `extract-hook`, `move-copy`, `lift-state`, `memoize`, and the judge's scenarios check the choice.

The policy the judge holds, first match wins. It is a starting point for your team to change:

| When | Then |
|---|---|
| data is fetched only in containers | `container` |
| the device is reached only from containers | `container` |
| text lives in content files, never inline in the JSX | `move-copy` |
| shared state belongs above the component | `lift-state` |
| heavy logic moves out of the JSX into a hook | `extract-hook` |
| a component used in many places is memoized | `memoize` |
| otherwise: it stays pure: props in, JSX out | `pure-component` |

To change it, change the expected column in `games/react-component/features/react-component.feature` and this table together; the
judge (`games/react-component/steps/react-component.steps.ts`) compares the choice with that column. The game's documents and arena
were written by `dep game new --template react-component`.
