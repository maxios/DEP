# DEP & DAP — Usage Guide

What to run, in what order, and what you should see. Every output below was
captured from this repository's own documentation set, trimmed with `…` where
long. Where your project differs, the *shape* is what to expect.

```
  KNOWLEDGE                          DECISIONS
  ┌──────────────────────┐           ┌──────────────────────┐
  │  DEP                 │           │  DAP                 │
  │  docs/**/*.md        │           │  dap/trees/*.md      │
  │  ┌─ dep: ─────────┐  │           │  ┌─ dap: ─────────┐  │
  │  │ type, audience │  │           │  │ trigger, entry │  │
  │  │ last_verified  │  │           │  │ nodes [?][>]   │  │
  │  │ links (typed)  │  │           │  │       [!][@]   │  │
  │  └────────────────┘  │           │  └────────────────┘  │
  └──────────┬───────────┘           └──────────┬───────────┘
             │ .docspec                          │ dap/.dapspec
             ▼                                   ▼
  ╔══════════════════════════════════════════════════════════╗
  ║  dep  ── graph · validate · query · search · context ──  ║
  ║       ── dap resolve · node · trace · validate · graph   ║
  ╚═══════════════════════════╤══════════════════════════════╝
                              │ values (--json) or text
                              ▼
                      ○ you, or an agent
```

DEP structures **knowledge**; DAP structures **decisions**; one CLI reads both.
An agent asks DEP *what is true* and DAP *what to do next*.

---

## 1. Install and point at a project

```bash
curl -fsSL https://raw.githubusercontent.com/maxios/DEP/main/install.sh | sh
export PATH="$HOME/.dep/bin:$PATH"
dep version    # → dep 0.3.0
```

Skills need `dep context`, which binaries older than 0.3.0 lack. Check and
upgrade in place — the download is run and must report a version before it
replaces anything, and the previous binary is kept as `dep.prev`:

```
$ dep upgrade --check
Installed 0.2.0, latest 0.3.0 — upgrade available: run `dep upgrade`

$ dep upgrade
Installed: dep 0.2.0
Installing: dep 0.3.0
Installed dep 0.3.0 at /Users/you/.dep/bin/dep (previous kept as /Users/you/.dep/bin/dep.prev)
```

Every command takes `--root <project>`; the project root is where `.docspec`
lives. Add `--json` to any command when a program is the reader.

```
  project/
  ├── .docspec          ← audiences, directory map, review cadences
  ├── docs/             ← documents with a dep: block
  ├── dap/.dapspec      ← procedures config
  ├── dap/trees/        ← decision trees
  └── .dep-vectors.db   ← index (after dep vectorize; gitignored)
```

---

## 2. Which command, for which question

```
  I WANT TO…                          RUN                          YOU'LL SEE
  ──────────────────────────────────  ───────────────────────────  ─────────────────────
  see the whole set at once           dep graph                    tree by type, ● ◐ ○
  know what is broken or stale        dep validate                 PASS/WARN/FAIL per doc
  narrow by metadata                  dep query --type …           filtered list
  find where a subject lives          dep search "…"               scored hits + why
  find by meaning, not wording        dep search "…" --hybrid      similarity per chunk
  see what depends on a document      dep backlinks <file>         inbound edges by rel
  walk outward from a document        dep neighbors <file>         hops, grouped by depth
  read in the intended order          dep roadmap <audience>       numbered path
  read prerequisites first            dep prereqs <file>           ordered chain
  change metadata safely              dep set/bump/tag/link        before → after
  regenerate index pages              dep index                    files written
  give an agent the right context     dep context "…" --budget N   packed, cited passages
  keep retrieval current              dep vectorize                processed / reused
  find the procedure for a request    dep dap resolve "…"          scored trees
  follow a procedure one step         dep dap node <tree> <node>   one node, nothing more
  see a whole procedure               dep dap trace <tree>         ASCII tree
```

---

