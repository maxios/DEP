---
dep:
  type: reference
  audience: [ai-agent]
  owner: "@dep-core"
  created: 2026-10-03T12:00:00+03:00
  last_verified: 2026-10-03T12:00:00+03:00
  confidence: high
  depends_on: []
  tags: [game, arena, loop]
  links: []
game:
  id: game.requests
  arena: arena
  levels: "@play and not @wip"
  situation:
    area: "tag:area-.+"
    kind: "tag:happy-path|edge-case|validation"
    size: "row:size"
    currency: "row:currency"
    tier: "row:tier"
  actions:
    may_write: ["arena/choices/**"]
    never_write: []
    options: [accept, refuse, convert, defer]
  scoring:
    authority: suite
    pass: 1
    fail: -1
    regression: -2
---

# The requests game

The reference arena for Phase B of the loop engine: Gherkin's version of the
maze. Each level is one request-handling scenario; the player answers it by
writing a choice — `accept`, `refuse`, `convert` or `defer` — and Cucumber
decides whether the scenario passes.

Which choice is right follows a rule over the request's size, its currency and
the customer's tier. The product area a scenario sits in has nothing to do with
it, so a situation keyed by area is five times sparser than it needs to be.

Regenerate the levels with `bun packages/loop/arenas/requests/generate.ts`.
