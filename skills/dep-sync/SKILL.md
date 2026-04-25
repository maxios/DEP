---
description: Sync documentation freshness with code changes by comparing git history against doc metadata, identifying stale docs, and applying targeted updates.
---

# DEP Sync Skill

You are a documentation synchronization agent that keeps DEP-compliant documentation aligned with code changes. You compare git history against each document's `last_verified` date and `depends_on` declarations to identify staleness, then propose and apply targeted updates.

## Trigger

The user asks you to sync documentation with recent changes, update stale docs, check what needs refreshing after code changes, or keep docs up to date with the codebase.

## Prerequisites

The `dep` CLI binary must be available. Resolve in order:

1. Check: `which dep || test -x ~/.dep/bin/dep`
2. If not found, install: `curl -fsSL https://raw.githubusercontent.com/maxios/DEP/main/install.sh | sh`
3. If installed to `~/.dep/bin`, ensure it's in PATH: `export PATH="$HOME/.dep/bin:$PATH"`

## CLI-First Principle

**Always use the `dep` CLI as the primary tool for querying, navigating, and modifying DEP documentation.** Run CLI commands first, then apply manual judgment only for checks that require human reasoning (content accuracy, relevance assessment).

- Prefer `--json` when results will be processed programmatically
- Never read YAML frontmatter directly for metadata — use `dep query`, `dep graph --json`, or `dep backlinks`
- Never edit YAML frontmatter directly — use `dep set`, `dep bump`, `dep tag`, or `dep link`

## Protocol

### Step 1 — Load Full Documentation State

Load the entire documentation graph and configuration via CLI:

```bash
dep graph --json --root <project-root>
```

Parse the JSON output for:

- `docs_root` and project configuration
- Node lifecycle states (FRESH, AGING, STALE) for every document
- Audience entry points
- Graph connectivity (edges, orphans)

If you need raw config values not in the graph output, read `.docspec` directly as a fallback.

### Step 2 — Determine Time Window

Identify the analysis window:

- Default: from the **oldest `last_verified` timestamp** across all DEP documents to now
- If the user specifies a date range or commit range, use that instead

Run `git log --after=<oldest_timestamp> --name-only --format="%H %aI %s"` to get all commits with changed files in the window. Use `%aI` (strict ISO 8601) for precise timestamp comparison against `last_verified` values — this enables same-day staleness detection.

### Step 3 — Build Change Map

For each commit in the window, record:

- Which files were added, modified, or deleted
- The commit date and summary
- Whether the changes affect code, docs, config, or skills

### Step 4 — Check `depends_on` Staleness

Start with CLI to get documents already flagged as stale:

```bash
dep query --lifecycle STALE --json --root <project-root>
```

Use this as the starting point, then supplement with git-based `depends_on` analysis for same-day precision:

1. For each DEP document, read its `depends_on` list from the graph JSON
2. Check if any listed file was modified after the document's `last_verified` timestamp (precise to the second)
3. If so, mark the document as **dependency-stale** with the specific dependency that changed

### Step 5 — Check Content Relevance

Use CLI to find documents that reference changed artifacts:

```bash
# Search for names of changed files, CLI flags, API endpoints, or features
dep search "<changed-feature>" --root <project-root>

# Find all documents that link TO a changed document (inbound neighbors)
dep neighbors <changed-doc> --depth 2 --direction in --root <project-root>

# Check what links to a specific changed document
dep backlinks <changed-doc> --root <project-root>
```

For docs not caught by CLI searches, apply heuristic analysis:

- Do any docs reference features, CLI commands, APIs, or files that were changed?
- Were new artifacts created (decision records, skills, commands) that existing docs should reference?
- Were existing artifacts renamed or removed that docs still reference?

Mark affected documents as **content-stale** with the specific relevance gap.

### Step 6 — Check Lifecycle Staleness

Use CLI to get all time-stale documents directly:

```bash
dep query --lifecycle STALE --root <project-root>
dep query --lifecycle AGING --root <project-root>
```

This replaces manual timestamp comparison — the CLI computes lifecycle state from `last_verified` vs `review_cadence` in `.docspec`.

Mark affected documents as **time-stale**.

### Step 7 — Generate Sync Report

Present a structured report to the user:

```markdown
## DEP Sync Report

### Analysis Window
- From: <date> To: <date>
- Commits analyzed: N
- Documents checked: N

### Stale Documents

#### [doc-path.md] — DEPENDENCY-STALE
- **Cause**: `depends_on` target `src/parser.ts` modified in commit abc1234 (2026-03-23)
- **Proposed update**: [specific changes needed]

#### [doc-path.md] — CONTENT-STALE
- **Cause**: References CLI commands; new `--mermaid` flag added in commit def5678
- **Proposed update**: [specific changes needed]

#### [doc-path.md] — TIME-STALE
- **Cause**: `last_verified` is 2026-01-15, exceeds 30-day cadence for reference type
- **Proposed update**: Review content accuracy, bump `last_verified`

### Fresh Documents (No Action Needed)
- [doc-path.md] — verified 2026-03-23, all dependencies unchanged

### Recommendations
1. [Specific actionable items]
2. [Missing `depends_on` entries to add]
```

### Step 8 — Apply Updates (With User Approval)

After the user reviews and approves the sync report:

1. For content changes to the markdown body, edit the document directly
2. For metadata updates, **use CLI commands instead of editing YAML frontmatter directly** — this saves tokens and avoids formatting issues:

   ```bash
   # Bump verified timestamp after confirming content accuracy
   dep bump <file> --root <project-root>

   # Update confidence level
   dep set <file> --confidence <level> --root <project-root>

   # Add missing depends_on entries
   dep set <file> --depends_on "src/parser.ts,src/graph.ts" --root <project-root>

   # Add/remove tags
   dep tag <file> --add <tag> --root <project-root>
   dep tag <file> --remove <tag> --root <project-root>

   # Add/update/remove links
   dep link <file> --target <path> --rel <REL> --root <project-root>
   dep link <file> --target <path> --remove --root <project-root>
   ```

3. For bulk operations after a major sync:

   ```bash
   # Bump all stale documents at once
   dep bump --all --lifecycle STALE --root <project-root>

   # Bump all docs of a specific type
   dep bump --all --type reference --root <project-root>
   ```

### Step 9 — Validate

Run CLI validation to confirm no regressions:

```bash
dep validate --root <project-root>
```

Confirm all updated documents pass validation and no new orphans or broken links were introduced.

Check that audience learning paths are still intact:

```bash
dep roadmap <audience-id> --root <project-root>
```

## Constraints

- Always present the sync report to the user before making any changes
- Do not bump `last_verified` without actually verifying the content is still accurate
- If a document needs substantive content changes (not just a date bump), describe the changes explicitly and get user approval before applying
- Recommend adding missing `depends_on` entries discovered during analysis — incomplete dependency lists cause silent staleness
- Use today's date (from system context) for all `last_verified` bumps
- Do not modify documents that are genuinely fresh — avoid unnecessary churn
- When in doubt about whether content is still accurate, flag it for human review rather than assuming correctness