## 3. Know your set: `graph` · `validate` · `query`

### `dep graph --root .`

```
DEP Documentation Graph

explanation/
  ├── docs/explanation/bootstrap-sequence.md ● [high]
  │   → REQUIRES seed.md
  │   → REQUIRES docs/explanation/docspec-file.md
  ├── docs/explanation/docspec-file.md ● [high]
  │   → EXPLAINS docs/reference/docspec-schema.md
  ├── docs/explanation/why-type-purity-matters.md ● [high]
  │   → EXPLAINS docs/reference/document-type-signatures.md
  │   → EXPLAINS docs/decision-records/dr-001-five-types-not-four.md
  …
34 documents, 109 edges, 0 orphans, 0 cycles
```

How to read a row:

```
  ├── docs/explanation/docspec-file.md ● [high]
      └────────── path ──────────┘ │    └ confidence (declared)
                                   └ lifecycle: ● fresh  ◐ aging  ○ stale
  │   → EXPLAINS docs/reference/docspec-schema.md
        └ typed edge: this document EXPLAINS that one
```

`--mermaid` and `--dot` give the same graph for rendering; `--json` gives the
nodes and edges.

### `dep validate --root .`

```
## DEP Validation Report

Documents: 34 | Pass: 21 | Warn: 13 | Fail: 0

✓ docs/explanation/bootstrap-sequence.md — PASS
◐ docs/how-to/configure-governance.md — WARN
    ✗ Lifecycle: STALE: Document exceeds review cadence
…
### Graph Integrity

✓ No orphans
✓ No REQUIRES cycles
✓ Entry points exist
```

The verdict has two halves and three levels:

```
  per document                       per set
  ─────────────────────────────      ─────────────────────
  ✓ PASS  every check passed         ✓ No orphans
  ◐ WARN  only freshness failed      ✓ No REQUIRES cycles
  ✗ FAIL  a structural check failed  ✓ Entry points exist
```

A WARN is a document past its review cadence — true, but unverified. A FAIL is
metadata, type, audience, link or date trouble. Exit code is 1 on any FAIL.

### `dep query --type how-to --root .`

```
4 document(s) found:

  docs/how-to/configure-governance.md
    type: how-to | audience: project-lead, human-author | ○ STALE | confidence: high
  docs/how-to/validate-a-document.md
    type: how-to | audience: ai-agent, human-author | ○ STALE | confidence: high
  …
```

Filters combine: `--type`, `--audience`, `--tag`, `--confidence`,
`--lifecycle FRESH|AGING|STALE`, `--owner`.

---

## 4. Find things: `search` in three modes, `vectorize`

```
  MODE          NEEDS INDEX   MATCHES ON        RANKED BY
  ────────────  ───────────   ────────────────  ───────────────────────
  (default)     no            words             title 3 · tag 2 · line 1
  --semantic    yes           meaning           cosine similarity
  --hybrid      yes           both              0.7 semantic + 0.3 words
```

### `dep search "type purity" --root .`

```
10 result(s) for "type purity":

  [1] docs/index.md (score: 31)
      Title: Documentation Engineering Protocol — Documentation Root
      ...[why-type-purity-matters](explanation/why-type-purity-matters.md...
  [2] seed.md (score: 23)
      Title: Documentation Engineering Protocol — Seed Document
      ...Documentation fails when it addresses the system without modeling…
  …
```

Each hit says *why* it matched: title, tags, and the lines that hit. Index
pages rank high on wording because they list everything — that is exactly the
case meaning-based search fixes.

### `dep vectorize --root .` then `dep search "freshness cadence" --hybrid --root .`

```
10 result(s) for "freshness cadence":

  [1] seed.md (similarity: 0.317)
      Chunk: … > 6 — Layer 4: Lifecycle & Governance > Staleness Triggers
      A document transitions to `STALE` when ...
  [2] docs/how-to/configure-governance.md (similarity: 0.250)
      Chunk: How-To: Configure Governance > Verification
  …
```

