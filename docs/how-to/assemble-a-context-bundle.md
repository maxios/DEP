---
dep:
  type: how-to
  audience:
    - ai-agent
    - human-author
  owner: "@dep-core"
  created: 2026-09-10T18:30:00+03:00
  last_verified: 2026-09-10T18:30:00+03:00
  confidence: high
  depends_on:
    - cli/src/commands/context.ts
    - cli/src/context/retrieve.ts
  tags:
    - context
    - retrieval
    - cli
    - workflow
  links:
    - target: ../reference/context-bundle-schema.md
      rel: USES
    - target: keep-the-index-current.md
      rel: NEXT
    - target: embed-dep-in-your-program.md
      rel: NEXT
---

# How-To: Assemble a Context Bundle

**Goal**: Get the passages that answer a question, packed to a size you choose, with expired knowledge held back and every passage saying where it came from.

## Prerequisites

- The `dep` CLI and a project with a `.docspec`
- Optionally an index (`dep vectorize`) — without one the bundle is ranked by wording alone and says so

## Steps

### 1. Ask, with a budget

```bash
dep context "how is a document's freshness decided" --budget 2000 --root .
```

The budget is a ceiling in tokens (≈ characters ÷ 4). The bundle never exceeds it and is not padded to reach it.

### 2. Narrow the field when the reader is known

```bash
dep context "how is freshness decided" --audience ai-agent --type reference --root .
dep context "how is freshness decided" --within docs/reference --tag lifecycle --root .
```

Restrictions are applied before ranking, so a qualifying document is never lost below a retrieval cut. The bundle reports how many documents were `considered`.

### 3. Decide what to do with stale knowledge

```bash
dep context "…" --freshness include-stale --root .   # serve it, marked
dep context "…" --freshness fresh-only --root .      # hold back ageing too
```

By default stale documents are withheld and listed; a stale document that a served passage *requires* is still pulled in, marked, because dropping it would leave the served passage incomprehensible.

### 4. Control expansion

```bash
dep context "…" --depth 2 --root .     # follow relationships two hops out
dep context "…" --no-expand --root .   # only what matched the question
```

`REQUIRES` pulls hardest, then `TEACHES`/`EXPLAINS`, then `USES`, `NEXT`, and inline links weakest. Prerequisites appear before the passage that needs them.

### 5. Consume it from a program

```bash
dep context "…" --budget 2000 --json --root . | jq '.passages[] | {document, section, reason, freshness}'
```

Every passage carries `document`, `section`, `tokens`, `score`, `reason`, `freshness`, `owner` and `outOfSync`.

## Verification

- `budget.used` ≤ `budget.declared` and equals the sum of `passages[].tokens`
- No `index-out-of-sync` notice — otherwise run `dep vectorize`
- `ranking` is `hybrid`; `keyword-only` means the index is missing

## Related

- Field-by-field: [Context Bundle Schema Reference](../reference/context-bundle-schema.md)
- Why a budget and a freshness policy at all: [Why Budgeted Context](../explanation/why-budgeted-context.md)
