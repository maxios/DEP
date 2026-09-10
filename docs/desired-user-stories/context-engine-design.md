# Desired capability — DEP as an embedded context engine

Design notes behind the desired user stories in [`dep-context.feature.md`](dep-context.feature.md).
Nothing here is built yet. This file exists so every desired feature has something concrete to
trace back to; the `# Design:` comments in the stories point at the anchors below.

## Why

Retrieval-augmented context today is a flat list ranked by similarity. It cannot answer *is this
still true*, *is this meant for this reader*, or *what does this assume I already know*. A DEP set
already carries the metadata that answers all three — `last_verified` and the review cadence,
`audience`, and the typed `REQUIRES` / `TEACHES` edges. The desired capability turns that metadata
into a ranking and packing signal instead of leaving it as governance decoration.

## What already exists

| Layer | Today |
| --- | --- |
| Storage | `.dep-vectors.db` (SQLite) + document frontmatter |
| Index | `dep vectorize` — chunker, local/OpenAI embedding providers |
| Ranking | `dep search --hybrid` — `0.7 · semantic + 0.3 · keyword` (`cli/src/commands/search.ts`) |
| Graph | `cli/src/graph.ts` — typed edges, reachability, cycles, lifecycle states |
| Traversal | `dep neighbors`, `dep prereqs`, `dep roadmap` |
| Progressive loading | `dep dap node` — one decision node at a time |

## What is missing

1. **No library surface.** Every command in `cli/src/commands/` ends in `console.log`. Embedding
   requires a callable core that returns values and raises errors.
2. **No budget.** Retrieval returns paths, not a bundle packed to fit a declared size.
3. **The graph contributes nothing to ranking.** Hybrid scoring ignores edges entirely.
4. **Passages are graph-orphans.** Chunks carry no relationships back to the graph.
5. **The graph is rebuilt on every invocation.** Fine for a CLI, wasteful when called repeatedly.
6. **No feedback.** Nothing records which retrieved context was actually used.

## <a id="pipeline"></a>Retrieval pipeline

```
dep context "<question>" --budget 8000 --audience ai-agent --json

  seeds     hybrid search — meaning + wording
  expand    walk typed edges outward from the seeds
            REQUIRES weighted highest (comprehension dependencies)
            TEACHES / EXPLAINS medium, USES / NEXT lower, INLINE lowest
  filter    audience, type, tag, path; stale withheld or marked
  order     prerequisites ahead of the passages that depend on them
  pack      fill the budget by value per unit of size, best first
  emit      passages + provenance + freshness + why each was chosen
```

## <a id="budget"></a>Budget contract

The declared budget is a ceiling, never a target. A bundle may come back smaller than the budget;
it may never come back larger. When the highest-ranked passage alone cannot fit, that is reported
rather than silently dropped. Padding a bundle with weak matches to consume a budget is a defect.

## <a id="freshness"></a>Freshness policy

Lifecycle states are already computed from `last_verified` against the per-type review cadence in
`.docspec`. The desired behaviour maps them onto retrieval: `FRESH` is served plainly, `AGING` is
served and marked, `STALE` is withheld unless explicitly requested — with one exception, a stale
document that a served passage requires is pulled in and marked, because dropping it would leave
the fresh passage incomprehensible.

## <a id="provenance"></a>Provenance contract

Every passage in a bundle carries where it came from, how fresh it is, and why it was chosen —
matched directly, required by another passage, or expanded from one. This is the part no embedding
store can offer, and it is what lets the consuming agent reason about its own context rather than
trusting it blindly.

## <a id="api"></a>Embedding surface

A callable core — open a documentation set once, make many requests against it, get structured
values back, catch errors as exceptions. The CLI becomes a thin wrapper over the same core, so the
two can never disagree about what a request means.

## <a id="feedback"></a>Feedback loop

A consumer can report which passages it actually used. That signal is local, additive, and
clearable; without it ranking behaves exactly as it does today. It also exposes the inverse
question — which documents are retrieved constantly and never used — as a rewriting signal.