Hybrid hits name the **chunk** (section) that matched, not just the document.
`dep vectorize --dry` previews how documents will be chunked:

```
Dry run: 34 docs, 354 total chunks
  docs/explanation/bootstrap-sequence.md (9 chunks)
  …
```

Providers: `local` (a small on-device model, default), `openai` (needs
`DEP_OPENAI_API_KEY`), `hash` (deterministic, offline, lexical — for tests
and for projects that want no model at all). Set it in `.docspec` under
`vectorization.provider`.

---

## 5. Move through the graph

```
  backlinks   who points at me?           ◀── inbound, grouped by relationship
  neighbors   what is around me?          ◀─▶ N hops, any relationship
  prereqs     what must I read first?     ──▶ REQUIRES chain, in order
  roadmap     what should THIS reader     ──▶ from the audience entry point
              read, in what order?
```

### `dep backlinks seed.md --root .`

```
Backlinks for seed.md:

  REQUIRES:
    ← docs/explanation/bootstrap-sequence.md
    ← docs/explanation/anti-patterns.md
    ← docs/explanation/domain-generalization.md
    ← docs/explanation/extension-points.md

  INLINE:
    ← docs/index.md
```

### `dep neighbors docs/how-to/validate-a-document.md --depth 2 --root .`

```
Neighbors of docs/how-to/validate-a-document.md (depth: 2)

  Depth 1:
    → USES docs/reference/dep-metadata-schema.md
    → USES docs/reference/document-type-signatures.md
    ← NEXT docs/how-to/add-dep-metadata.md
    ← NEXT docs/tutorials/integrate-dep-into-agent.md
    …
  Depth 2:
    ← DECIDES docs/decision-records/dr-003-… (via dep-metadata-schema.md)
```

`→` outgoing, `←` incoming; `(via …)` names the hop. Narrow with
`--follow REQUIRES,TEACHES` and `--direction in|out`.

### `dep roadmap human-author --root .`

```
Learning Roadmap for: Human Documentation Author (human-author)
Entry point: docs/tutorials/write-your-first-dep-document.md

  1. [tutorial] Tutorial: Write Your First DEP Document
  2. [reference] DEP Metadata Schema Reference
  3. [reference] Document Type Signatures Reference
  …
8 documents in learning path
```

Only documents written for that audience appear, in the order the authors
linked them. `dep prereqs <file>` is the same idea for one document:

```
Prerequisites for: docs/explanation/bootstrap-sequence.md

  Read in this order:
  1. The `.docspec` File (docs/explanation/docspec-file.md)
  2. Documentation Engineering Protocol — Seed Document (seed.md)

  Then read: Bootstrap Sequence for AI
```

---

## 6. Maintain metadata without touching YAML

Never edit a `dep:` block by hand — the write commands validate values
before they reach the file and keep the frontmatter's shape. Every one of
them takes `--dry` to show the change first.

```
  dep set  <file> --confidence medium     one or more fields
  dep bump <file>                         last_verified → now
  dep bump --all --lifecycle STALE        every stale document at once
  dep tag  <file> --add cli --remove old  tags
  dep link <file> --target ../x.md --rel TEACHES   typed relationships
```

### `dep set docs/reference/dep-metadata-schema.md --confidence medium --dry --root .`

```
Dry run — file not modified.

docs/reference/dep-metadata-schema.md
  confidence: high → medium
```

### `dep bump --all --lifecycle STALE --dry --root .`

```
Dry run — no files modified.

[dry] docs/how-to/configure-governance.md
  2026-03-24T00:00:00+02:00 → 2026-09-10T15:27:22.439+03:00
[dry] docs/how-to/generate-a-document-set.md
  2026-04-26T20:29:13.394+03:00 → 2026-09-10T15:27:22.439+03:00
…
```

Bump only what you actually re-read: the date is a claim that the document
was verified.

### `dep index --dry --root .`

