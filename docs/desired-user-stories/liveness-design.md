# Desired capability — a documentation set that learns and acts

Design notes behind two specs written against DEP: `loop.context-game`
(intelligence) and `loop.heartbeat` (liveness). This document is about where
they join, what DEP already provides, and the one place they contradict
each other.

## The claim

The context game consolidates grooves out of context and into a LoRA. Applied
to a documentation set, that is the wrong target. **The documentation is the
weight matrix.** When a groove is strong enough to leave context, the thing to
change is the document, not a model.

```
 the spec                           on DEP
 ──────────────────────────         ──────────────────────────────
 entries ──sleep──▶ adapter         passages ──sleep──▶ documents
    ▲                  │               ▲                   │
    └── read path ◀────┘               └── dep context ◀────┘

 consolidation trains a model       consolidation rewrites the docs
```

This matters because it makes the whole loop inspectable. A LoRA that absorbed
a groove is a number nobody can read. A document that absorbed a groove is a
diff, in git, visible on the console, reviewable by a person who disagrees.

It also gives the success criterion a measurement that already exists. The spec
wants *entries in context* to rise then fall. The DEP form is **passages
offered per question** — in `.dep-trace.jsonl` today, for every question ever
asked. If the docs improve, the same question needs less of them.

## What DEP already is

```
                           in DEP today                  gap
 ──────────────────────    ─────────────────────────     ──────────────────
 read path (sim×strength)  retrieve(), hybrid ranking    share_i not logged
 entry strength            UsageStore.factor()           no decay, no merge
 read trace                .dep-trace.jsonl              —
 the window                dep console                   —
 the write channel         amend() / dep set|bump|tag    —
 pain / gain               self-reported by the agent    ✖ no honest scorer
 day clock                 cadence per type (passive)    ✖ nothing runs
 sleep                     —                             ✖ = doc rewrite
```

`UsageStore.factor()` is already a strength-weighted read: a passage that
proved useful for questions like this one is boosted by
`1 + 0.5 × (used/offered) × overlap`. That is the context game's read path in
miniature, with a learning rate of one and no decay. The spec's write path
(`s += LR × err × share`) is a better version of a thing that exists, not a
new subsystem.

What is genuinely missing is a clock and an honest judge.

## The contradiction

The two specs disagree with what DEP shipped, and the spec is right.

Loop grammar rule 2: *only the Scorer produces pain/gain; the player can never
write rewards.* DEP's `dep_report_usage` has the agent report which passages it
used — the player writing its own reward.

```
 today
 agent ──▶ dep_context ──▶ answers ──▶ dep_report_usage ──▶ strength
                                              ▲
                                       the agent decides

 proposed
 agent ──▶ dep_context ──▶ answers ──▶ the work lands
                                              │
                            tests · review · was it re-asked?
                                              ▼
                            heartbeat observes ──▶ scorer ──▶ strength
```

For ranking, self-report is tolerable — an agent that over-reports mostly
wastes its own budget. For rewriting documents it is not: an agent that calls
everything useful makes every document look load-bearing, and the
retire-or-rewrite queue goes quiet exactly when it is most wrong.

The honest matter for a documentation set is already lying around in a
git-backed repo: did the tests pass after the change the context was for, did
the PR merge, did `dep validate` hold, did someone ask the same question again
within the week, was the document rewritten immediately afterwards. None of
that is observable inside a single request — it is observable over hours and
days.

**That is why the heartbeat is the Scorer's host.** The context game supplies
the learning rule; the heartbeat supplies the clocks and the only vantage point
from which an outcome is visible. Neither spec is complete without the other.

Self-report does not disappear. It becomes a *claim* the scorer may confirm or
contradict, which is what makes it safe to keep.

## The clocks

DEP has one clock and it does not tick: `review_cadence` decides whether a
document is FRESH, AGING or STALE, and nothing acts on the answer. The
heartbeat supplies the missing three.

