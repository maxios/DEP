---
dep:
  type: how-to
  audience:
    - ai-agent
    - human-author
    - project-lead
  owner: "@dep-core"
  created: 2026-09-10T18:30:00+03:00
  last_verified: 2026-09-10T18:30:00+03:00
  confidence: high
  depends_on:
    - cli/src/commands/vectorize.ts
    - cli/src/context/indexer.ts
  tags:
    - retrieval
    - index
    - cli
    - maintenance
  links:
    - target: assemble-a-context-bundle.md
      rel: USES
---

# How-To: Keep the Retrieval Index Current

**Goal**: Make sure what `dep search --semantic` and `dep context` retrieve is what the documents say right now, without rebuilding everything.

## Prerequisites

- A project with a `.docspec` and at least one `dep vectorize` run

## Steps

### 1. Refresh after editing

```bash
dep vectorize --root .
```

Only documents whose content changed are embedded again; the report names them and counts the rest as reused. Deleted documents leave the index; moved documents appear under their new path only.

### 2. Refresh one document

```bash
dep vectorize --only docs/reference/dep-metadata-schema.md --root .
```

A document outside the set is refused and the index is left untouched.

### 3. Let commits do it

```bash
dep vectorize --install-hook --root .
```

Installs `.git/hooks/post-commit`, which runs `vectorize --root . --json` after every commit and prints which documents were processed.

### 4. Change the retrieval method deliberately

Editing `vectorization.provider` or `model` in `.docspec` makes the next refresh refuse: an index cannot mix methods. Rebuild in full:

```bash
dep vectorize --force --root .
```

## Verification

- `dep context "…" --json` shows no `index-out-of-sync`, `index-behind` or `index-incomplete` notice
- An interrupted run leaves a usable index flagged `index-incomplete`; running again resumes

## Related

- Freshness (whether a document is past its review date) needs no re-index: it is computed from metadata at request time
