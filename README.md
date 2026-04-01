# DEP — Documentation Engineering Protocol

A universal documentation standard designed for humans and AI. DEP treats documentation as a structured graph of typed, audience-aware, lifecycle-managed documents — not a pile of markdown files.

This repository is self-referential: DEP's own documentation follows the DEP specification.

## Why DEP?

Most documentation rots silently. DEP prevents this with three mechanisms:

- **Type purity** — every document performs exactly one mental operation (tutorial, how-to, reference, explanation, or decision record). No mixing.
- **Typed relationships** — documents connect through six explicit link types (`TEACHES`, `USES`, `EXPLAINS`, `DECIDES`, `REQUIRES`, `NEXT`), forming a navigable graph.
- **Lifecycle governance** — every document has an owner, a review cadence, and a computed freshness state (`FRESH` → `AGING` → `STALE`). Staleness is detected automatically.

## Quick Start

### Install the CLI

```bash
curl -fsSL https://raw.githubusercontent.com/maxios/DEP/main/install.sh | sh
export PATH="$HOME/.dep/bin:$PATH"
```

### Bootstrap DEP for your project

```bash
# Initialize a .docspec config and scaffold docs/
dep validate --root .

# Visualize your documentation graph
dep graph --root . --mermaid

# Find stale or orphaned documents
dep validate --root .
```

### Write your first document

Create a markdown file with DEP frontmatter:

```yaml
---
dep:
  type: how-to
  audience: [human-author]
  owner: "@yourteam"
  created: 2026-04-01T00:00:00Z
  last_verified: 2026-04-01T00:00:00Z
  confidence: high
  depends_on: []
  tags: [example]
  links:
    - target: docs/reference/some-doc.md
      rel: USES
---

# How to Do the Thing

Your content here.
```

## CLI Commands

All commands support `--json` for machine-readable output.

| Command | Description |
|---------|-------------|
| `dep validate --root .` | Validate documents and graph integrity |
| `dep graph --root .` | Display the documentation graph (`--dot`, `--mermaid`) |
| `dep backlinks <file> --root .` | Find what links to a document |
| `dep query --type reference --root .` | Filter documents by metadata |
| `dep index --root .` | Auto-generate index files (`--dry` for preview) |
| `dep search "term" --root .` | Full-text search with relevance scoring |
| `dep neighbors <file> --depth 2 --root .` | Transitive graph traversal |
| `dep roadmap <audience> --root .` | Learning path for an audience persona |
| `dep prereqs <file> --root .` | Prerequisite chain for a document |

## The Five Document Types

| Type | Mental Operation | Example |
|------|-----------------|---------|
| **Tutorial** | Build understanding step-by-step | "Write your first DEP document" |
| **How-To** | Complete a specific task | "Add DEP metadata to existing docs" |
| **Reference** | Look up precise details | "DEP metadata schema" |
| **Explanation** | Reshape conceptual understanding | "Why type purity matters" |
| **Decision Record** | Preserve reasoning behind choices | "Five types, not four" |

## Project Structure

```
.
├── seed.md                  # The foundational DEP specification
├── .docspec                 # Project configuration (audiences, governance, structure)
├── docs/                    # Documentation organized by type
│   ├── tutorials/           # Step-by-step learning
│   ├── how-to/              # Task-oriented guides
│   ├── reference/           # Lookup documentation
│   ├── explanation/         # Conceptual understanding
│   └── decision-records/    # Rationale behind decisions
├── cli/                     # TypeScript/Bun CLI tool
└── skills/                  # Claude Code plugin skills
```

## Key Concepts

### `.docspec`

The `.docspec` file is your project's documentation configuration. It defines:

- **Audiences** — who reads your docs (with entry points, vocabulary level, time budget)
- **Architecture** — directory layout and link style
- **Governance** — review cadences per document type, ownership strategy

### Audience Graph

DEP models readers as personas with specific goals. Each audience has a defined entry point into the documentation graph. The CLI can generate learning paths (`dep roadmap`) and prerequisite chains (`dep prereqs`) tailored to each audience.

### Lifecycle States

Documents transition through freshness states based on their `last_verified` date and the review cadence configured in `.docspec`:

```
FRESH  →  AGING  →  STALE
```

`dep validate` flags documents that need review.

## Claude Code Integration

DEP ships as a Claude Code plugin with four skills:

| Skill | Description |
|-------|-------------|
| `/dep-generate` | Generate DEP-compliant documentation for any system |
| `/dep-validate` | Validate documents against the DEP specification |
| `/dep-audit` | Audit existing docs and plan a DEP migration |
| `/dep-sync` | Sync documentation freshness with code changes |

Install via: `/plugin marketplace add <repo>` then `/plugin install dep@dep-marketplace`

## Development

The CLI is built with [Bun](https://bun.sh) and TypeScript.

```bash
cd cli && bun install

# Run from source
bun run src/index.ts validate --root ..

# Run tests
bun test

# Build standalone binary (current platform)
bun run build:local

# Build for all platforms (macOS + Linux, arm64 + x64)
bun run build
```

Releases are automated via GitHub Actions — push a version tag (`v*`) to trigger cross-platform builds and a GitHub Release.

## Documentation

- **Start here**: [seed.md](seed.md) — the foundational specification
- **Browse by audience or type**: [docs/index.md](docs/index.md)
- **Tutorials**: [Write your first DEP document](docs/tutorials/write-your-first-dep-document.md) | [Bootstrap DEP for your project](docs/tutorials/bootstrap-dep-for-your-project.md) | [Integrate DEP into an agent](docs/tutorials/integrate-dep-into-agent.md)

## License

See repository for license details.