```
 BEAT     minutes    pulse the repo, no LLM        writes: docs, messages
   ▼                 wake only on a signal
 DIGEST   hours      closed + escalated loops      writes: a summary doc
   ▼
 SLEEP    nightly    grooves ──▶ documentation     writes: merges, retires,
                     gated on convergence                  rewrites
```

Each clock writes only to the layer below it, which is rule 5. The bottom line
is the one that changes DEP: sleep's output is a set of amendments, and the
console's amend path is already the channel for them.

## Where the pieces sit

```
 ┌──────────────────────────────────────────────────────────┐
 │ DEP — documents, typed links, cadence, .docspec           │
 │                    (the weights)                          │
 └───────┬──────────────────────────────────────────┬────────┘
         │ dep context / dep dap                    │ amend
         ▼                                          │
 ┌─────────────────┐    offered + used     ┌────────┴────────┐
 │ CONTEXT GAME    │ ◀──────────────────── │ SLEEP           │
 │ read, nudge,    │                       │ gate, select,   │
 │ decay, merge    │ ─────────────────────▶│ rewrite, retire │
 └────────┬────────┘   strong grooves      └─────────────────┘
          ▲
          │ reward
 ┌────────┴────────┐   observes outcomes   ┌─────────────────┐
 │ SCORER          │ ◀──────────────────── │ HEARTBEAT       │
 │ sole authority  │                       │ beat · digest   │
 └─────────────────┘                       │ leases, actions │
                                           └────────┬────────┘
                                                    │ reads + writes
 ┌──────────────────────────────────────────────────┴────────┐
 │ .dep-trace.jsonl — every request, who asked, what was      │
 │ offered and why, what came back used    (the read traces)  │
 └────────────────────────────────────────────────────────────┘
```

The trace record is the join. The context game reads it as episodes; the
heartbeat writes outcomes into it; the console renders it.

## Liveness without a second vocabulary

The heartbeat spec puts `status`, `waiting_on`, `follow_up_after` and
`next_beat` in frontmatter. DEP already has a metadata block with a validator,
a writer, and a console inspector. A second block beside it means two schemas,
two validators, and documents that pass one and fail the other.

The heart fields belong **inside `dep:`**, as an optional `heart:` sub-block.
Then `dep validate` checks them, `dep set` writes them, the console shows them,
and a document without one is simply passive — which the spec already says.

The lifecycle DEP computes is a degenerate heart: `last_verified + cadence` is
exactly `asked_at + follow_up_after`, with the document waiting on its owner.
STALE already means *an open loop is overdue*. The heartbeat generalises a
mechanism that exists rather than adding one.

## The policy is already a DEP artifact

The heartbeat's action union — reply, ask, escalate, snooze, close — is the
same shape as a DAP tree's terminal acts, and its pulse-then-decide structure
is a DAP tree walked one node at a time. `procedureStep()` already delivers one
step with its supporting knowledge packed to a carried budget.

Expressing each agent's behaviour as a DAP tree rather than as code means the
console's Decisions screen shows what the agents will do before they do it, and
the path they actually took afterwards. The screen exists; it currently has
nothing live to show.

## Build order

`maze-core/4` in `intel-loop` is already a working context game: a riverbed
keyed by cell, habits keyed by situation that survive across mazes, the gate,
three clocks, seeded bit-exact replay. So the store is proven first where
everything is deterministic, and the maze is swapped for scenarios second.

```
 PHASE  WHAT IT PROVES                             ENV        PLAYER
 ─────  ─────────────────────────────────────────  ─────────  ──────
  A     the store learns: grooves rise, then fall  maze       mock
  B     the same store works on scenarios          gherkin    mock
  C     strong grooves become docs you can read    gherkin    mock
  D     documents wake, ask, follow up             repo       mock
  E     a real agent plays the suite               gherkin    LLM
  F     your judgement carves the riverbed         your work  LLM
```