```
Would write: docs/tutorials/index.md
Would write: docs/how-to/index.md
Would write: docs/reference/index.md
Would write: docs/explanation/index.md
Would write: docs/decision-records/index.md
Would write: docs/index.md
```

Index pages are generated from metadata, so nobody maintains link lists by
hand — and generated index pages count as reachable roots, which is why a
new document stops being an orphan once `dep index` has run.

---

## 7. Context bundles for agents: `dep context`

The command that turns a set into a retrieval layer. It answers a question
with passages packed to a budget, holding back expired knowledge and saying,
per passage, where it came from and why it is there.

```
  "how is freshness decided" --budget 700
            │
            ▼
   ┌─────────────────┐  meaning + wording, IDF-weighted
   │ 1  seed         │◀──────────────────── index (.dep-vectors.db)
   └────────┬────────┘  or wording alone with no index
            ▼
   ┌─────────────────┐  REQUIRES ▬▬▬  TEACHES/EXPLAINS ═══
   │ 2  expand       │  USES ───  NEXT ┄┄┄  INLINE ┈┈┈
   └────────┬────────┘
            ▼
   ┌─────────────────┐  audience · type · tag · path
   │ 3  filter       │  ● fresh served  ◐ aging marked  ○ stale withheld
   └────────┬────────┘
            ▼
   ┌─────────────────┐  best value first, prerequisites ahead of
   │ 4  pack         │  what needs them, never over the ceiling
   └────────┬────────┘
            ▼
   ┌─────────────────┐  document · section · freshness · reason
   │ 5  emit         │
   └─────────────────┘
```

### `dep context "how is a document's freshness decided" --budget 700 --root .`

```
Context for "how is a document's freshness decided"
  5 passage(s), 698/700 tokens used, ranking: hybrid, 34 document(s) considered

[1] seed.md › 6 — Layer 4: Lifecycle & Governance > The Abstraction
    score 0.6914 · 277 tokens · matched · fresh · owner @dep-core

    Documentation exists in time. Entropy is the default. Without active
    maintenance, every document drifts from accuracy toward harm …
    DEP models document lifecycle as a state machine:
    FRESH → AGING → STALE → ABANDONED
    …

[2] seed.md › 6 — Layer 4: Lifecycle & Governance > Staleness Triggers
    score 0.6172 · 118 tokens · matched · fresh · owner @dep-core
    …

Withheld:
  docs/how-to/configure-governance.md — 4 passage(s), stale, last verified 2026-03-23
  docs/reference/dep-metadata-schema.md — 11 passage(s), stale, last verified 2026-04-26
  …

Notes:
  withheld-stale: 13 matching document(s) withheld for being past the review date

bundle bca169c5cb22e8f2 · index built 2026-09-10T15:33:42.275Z
```

Anatomy of one passage line:

```
  [1] seed.md › 6 — Layer 4 … > The Abstraction
      └ document      └ section (heading path)

      score 0.6914 · 277 tokens · matched · fresh · owner @dep-core
      └ relevance     └ budget cost  │        │        └ who to ask
                                     │        └ freshness state (+ note)
                                     └ why it is here:
                                       matched | required-by X | expanded-from X
```

**The budget is a ceiling, never a target.** 698/700 here because the next
passage did not fit; with two relevant passages and room for twenty, you get
two. If even the best passage would not fit, the bundle is empty and a
`nothing-fits` note names the smallest budget that would return something.

What the freshness policy does with each document:

```
                       withhold-stale   include-stale   fresh-only
                       (default)
  ● fresh              served           served          served
  ◐ aging              served, marked   served, marked  withheld
  ○ stale              withheld         served, marked  withheld
  ○ stale, REQUIRED    served, marked   served, marked  served, marked
    by a served one
```

Narrow, expand, and read it as data:

