---
dep:
  type: reference
  audience:
    - ai-agent
    - project-lead
  owner: "@dep-core"
  created: 2026-10-08T18:30:00+03:00
  last_verified: 2026-10-08T18:30:00+03:00
  confidence: high
  depends_on:
    - .docspec
  tags:
    - docspec
    - configuration
    - loop
  links:
    - target: docspec-schema.md
      rel: USES
---

# The loop: block

The `loop:` block in `.docspec` decides which of DEP's living parts run in a
project. Without it, DEP is pure documentation: it validates, graphs, searches
and answers questions, and writes nothing beside the documents.

```yaml
loop:
  enabled: true
  trace: true
  usage: true
  heartbeat:
    enabled: true
    act: off
    quiet_hours: "22:00-08:00"
    timezone: UTC
    max_hops: 4
    max_follow_ups: 3
  proposals: review
  models:
    enabled: false
    model: claude-opus-5-5
    effort: low
    max_requests_per_day: 200
```

## Settings

| Setting | Values | Default with the loop on | Off means |
|---|---|---|---|
| `enabled` | `true` / `false` | — (absent = off) | every setting below is off |
| `trace` | `true` / `false` | `true` | requests are not recorded in `.dep-trace.jsonl` |
| `usage` | `true` / `false` | `true` | usage reports are refused; MCP does not offer `dep_report_usage`; ranking ignores past usage |
| `heartbeat.enabled` | `true` / `false` | `true` | `dep beat` and the heartbeat are refused; nothing is written to `.pulse/`, `.leases/` or `inbox/` |
| `heartbeat.act` | `off` / `rules` / `model` | `off` | woken owners are recorded but nothing acts; `rules` allows rule runners; `model` also allows model runners |
| `heartbeat.quiet_hours` | `HH:MM-HH:MM` | none | — |
| `heartbeat.timezone` | IANA name | `UTC` | — |
| `heartbeat.max_hops` | whole number | `4` | — |
| `heartbeat.max_follow_ups` | whole number | `3` | — |
| `proposals` | `review` / `off` | `review` | proposals are refused; the console has no Review |
| `models.enabled` | `true` / `false` | `false` | no model is ever asked |
| `models.model` | model id | `claude-opus-5-5` | — |
| `models.effort` | `low` … `max` | `low` | — |
| `models.max_requests_per_day` | whole number | `200` | beats that would ask a model past this, in a UTC day, do nothing and say why |

A model is asked only when `enabled`, `heartbeat.act: model` and
`models.enabled` are all set. Proposals are never applied without review.

## The environment

`DEP_LOOP=off` (also `false`, `0`, `no`) switches the loop off whatever
`.docspec` says. Nothing in the environment can switch it on.

## Older projects

A top-level `heartbeat:` block (`quiet_hours`, `timezone`, `max_hops`) is read
as `loop.heartbeat` when the loop is on and `loop.heartbeat` does not set the
same key.

## Seeing and checking it

- `dep loop` lists each part, on or off, and why: by default, set in
  `.docspec`, or `DEP_LOOP` in the environment. `--json` for agents.
- `dep validate` reports a *Loop configuration valid* check whenever a `loop:`
  block exists: unknown keys, values outside the table above, and
  `heartbeat.act: model` without `models.enabled: true` fail it.
- The console serves the settings at `/api/loop`.