A is context-game M1–M3. B is its M5 plus the `dep: game` block. C is sleep
as amendment. D is heartbeat M1–M3. E and F are where an LLM first appears and
where the riverbed starts matching a person rather than a suite: accepted or
rejected changes, useful or noise marks, a rewritten document.

The engine lives in `packages/loop`, depending on `dep`'s library directly and
tested through the same story harness. `maze-core.js` is vendored, pinned by
its `VERSION` and a SHA-256, and refuses to load if either has moved.

### Decided while building

- **Credit goes to the claims the player followed.** The spec nudges every
  claim that was read. A claim recommending a move the player did not make has
  no causal part in the outcome, so it is read (and counted) but not credited.
  `ReadTrace.action` is what makes the distinction possible.
- **The baseline is what a situation is worth with no advice.** The spec's
  baseline is the situation's running mean reward, which includes the episodes
  where the claim itself was followed — so a claim competes with itself and
  drifts. Measured against unadvised play instead, a claim gains strength
  exactly when following it beats not following it.
- **A claim weakened below where it started is not advice.** It is shown again
  only through exploration. Without this, a refuted claim is followed exactly
  as readily as a proven one, because the player is never told strengths.

### Measured in Phase A

Reproduce with `bun packages/loop/scripts/compare.ts` (seeds 1–6, five days,
fresh mazes every episode, the store carried from day to day).

```
                   day        0     1     2     3     4
 no store          pain    0.42  0.48  0.42  0.44  0.50
                   stretch 3.79  4.27  3.91  4.00  4.09
 store, bare key   pain    0.25  0.31  0.28  0.28  0.31
                   stretch 2.74  3.36  2.88  2.75  3.10
                   claims  0.87  0.78  0.72  0.74  0.74
 store, + bearing  pain    0.30  0.37  0.26  0.28  0.32
                   stretch 3.14  3.26  2.70  2.74  2.95
                   claims  3.22  3.32  3.44  3.39  3.39
```

About 40% less pain and 25% shorter runs than playing without a store, held
across every day. Four things the measurements settled:

- **A store followed blindly is worse than no store.** Before the player kept
  its per-run scratch in play, pain rose from 0.48 to 0.98 (seed 42). A claim
  about a kind of crossroads cannot see that this run has already been through
  this one, so obeying it walks the same loop to the move cap. Maze-core's
  revision 3 learned this; the engine had to learn it again.
- **The spec's baseline un-learns.** With the running-mean baseline and the
  bearing key, day 0 opened at pain 0.25 and closed at 0.49, while claims shown
  per step fell from 1.47 to 0.15: average claims random-walk around their
  starting strength, half fall below it, stop being followed, and never earn
  their way back. The unadvised baseline removed the collapse.
- **The key is the ceiling, and a sharper key is not automatically better.**
  Adding which way the goal lies made no difference to outcomes that six seeds
  can distinguish — two seeds favour it, six do not — and cost four times the
  context. A more specific key spreads the same evidence across more
  situations. That is the problem the merge step exists to solve, which makes
  it the next thing worth measuring.
- **Learning is fast and then flat.** Against the same mazes played without a
  store, the store wins on all five groups of eight seeds; "better late in the
  day than early" holds on only two. The advantage arrives within the first few
  episodes and plateaus. The spec's M1 acceptance — pain falling within a day —
  is not what this environment shows; FLOW-44 asserts the paired comparison
  instead.

One caution on the baseline: the store is compared with a plain fresh-cell
explorer (stretch about 4), which is weaker than maze-core's own player with
its riverbed and planner (about 2.5). The margin is real; the reference point
is modest.

## Open tensions

- **Who may rewrite a document?** Sleep proposing an amendment is safe. Sleep
  applying one without review makes the weights self-modifying, which is the
  thing rule 2 exists to prevent. The console's amend path makes the reviewed
  version cheap; it should probably stay reviewed.
