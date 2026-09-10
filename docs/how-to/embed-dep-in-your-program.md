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
    - cli/src/lib.ts
    - cli/src/context/set.ts
    - cli/src/context/procedure.ts
    - cli/src/context/usage.ts
  tags:
    - library
    - integration
    - agent
    - context
  links:
    - target: ../reference/context-bundle-schema.md
      rel: USES
    - target: assemble-a-context-bundle.md
      rel: USES
---

# How-To: Embed DEP in Your Own Program

**Goal**: Call DEP's retrieval, graph, validation and procedures from your own code and get values back — no subprocess, no parsing of printed output.

## Prerequisites

- Bun (the library uses `bun:sqlite`)
- The DEP repository as a dependency; the entry point is `cli/src/lib.ts`

## Steps

### 1. Open the set once

```ts
import { openDocumentationSet, DepError } from '@dep/cli/src/lib'

const set = openDocumentationSet('/path/to/project')   // throws DepError if .docspec is missing
```

The set reads the project on first use and keeps it; `set.refresh()` re-reads after documents change.

### 2. Ask for context

```ts
const bundle = await set.context("how is a document's freshness decided", {
  budget: 4000,
  audience: 'ai-agent',
})
for (const p of bundle.passages) console.log(p.document, p.section, p.reason.kind, p.freshness.state)
```

### 3. Catch failures instead of exiting

```ts
try {
  await set.context('…', { budget: -1 })
} catch (err) {
  if (err instanceof DepError) console.log(err.code, err.message)   // INVALID_BUDGET …
}
```

Nothing in the library writes to your output streams or calls `process.exit`.

### 4. Use the rest of the surface

```ts
await set.search('type purity')            // documents ranked the same way a bundle is
set.graph()                                // nodes, edges, orphans, cycles
set.validate()                             // one verdict per document plus graph checks
set.metadata('docs/reference/docspec-schema.md')
await set.index()                          // bring the index up to date; returns what was processed
```

### 5. Walk a procedure with a budget

```ts
const session = set.procedureSession({ budget: 3000 })
const step = await set.procedureStep('validate-and-fix', 'run-validation', { session })
step.step                 // the DAP node, always whole
step.support.passages     // supporting knowledge, each saying which part of the step it supports
step.session.remaining    // carried across steps and across a handoff
```

Passages already supplied in the session are never supplied twice; they are listed under `support.alreadySupplied`.

### 6. Report what was used

```ts
set.recordUsage(bundle.id, [bundle.passages[0].id])
set.usageReport().passedOver   // documents retrieved often and used rarely
```

The record lives at `<root>/.dep-usage.json`, never leaves the machine, and with nothing recorded ranking is exactly what it would be without one.

## Verification

- `set.stats.loads` stays at its initial value across many `context()` calls
- `dep context … --json` and `set.context()` with the same options produce the same passage ids and bundle id
