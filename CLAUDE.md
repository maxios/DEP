# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

DEP (Documentation Engineering Protocol) is a universal documentation standard for humans and AI. The project is self-referential: DEP's own documentation follows the DEP specification. The foundational spec lives in `seed.md`.

## CLI Commands

The CLI is a Bun + TypeScript tool in `cli/`. All commands are run from the `cli/` directory:

```bash
# Install dependencies
cd cli && bun install

# Core commands (all support --json for machine-readable output)
bun run src/index.ts graph --root ..              # documentation graph (also: --dot, --mermaid)
bun run src/index.ts backlinks <file> --root ..   # what links to a document
bun run src/index.ts validate --root ..           # validate documents + graph integrity
bun run src/index.ts query --type reference --root ..  # filter by metadata
bun run src/index.ts index --root ..              # auto-generate index files (--dry for preview)

# Navigation commands
bun run src/index.ts search "lifecycle" --root ..                    # full-text search with scoring
bun run src/index.ts neighbors seed.md --depth 2 --root ..          # transitive graph traversal
bun run src/index.ts roadmap ai-agent --root ..                     # audience learning path
bun run src/index.ts prereqs docs/tutorials/write-your-first-dep-document.md --root ..  # prerequisite chain

# Run tests
bun test
```

No build step — Bun runs TypeScript directly.

## CLI Architecture

The CLI parses markdown files with YAML frontmatter, builds a directed graph of documents, and runs operations on it.

- `cli/src/index.ts` — Entry point, manual arg parsing (no CLI framework), dispatches to commands
- `cli/src/parser.ts` — Parses markdown files using `gray-matter`, extracts both frontmatter `links` and inline markdown links as graph edges
- `cli/src/graph.ts` — Core graph builder: walks `docs_root` from `.docspec`, computes lifecycle state (FRESH/AGING/STALE) from review cadences, detects orphans via BFS from audience entry points, detects cycles in REQUIRES edges
- `cli/src/config.ts` — Loads `.docspec` YAML config from project root
- `cli/src/types.ts` — All TypeScript interfaces (`DepMetadata`, `DepGraph`, `DepNode`, `DocspecConfig`, etc.)
- `cli/src/output.ts` — Output formatting
- `cli/src/commands/` — One file per command (graph, backlinks, validate, query, index-gen, search, neighbors, roadmap, prereqs)

Key data flow: `.docspec` defines project config → `parser.ts` reads each `.md` file's `dep:` frontmatter block → `graph.ts` assembles nodes/edges/orphans/cycles → commands query or display the graph.

## Document Metadata Format

All DEP documents use YAML frontmatter with metadata nested under a `dep:` key:

```yaml
---
dep:
  type: reference          # tutorial | how-to | reference | explanation | decision-record
  audience: [ai-generator] # IDs from .docspec audiences
  owner: "@dep-core"
  created: 2026-03-22T23:36:54+02:00
  last_verified: 2026-03-23T21:49:13+02:00
  confidence: high         # high | medium | low | stale
  depends_on: []
  tags: [metadata, schema]
  links:
    - target: docs/reference/other.md
      rel: TEACHES          # TEACHES | USES | EXPLAINS | DECIDES | REQUIRES | NEXT
---
```

Documents without a `dep:` block in frontmatter are skipped by the parser.

## Key Conventions

- **Type purity**: Each document performs exactly one mental operation (tutorial/how-to/reference/explanation/decision-record). Never mix types — extract contamination into a separate document with a link.
- **Atomicity**: Prefer more files over more lines. Split when sections could have different owners, confidence, or review cadences (Lifecycle Independence Test).
- **Link types**: `TEACHES`, `USES`, `EXPLAINS`, `DECIDES`, `REQUIRES`, `NEXT` are the six canonical relationships. `INLINE` is auto-detected from markdown links by the parser.
- **Audience IDs** must reference personas defined in `.docspec` (`ai-generator`, `ai-agent`, `human-author`, `project-lead`).
- **Lifecycle states** (FRESH → AGING → STALE) are computed from `last_verified` vs `review_cadence` in `.docspec` governance config.

## Plugin & Skills

DEP is packaged as a Claude Code plugin (`.claude-plugin/`). Four skills in `skills/`:
- `/dep-generate` — Generate DEP-compliant documentation for any system
- `/dep-validate` — Validate documents against DEP
- `/dep-audit` — Audit existing docs and plan DEP migration
- `/dep-sync` — Sync documentation freshness with code changes

Install via marketplace: `/plugin marketplace add <repo>` then `/plugin install dep@dep-marketplace`