- **The spec's distillation test has no DEP analogue yet.** "Is the entry
  absorbed?" becomes "does the question still need that passage?" — answerable
  by re-running the question against the rewritten doc with the passage
  withheld. That is a real test and it is not written.
- **Two scorers or one?** The heartbeat spec scores follow-up behaviour
  (answered, ignored, escalated); the context game scores retrieval. They share
  a situation key shape but reward different things. One Scorer with two
  outcome kinds, or two?
- **Merge needs a judge the player cannot be.** DEP has no second model. The
  cheapest honest judge for documentation merges is `dep validate` plus a human
  on the console, not another LLM.

## Notating the game

The game needs three things written down, and they want different notations.
The standard worth borrowing is not a file format, it is the MDP tuple
⟨situations, actions, reward, clocks⟩. Each part already has a home here.

```
 LAYER        WHAT IT SAYS                      NOTATION
 ──────────   ───────────────────────────────   ─────────────────────────
 the rules    key features, action space,       dep: game frontmatter
              reward table, clocks, gate        (new, one block)
 the levels   concrete situations and the       Gherkin — .feature files
              outcome that counts as a win      (exists, 386 of them)
 the policy   what the agent does, step         DAP trees
              by step                           (exists)
```

### Gherkin is the honest matter

Rule 2 wants a Scorer derived from the environment that the player cannot
write. A scenario executed by a step runner is exactly that: the `Then` clause
decides, the agent does not, and the verdict is reproducible.

```
 @flow-41 @security          ◀── situation key: categorical features
 Scenario: The console is reachable only from this machine
   Given a running console   ◀── precondition, part of the key
   When ...                  ◀── the action the player must produce
   Then it accepts connections only from this machine
                             ◀── the Scorer. Binary, un-arguable,
                                 and owned by someone other than the player
```

A `Scenario Outline` is better still: its `Examples` table is a parameterised
family of situations that differ in one column, which is precisely the space a
similarity function needs in order to generalise. Tags give the categorical
features, the table gives the parametric ones, and the `Given` steps give the
preconditions. The situation key does not need inventing; it needs reading off.

### What Gherkin must not be asked to carry

A reward table, a decay rate, a token budget and a convergence gate are
declarative configuration. Writing them as scenarios would mean a `Then` that
asserts a constant, which tests nothing and reads badly. Those go in the rules
block.

Binary pass or fail is also too coarse on its own. Shape it with cost, which
the trace record already measures:

```
 reward = outcome + cost

 outcome   scenario passed                      +1.0
           scenario failed                      −1.0
           a scenario that passed now fails     −2.0
 cost      tokens spent on the attempt          −k · tokens
           attempts before green                −k · retries
```

### The rules block

```yaml
---
dep: game
id: game.docs-retrieval
arena: cli/features                 # where the levels live
levels: "@flow-* and not @wip"      # which ones are in play
situation:
  features:
    flow:    tag:flow-*
    kind:    tag:happy-path|validation|edge-case|error|security
    surface: given                  # the Given phrases, hashed
    row:     examples               # the Examples row, when there is one
actions:
  may_write:  [cli/src/**, docs/**]
  never_write: [cli/features/steps/**, tests/**]
scoring:
  authority: suite                  # the runner scores, never the player
  pass: 1.0
  fail: -1.0
  regression: -2.0
  cost_per_1k_tokens: -0.01
clocks:
  episode: one scenario
  day: one full suite run
  sleep: nightly
gate:
  pain_slope: "<= 0"
  variance_below: 0.25
---
```

`never_write` is what makes rule 2 enforceable rather than aspirational. The
Scorer's territory is a path glob, so an episode whose diff touches it is void,
and `git diff --name-only` is the whole check.

### The loop this repo already runs

`/dep-story` is the game, played by hand: write the scenario (the level), run
it red (pain), implement (the action), run it green (gain), commit. Nothing
about the loop is new. What the game adds is a store that remembers which
context made which level go green, and a sleep that turns the strong grooves
into documentation.