```bash
dep context "…" --audience ai-agent --type reference   # only what is for this reader
dep context "…" --within docs/reference --tag lifecycle # only part of the set
dep context "…" --depth 2                               # follow relationships 2 hops
dep context "…" --no-expand                             # only direct matches
dep context "…" --budget 500 --json \
  | jq '.passages[] | {document, section, reason, freshness}'
```

`--json` shape (top level):

```
  id  question  ranking  budget{declared,used,remaining,unit,estimator}
  considered  reached{matched,expanded}
  passages[]  withheld[]  omitted[]  excluded[]  notices[]
  index{present,builtAt,provider,incomplete}  usageRecordVersion
```

Notes you will meet, and what they mean:

```
  NOTE                      MEANING                                 DO
  ────────────────────────  ──────────────────────────────────────  ─────────────────
  keyword-only              no index; ranked by wording alone       dep vectorize
  withheld-stale            matches exist but are past review       bump after re-reading,
                                                                    or --freshness include-stale
  all-stale                 every match has expired                 same
  nothing-fits              budget below the smallest passage       raise --budget
  chain-truncated           prerequisites did not fit; lists them   raise --budget
  index-out-of-sync         documents changed since indexing        dep vectorize
  index-behind              index holds deleted documents           dep vectorize
  index-incomplete          last update was interrupted             dep vectorize (resumes)
  missing-prerequisite      a REQUIRES target does not exist        fix the link
  requirement-cycle         documents require each other            fix the links
  restriction-excluded-all  your filters left nothing               loosen them
  no-match                  nothing is about this question          —
```

Field-by-field reference: [docs/reference/context-bundle-schema.md](docs/reference/context-bundle-schema.md).

---

## 8. Keep retrieval current: `vectorize`

```
  edit a document ──▶ dep vectorize ──▶ only that document is re-embedded
  delete one      ──▶ dep vectorize ──▶ its passages leave the index
  move one        ──▶ dep vectorize ──▶ new path in, old path out
  change provider ──▶ dep vectorize ──▶ REFUSED: rebuild with --force
  commit          ──▶ (hook)        ──▶ all of the above, unasked
```

```bash
dep vectorize --root .                          # incremental
dep vectorize --only docs/reference/x.md --root . # one document
dep vectorize --install-hook --root .           # post-commit hook
dep vectorize --force --root .                  # full rebuild
```

`--install-hook` writes `.git/hooks/post-commit`:

```
#!/bin/sh
# installed by dep — keeps the retrieval index in step with committed documents
"…/bun" "…/cli/src/index.ts" vectorize --root . --json
```

Whether a document is *past its review date* needs no re-index: it is
computed from metadata at request time, so it moves on overnight by itself.

---

## 9. Embed DEP in your own program

The CLI is a thin wrapper over a library that returns values and throws
`DepError` — it never prints and never exits your process.

```ts
import { openDocumentationSet, DepError } from '@dep/cli/src/lib'

const set = openDocumentationSet('/path/to/project')

const bundle = await set.context("how is a document's freshness decided", {
  budget: 4000, audience: 'ai-agent',
})
bundle.passages.map((p) => [p.document, p.reason.kind, p.freshness.state])
// → [['seed.md', 'match', 'fresh'], ['docs/…', 'required-by', 'stale'], …]

await set.search('type purity')        // documents ranked the same way
set.graph()                            // nodes, edges, orphans, cycles
set.validate().summary                 // { pass, warn, fail, graphFailures, ok }
set.metadata('docs/reference/docspec-schema.md')
await set.index()                      // { processed, reused, removed, unreadable, … }

try { await set.context('…', { budget: -1 }) }
catch (e) { if (e instanceof DepError) console.log(e.code) }   // INVALID_BUDGET
```

The set is read once and kept; `set.refresh()` re-reads after edits.
`dep context --json` and `set.context()` with the same options produce the
same passages and the same bundle id.

Tell it what you used, and ranking learns:

```ts
set.recordUsage(bundle.id, [bundle.passages[0].id])   // → { recorded: true, version: 1 }
set.usageReport().passedOver
// → [{ document: 'docs/…', offered: 6, used: 0, passedOver: 6, suggestion: 'rewrite-or-retire' }]
```

