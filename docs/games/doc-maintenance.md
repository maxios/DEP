---
dep:
  type: reference
  audience: [ai-agent, project-lead]
  owner: "@dep-core"
  created: 2026-10-09T10:00:00+03:00
  last_verified: 2026-10-09T10:00:00+03:00
  confidence: medium
  depends_on: [packages/loop/arenas/doc-maintenance/arena/steps/maintenance.steps.ts, packages/loop/arenas/doc-maintenance/generate.ts]
  tags: [game, loop, maintenance]
  links:
    - target: ../reference/loop-configuration.md
      rel: USES
game:
  id: game.doc-maintenance
  arena: packages/loop/arenas/doc-maintenance/arena
  levels: "@play and not @wip"
  levels_independent: true
  situation:
    type: "row:type"
    lifecycle: "row:lifecycle"
    deps: "row:deps"
    confidence: "row:confidence"
  actions:
    may_write: ["packages/loop/arenas/doc-maintenance/arena/choices/**"]
    never_write: []
    options: [review, bump, propose-fix, skip]
  scoring:
    authority: suite
    pass: 1
    fail: -1
    regression: -2
---

# The doc-maintenance game

This project's first game. Each level is a document an owner meets: its type,
how fresh it is, whether what it depends on has changed, and how confident its
owner is. The agent chooses what to do — `review`, `bump`, `propose-fix` or
`skip` — and the scenarios judge the choice.

The policy the judge holds is a draft:

| When | Then |
|---|---|
| something it depends on changed | `propose-fix`, however fresh it is |
| it is past twice its review cadence (STALE) | `review` |
| its owner's confidence is low | `review` |
| it is past its cadence (AGING) | `bump` |
| otherwise | `skip` |

The document's type does not matter to the policy, so what the agent learns
can say so in a rule. Regenerate the levels with
`bun packages/loop/arenas/doc-maintenance/generate.ts`; change the policy in
that file and in the judge's steps together.
