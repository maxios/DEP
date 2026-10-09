# Real data for the console's Game designer screen (DEP loop engine)

A game is a DEP reference document with a `game:` block. Levels are Gherkin
scenarios; Cucumber is the only judge; the agent learns by playing days.

## Games in this project
- game.requests — packages/loop/arenas/requests/game.md — 125 levels — the reference arena (demo)
- game.doc-maintenance — docs/games/doc-maintenance.md — DRAFT — the first game for this project

## game.requests (existing, valid)
id: game.requests · arena: arena · levels: "@play and not @wip" · levels independent: yes
options: accept · refuse · convert · defer
situation (how a level's situation is read):
  area      tag:area-.+                        → area-billing, area-invoices, area-payouts, area-refunds, area-transfers
  kind      tag:happy-path|edge-case|validation
  size      row:size                           → small, medium, large
  currency  row:currency                       → USD, EUR, GBP, JPY
  tier      row:tier                           → new, silver, gold, platinum
scoring: authority suite · pass +1 · fail −1 · regression −2
may write: arena/choices/**   (the judge's ground — features/ and steps/ — can never be written)
judge: arena/steps/requests.steps.ts  (code; edited in the repo, not in the console)
levels by feature: billing 25 · invoices 25 · payouts 25 · refunds 25 · transfers 25
sample levels:
  billing.feature:5:12  A billing request is handled  area-billing · happy-path · large · EUR · gold
  billing.feature:5:13  A billing request is handled  area-billing · happy-path · large · EUR · platinum
  billing.feature:5:14  A billing request is handled  area-billing · happy-path · medium · JPY · platinum

Last day played (seed 1, day 9): 40 levels · passed 30 · failed 10 · void 0 · pass rate 0.75
learned: 11 rules · 2 habits · "When the tier is gold: choose convert" 205/249

## game.doc-maintenance (draft — what the designer is creating)
Each level is a situation a documentation owner meets; the agent chooses what to do.
options: review · bump · propose-fix · skip
situation:
  type        row:type          → tutorial, how-to, reference, explanation, decision-record
  lifecycle   row:lifecycle     → FRESH, AGING, STALE
  deps        row:deps          → changed, unchanged, none
  confidence  row:confidence    → high, medium, low
levels (Scenario Outline "A document due for review is handled"):
  | type      | lifecycle | deps      | confidence | expected        |
  | reference | STALE     | changed   | high       | propose-fix     |
  | how-to    | STALE     | unchanged | high       | review          |
  | explanation | AGING   | unchanged | high       | bump            |
  | tutorial  | FRESH     | none      | high       | skip            |
judge steps: NOT WRITTEN YET — needs docs/games/arena/steps/maintenance.steps.ts (repo, reviewed)
policy encoded by the judge: never bump when a dependency changed; STALE needs a review before a bump

## What the designer checks (real errors from the game loader)
- SCORER        "the scenarios must be the only judge" (scoring.authority is not suite)
- JUDGE_GROUND  "the player may not write where it is judged" (may_write overlaps features/ or steps/)
- ARENA_MISSING "the arena cannot be found: arena needs a features/ directory"
- SITUATION     "the situation's "region" cannot be read: … is not tag:<pattern>, row:<column> or given"
- (draft) judge steps missing → the game cannot be played until they exist

## Actions on the screen
Preview levels · Check (validate the game document) · Play a day (40 levels, by rule — no model unless loop.models allows) · Open learned document