The record lives at `<root>/.dep-usage.json`, never leaves the machine, and
with nothing recorded ranking is exactly what it would be without one.

Full walkthrough: [docs/how-to/embed-dep-in-your-program.md](docs/how-to/embed-dep-in-your-program.md).

---

## 10. DAP: decisions, one node at a time

A DAP tree is a procedure an agent follows without loading the whole thing.
Four node kinds, one CLI loop:

```
  [?] observe   gather — tool call or a human gate
  [>] decide    branch on conditions
  [!] act       do the terminal thing
  [@] delegate  hand off to another tree

        request
           │
           ▼
   dep dap resolve "…"  ──▶  tree + entry node
           │
           ▼
   ┌─▶ dep dap node <tree> <node>  ──▶  one node's fields
   │       │
   │       ├─ [?] run the tool / ask the human, keep the outputs
   │       ├─ [>] evaluate the condition table, pick `next`
   │       ├─ [!] perform the action ──▶ done (terminal)
   │       └─ [@] resolve delegate_to, continue there, return on_return
   │       │
   └───────┘  next
```

### `dep dap resolve "the docs might be out of date after my refactor" --root .`

```
Matches for "the docs might be out of date after my refactor":

  sync-stale-docs (score: 30)
    trigger: documentation may be out of date after code changes
    entry: check-staleness
    path: trees/sync-stale-docs.md

  choose-document-type (score: 6)
    trigger: determine what type a DEP document should be
    …
```

Score above zero is a match; take the top one and its `entry`.

### `dep dap node sync-stale-docs check-staleness --root .`

```
## check-staleness [?]

Query for stale and aging documents using the DEP CLI.

- **method**: tool_call
- **tool**: dep_query
- **args**: {"flags":"--lifecycle STALE --json"}
- **outputs**: stale_docs, stale_count
- **next**: check-aging
```

That is the whole payload: what to do, what it yields, where to go next. Run
the tool, bind `outputs`, call `dep dap node … check-aging`. A gate node has a
`prompt` and `options` instead — present them and wait for the person.

### `dep dap trace validate-and-fix --root .`

```
validate-and-fix
└── [?] run-validation (tool_call)
    └── [>] assess-results
        ├── fail_count == 0 AND warn_count == 0 ──▶ [!] report-clean (intent: report_success)
        ├── fail_count == 0 AND warn_count > 0
        │   └── [?] present-warnings (gate)
        │       └── [>] decide-warning-action
        │           ├── warning_decision == "fix-warnings"
        │           │   └── [!] fix-lifecycle (tool: dep_bump)
        │           │       ├── [?] run-validation (cycle ref)
        │           │       └── [!] present-full-report (intent: present_report)
        │           └── _otherwise
        │               └── [!] report-clean (cycle ref)
        ├── fail_count > 0
        │   └── [>] classify-failures
        │       ├── doc_failures contains "Metadata complete"
        │       │   └── [!] fix-metadata (dep://docs/how-to/add-dep-metadata.md)
        …
```

Use `trace` to review a procedure as a person; use `node` to follow it as an
agent. `(cycle ref)` marks a loop back — every route still ends in a `[!]`.

### `dep dap validate --root .` and `dep dap graph --root .`

```
## DAP Validation Report

Trees: 6 | Pass: 0 | Warn: 6 | Fail: 0

◐ validate-and-fix — WARN
    ✗ Lifecycle: STALE: Tree exceeds review cadence
…
```

```
DAP Delegation Graph

○ audit-existing-docs (22 nodes) [high]
  └── ▶ delegates to: validate-and-fix

○ generate-doc-set (22 nodes) [high]
  └── ▶ delegates to: validate-and-fix
…
```

Validation checks reachability, complete branching and a defined ending on
every route; the delegation graph shows which trees hand off to which.

