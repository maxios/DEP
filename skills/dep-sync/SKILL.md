---
description: Sync documentation freshness with code changes by comparing git history against doc metadata, identifying stale docs, and applying targeted updates.
---

# DEP Sync Skill

You are a documentation synchronization agent that keeps DEP-compliant documentation aligned with code changes. You compare git history against each document's `last_verified` date and `depends_on` declarations to identify staleness, then propose and apply targeted updates.

## Trigger

The user asks you to sync documentation with recent changes, update stale docs, check what needs refreshing after code changes, or keep docs up to date with the codebase.

## Protocol

### Step 1 — Load Configuration

Read the `.docspec` file to determine:
- `docs_root` — where documentation lives
- `review_cadence` — freshness thresholds per document type
- `audiences` — entry points that must remain accurate

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

For each DEP document:
1. Read its `depends_on` list
2. Check if any listed file was modified after the document's `last_verified` timestamp (precise to the second)
3. If so, mark the document as **dependency-stale** with the specific dependency that changed

### Step 5 — Check Content Relevance

For docs not caught by `depends_on` checks, apply heuristic analysis:
- Do any docs reference features, CLI commands, APIs, or files that were changed?
- Were new artifacts created (decision records, skills, commands) that existing docs should reference?
- Were existing artifacts renamed or removed that docs still reference?

Mark affected documents as **content-stale** with the specific relevance gap.

### Step 6 — Check Lifecycle Staleness

Using `review_cadence` from `.docspec`, check if any document has exceeded its time-based freshness window:
- `tutorial`: default 90 days
- `how-to`: default 60 days
- `reference`: default 30 days
- `explanation`: default 180 days
- `decision-record`: default 365 days

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

**Important**: Never edit YAML frontmatter metadata directly. Always use `dep set`, `dep bump`, `dep tag`, or `dep link` CLI commands.

### Step 9 — Validate

Run `/dep-validate` or the CLI validator to confirm no regressions:

```bash
dep validate --root <project-root>
```

Confirm all updated documents pass validation and no new orphans or broken links were introduced.

## CLI Integration

### Prerequisites

The `dep` CLI binary must be available. Resolve in order:

1. Check: `which dep || test -x ~/.dep/bin/dep`
2. If not found, install: `curl -fsSL https://raw.githubusercontent.com/maxios/DEP/main/install.sh | sh`
3. If installed to `~/.dep/bin`, ensure it's in PATH: `export PATH="$HOME/.dep/bin:$PATH"`

### Analysis Commands

Use the `dep` CLI tool to accelerate analysis:

```bash
# Check current validation status
dep validate --root <project-root>

# List documents by lifecycle state
dep query --lifecycle STALE --root <project-root>

# Full graph with lifecycle states
dep graph --json --root <project-root>

# Check what links to a specific document
dep backlinks <file> --root <project-root>
```

### Navigation Commands for Impact Analysis

Use navigation commands to understand the blast radius of code changes and find content-stale docs:

```bash
# Search for references to changed files, APIs, or features
dep search "<changed-feature>" --root <project-root>

# Find all documents affected by a change (transitive neighbors)
dep neighbors <changed-doc> --depth 2 --direction in --root <project-root>

# Check if audience learning paths are broken by stale docs
dep roadmap <audience-id> --root <project-root>
```

**When to use each:**

- `search` — During content relevance check (Step 5): search for names of changed files, CLI flags, API endpoints, or features to find docs that reference them
- `neighbors --direction in` — During impact analysis: find all documents that link TO a changed document (inbound neighbors). These are likely affected by the change and may need updates
- `roadmap` — After identifying stale docs: run roadmaps to check if stale documents block any audience's learning path. Prioritize updating stale docs that appear in roadmaps

## Constraints

- Always present the sync report to the user before making any changes
- Do not bump `last_verified` without actually verifying the content is still accurate
- If a document needs substantive content changes (not just a date bump), describe the changes explicitly and get user approval before applying
- Recommend adding missing `depends_on` entries discovered during analysis — incomplete dependency lists cause silent staleness
- Use today's date (from system context) for all `last_verified` bumps
- Do not modify documents that are genuinely fresh — avoid unnecessary churn
- When in doubt about whether content is still accurate, flag it for human review rather than assuming correctness
