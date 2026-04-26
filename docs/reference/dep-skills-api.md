---
dep:
  type: reference
  audience:
    - ai-agent
  owner: "@dep-core"
  created: 2026-03-22T23:36:54+02:00
  last_verified: 2026-04-26T20:29:05.791+03:00
  confidence: high
  depends_on:
    - skills/dep-generate/SKILL.md
    - skills/dep-validate/SKILL.md
    - skills/dep-audit/SKILL.md
    - skills/dep-sync/SKILL.md
  tags:
    - skills
    - api
    - agent
    - integration
  links: []
---

# DEP Skills API Reference

DEP provides four skills that AI agents can invoke to generate, validate, audit, and sync documentation. DEP is packaged as a Claude Code plugin with a marketplace for distribution.

All skills share common behaviors:

- **Self-bootstrapping**: Each skill auto-installs the `dep` CLI binary if not found in PATH (Step 0)
- **CLI-first**: Skills use the `dep` CLI for all documentation queries and metadata writes — never editing YAML frontmatter directly
- **DAP delegation**: Decision logic is handled by DAP (Decision Action Protocol) trees via `dep dap` subcommands, enabling structured, node-by-node decision traversal

---

## `/dep-generate`

| Property | Value |
|----------|-------|
| File | `skills/dep-generate/SKILL.md` |
| Trigger | User asks to generate documentation for a system or domain |
| Input | System description, optional `.docspec` |
| Output | Complete DEP-compliant documentation set |

### Workflow

1. Load or create `.docspec`
2. Plan the document set (present to user for approval)
3. Generate documents in dependency order
4. Run validation on the full set

### When to Use

- Greenfield documentation for a new project
- Generating docs from a codebase, API spec, or system description
- Expanding an existing DEP documentation set with new documents

---

## `/dep-validate`

| Property | Value |
|----------|-------|
| File | `skills/dep-validate/SKILL.md` |
| Trigger | User asks to validate, audit, review, or check documentation |
| Input | File path (single doc) or docs root / `.docspec` (full set) |
| Output | Validation report with pass/warn/fail per check |

### Check Categories

| Category | Scope | Checks |
|----------|-------|--------|
| Metadata | Per document | All required fields present and valid |
| Type purity | Per document | Required patterns present, violation patterns absent |
| Link integrity | Per document | All internal links resolve |
| Lifecycle | Per document | Freshness state based on `last_verified` and cadence |
| Orphan detection | Graph | Every doc reachable from an entry point |
| Reference coverage | Graph | Tutorials link to reference entries |
| Reciprocal linking | Graph | References link back to tutorials/how-tos |
| Cycle detection | Graph | No circular REQUIRES chains |

### When to Use

- Before committing new documentation
- During periodic documentation reviews
- After modifying documents that others depend on

---

## `/dep-audit`

| Property | Value |
|----------|-------|
| File | `skills/dep-audit/SKILL.md` |
| Trigger | User asks to audit or migrate existing (non-DEP) documentation |
| Input | Path to existing documentation directory |
| Output | Migration plan with phases |

### Migration Phases

| Phase | Action |
|-------|--------|
| 1. Metadata | Add DEP headers to existing docs |
| 2. Extraction | Split contaminated documents by type |
| 3. Gap Fill | Create missing documents |
| 4. Graph Construction | Build index, entry points, cross-references |
| 5. Governance | Create `.docspec`, assign owners, set cadences |

### When to Use

- Adopting DEP for a project with existing documentation
- Evaluating documentation quality before a rewrite
- Planning a documentation improvement initiative

---

## `/dep-sync`

| Property | Value |
|----------|-------|
| File | `skills/dep-sync/SKILL.md` |
| Trigger | User asks to sync documentation freshness with code changes |
| Input | Project root with `.docspec`, optional date range or commit range |
| Output | Sync report identifying stale docs with proposed updates |

### Workflow

1. Load `.docspec` and determine docs root
2. Analyze git history to find file changes since each doc's `last_verified` date
3. Cross-reference changes against `depends_on` declarations and doc content
4. Generate a sync report: which docs are stale, why, and what to update
5. Apply approved updates and bump `last_verified` dates
6. Run validation on updated docs

### When to Use

- After a burst of code changes that may have outdated documentation
- As a periodic sync check (e.g., weekly or before releases)
- When onboarding to a project and wanting to verify doc freshness against recent activity

---

## CLI Integration

All skills leverage the `dep` CLI tool for automated checks. The CLI is available as a standalone binary (no runtime dependencies) or can be run from source.

### Install the Standalone Binary

```bash
curl -fsSL https://raw.githubusercontent.com/maxios/DEP/main/install.sh | sh
export PATH="$HOME/.dep/bin:$PATH"
```

### Available Commands

| Command | Purpose | Output Formats |
|---------|---------|----------------|
| `graph` | Visualize the documentation graph | `--json`, `--dot`, `--mermaid` |
| `backlinks <file>` | Find what links to a document | `--json` |
| `validate` | Check metadata, links, lifecycle, orphans, cycles | `--json` |
| `query` | Filter documents by metadata fields | `--json` |
| `index` | Auto-generate index files from metadata | `--dry` for preview |
| `search <query>` | Full-text search across documents | `--json` |
| `neighbors <file>` | Transitive graph traversal | `--depth`, `--direction`, `--json` |
| `roadmap <audience>` | Audience-specific learning path | `--json` |
| `prereqs <file>` | Prerequisite reading chain | `--json` |
| `set <file>` | Set metadata fields (confidence, owner, etc.) | — |
| `bump <file>` | Bump `last_verified` to now | `--all`, `--lifecycle` filter |
| `tag <file>` | Add or remove tags | `--add`, `--remove` |
| `link <file>` | Add or remove links | `--target`, `--rel` |
| `vectorize` | Build semantic search index from documents | — |
| `dap resolve` | Find matching DAP decision tree for a query | `--json` |
| `dap node` | Load a single DAP tree node | `--json` |
| `dap trace` | Visualize a DAP decision tree | — |
| `dap validate` | Validate DAP tree integrity | `--json` |
| `dap graph` | Show delegation graph between DAP trees | `--json` |

### Running

```bash
# Standalone binary
dep <command> --root <project-root>

# From source
cd cli && bun run src/index.ts <command> --root <project-root>
```

---

## Plugin Installation

DEP is packaged as a Claude Code plugin. Install via the marketplace:

```bash
# Add the DEP marketplace (from GitHub)
/plugin marketplace add owner/dep

# Install the DEP plugin
/plugin install dep@dep-marketplace
```

For local development, add the marketplace from a local path:

```bash
/plugin marketplace add ./path/to/dep
/plugin install dep@dep-marketplace
```