### A procedure with a budget (library)

```ts
const session = set.procedureSession({ budget: 3000 })
const step = await set.procedureStep('validate-and-fix', 'run-validation', { session })

step.step                    // the node, always delivered whole
step.support.passages        // knowledge for it, each with `supports: 'description' | …`
step.session.remaining       // carried to the next step — and across a handoff
step.support.alreadySupplied // what an earlier step already gave you
```

---

## 11. From Claude Desktop (MCP)

`dep mcp` speaks the Model Context Protocol over stdio; the `@maxios/dep-mcp`
launcher gets the CLI onto the machine first and keeps it there.

```
  claude_desktop_config.json
  { "mcpServers": { "dep": { "command": "npx",
                             "args": ["-y", "@maxios/dep-mcp", "--root", "/path/to/project"] } } }
           │
           ▼
   npx @maxios/dep-mcp ──▶ ~/.dep/bin/dep missing?  ──▶ download · run · verify · place
                ──▶ newer release (≤ daily)? ──▶ install, keep dep.prev
                ──▶ exec  dep mcp --root …        stdout = protocol, stderr = notes
           │
           ▼
   tools:  dep_context  dep_search  dep_validate  dep_graph  dep_query
           dep_metadata dep_index   dap_resolve   dap_node   dap_trace  dep_version
```

Same place on every operating system — `~/.dep/bin/dep`, `dep.exe` on
Windows; `DEP_HOME` moves the tree. Every tool takes an optional `root`, so
one server serves many projects. What a call returns is the same value the
CLI's `--json` prints, as `structuredContent`:

```
  tools/call dep_context {question, budget: 1500}
    → { content: [{type: "text", …}],
        structuredContent: { passages: […], budget: {used: 1498, …}, … } }
```

## 12. From Claude Code

The plugin exposes the procedures as skills; each one runs the matching tree.

```
  /dep-validate   validate documents and fix issues   ──▶ validate-and-fix
  /dep-generate   generate a documentation set        ──▶ generate-doc-set
  /dep-audit      migrate existing docs to DEP        ──▶ audit-existing-docs
  /dep-sync       sync freshness with code changes    ──▶ sync-stale-docs
```

Install: `/plugin marketplace add <repo>` then `/plugin install dep@dep-marketplace`.

---

## 13. Reading the glyphs

```
  ● FRESH   verified within its cadence        ✓ passed     → outgoing edge
  ◐ AGING   within 2× cadence — schedule it    ◐ warning    ← incoming edge
  ○ STALE   past 2× cadence — withheld from    ✗ failed     [?] [>] [!] [@]
            bundles by default                              DAP node kinds

  relationships: TEACHES · USES · EXPLAINS · DECIDES · REQUIRES · NEXT · (INLINE, auto)
```

---

## 14. When something looks wrong

```
  YOU SEE                                  BECAUSE                          DO
  ───────────────────────────────────────  ───────────────────────────────  ───────────────────────
  "no DEP configuration found: … .docspec"  root has no .docspec             --root <project>
  many ◐ WARN in validate                  documents past review cadence    re-read, then dep bump
  ✗ Orphans: docs/…                        nothing reaches the document     dep index, or link to it
  ✗ REQUIRES cycles                        A requires B requires A          break one link
  search finds index.md first              index pages list everything      --hybrid
  ranking: keyword-only in a bundle        no index                         dep vectorize
  bundle empty, withheld list long         every match is stale             include-stale
  nothing-fits                             budget below one passage         raise --budget
  "cannot be mixed" from vectorize         provider changed in .docspec     dep vectorize --force
  CREDENTIAL_MISSING                       openai provider, no key          export DEP_OPENAI_API_KEY
  dap resolve scores all 0                 no tree declares that trigger    add trigger_patterns
  "dep: unknown command context"           binary older than 0.3.0          dep upgrade
  dep upgrade: "running from its source"   you run from cli/src, not a      git pull && bun install
                                           binary
```
