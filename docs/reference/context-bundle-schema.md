---
dep:
  type: reference
  audience:
    - ai-agent
    - human-author
  owner: "@dep-core"
  created: 2026-09-10T18:30:00+03:00
  last_verified: 2026-09-10T18:30:00+03:00
  confidence: high
  depends_on:
    - cli/src/context/types.ts
    - cli/src/context/retrieve.ts
    - cli/src/context/options.ts
  tags:
    - context
    - retrieval
    - schema
    - cli
  links:
    - target: ../explanation/why-budgeted-context.md
      rel: EXPLAINS
---

# Context Bundle Schema Reference

A **bundle** is what `dep context` and `DocumentationSet.context()` return: the passages that answer a question, packed to a budget, each carrying where it came from, how fresh it is and why it was chosen. This reference defines every field, option, notice and error.

## Request options

| Option | CLI flag | Type | Default | Meaning |
|--------|----------|------|---------|---------|
| `budget` | `--budget N` | positive number | 8000 | Ceiling on the bundle size in tokens. Never a target. |
| `audience` | `--audience id` | string | — | Only documents written for this audience id (must be declared in `.docspec`). |
| `type` | `--type t` | string | — | Only documents of this type (one of the five canonical types, or a custom one). |
| `tags` | `--tag a,b` | string[] | — | Only documents carrying **every** listed tag. |
| `within` | `--within path` | string | — | Only documents under this path, relative to the project root. |
| `freshness` | `--freshness p` | `withhold-stale` \| `include-stale` \| `fresh-only` | `withhold-stale` | What to do with documents past their review date. |
| `depth` | `--depth N` | whole number ≥ 0 | 1 | How many relationships deep expansion may reach. 0 disables it. |
| `expand` | `--no-expand` | boolean | true | Pull in documents the matches relate to. |
| `minScore` | `--min-score F` | 0…1 | 0.2 | Relevance floor; passages below it are left out even when the budget could hold them. |
| `provenance` | — | `true` | true | Passing `false` is refused: provenance is part of every bundle. |

Tokens are estimated as characters ÷ 4 (`budget.estimator` says so in every bundle).

## Bundle

| Field | Type | Meaning |
|-------|------|---------|
| `id` | string | Deterministic for the same question, options, index and usage-record version. |
| `question` | string | The question as asked. |
| `ranking` | `hybrid` \| `keyword-only` | `hybrid` when an index exists (meaning + wording); `keyword-only` when it does not. |
| `budget` | `{ declared, used, remaining, unit, estimator }` | `used` equals the sum of passage sizes; `unit` is always `tokens`. |
| `considered` | number | Documents that survived the restrictions and were scored. |
| `reached` | `{ matched, expanded }` | How many passages got in by matching versus by expansion. |
| `passages` | Passage[] | In reading order: most useful first, prerequisites ahead of what needs them. |
| `withheld` | Withheld[] | Relevant passages held back by the freshness policy. |
| `omitted` | Omitted[] | Relevant passages that did not fit the budget. |
| `excluded` | `{ id, document, section }[]` | Relevant passages already supplied elsewhere (procedure sessions only). |
| `notices` | Notice[] | Anything the consumer should know; see the notice table. |
| `index` | `{ present, builtAt, provider, incomplete }` | Which index the bundle was drawn from, if any. |
| `usageRecordVersion` | number | Version of the usage record that influenced ranking; 0 when none. |

## Passage

| Field | Type | Meaning |
|-------|------|---------|
| `id` | string | Digest of document + section + content. Survives an index rebuild. |
| `document` | string | Path relative to the project root. |
| `section` | string | Heading path within the document; `(top)` for the untitled lead. |
| `title` | string | The document's H1. |
| `type`, `audience`, `tags`, `confidence` | as declared | Copied from the document's metadata. |
| `owner` | `{ id, inherited }` | `inherited` is true when the document declares no owner and the project's fallback owner applies. |
| `content` | string | The passage text, prefixed with its title and heading path. |
| `tokens` | number | What the passage cost against the budget. |
| `score` | number | Final relevance after graph and usage signals. |
| `signals` | `{ semantic, keyword, graph, usage }` | The components of the score; `semantic` is null in keyword-only mode. |
| `reason` | `{ kind, via?, rel? }` | `match` (answered the question), `required-by` (a served passage requires it), `expanded-from` (reached along another relationship). `via` names the document it was pulled in for. |
| `freshness` | `{ state, lastVerified, cadenceDays, note? }` | `fresh`, `aging`, `stale` or `unknown`; `note` says why it is marked. |
| `outOfSync` | boolean | The document changed after the index was built. |

## Freshness policy

| Document state | `withhold-stale` (default) | `include-stale` | `fresh-only` |
|----------------|-----------------------------|-------------------|----------------|
| fresh | served | served | served |
| aging | served, marked | served, marked | withheld |
| stale | withheld | served, marked | withheld |
| stale **and required by a served passage** | served, marked | served, marked | served, marked |
| unknown (no cadence for its type) | served, marked | served, marked | served, marked |

A verification date later than today is treated as today and reported.

## Notices

| Code | When |
|------|------|
| `no-match` | Nothing in the set is about the question. |
| `restriction-excluded-all` | The restriction left no document to consider. |
| `nothing-fits` | No passage fits the budget; carries `smallestBudget`. |
| `chain-truncated` | A prerequisite chain did not fit; carries the ordered `omitted` list. |
| `withheld-stale` | Matching documents were withheld; carries `documents`. |
| `all-stale` | Every match has expired; carries `latestVerified`. |
| `missing-cadence` | No review cadence is declared for a matched document's type. |
| `future-verified` | A document declares a verification date later than today. |
| `missing-prerequisite` | A matched document requires a document that is not in the set. |
| `requirement-cycle` | Documents require each other in a circle. |
| `keyword-only` | No index; assembled by wording alone. Carries a `hint`. |
| `index-out-of-sync` | Served documents changed after the index was built. |
| `index-behind` | The index holds documents that no longer exist. |
| `index-incomplete` | The last index update did not finish. |

## Errors

The library throws `DepError` with a stable `code`; the CLI prints the message and exits 1.

| Code | Cause |
|------|-------|
| `CONFIG_MISSING` | No `.docspec` at the root. |
| `NOT_A_DIRECTORY` | The root is not a directory. |
| `INVALID_BUDGET` | Budget is not a positive number. |
| `INVALID_FRESHNESS` | Unknown freshness preference; the message lists the accepted ones. |
| `INVALID_DEPTH` | Expansion depth negative or not a whole number. |
| `UNKNOWN_AUDIENCE` / `NO_AUDIENCES` | Audience not declared / project declares none. |
| `INVALID_TYPE` | Type outside the five canonical types (and custom ones). |
| `PROVENANCE_REQUIRED` | `provenance: false` was requested. |
| `PROVIDER_MISMATCH` | The index was built with a different retrieval method. |
| `CREDENTIAL_MISSING` | The configured external provider has no credential set. |
