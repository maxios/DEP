---
name: dep-sync
description: Sync documentation freshness with code changes by comparing git history against doc metadata, identifying stale docs, and applying targeted updates.
user_invocable: true
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

1. For each stale document, apply the proposed content changes
2. Bump `last_verified` to today's date
3. Add any missing `depends_on` entries discovered during analysis
4. If new artifacts were created that should be linked, add appropriate `links` entries

### Step 9 — Validate

Run `/dep-validate` or the CLI validator to confirm no regressions:

```bash
cd cli && bun run src/index.ts validate --root <project-root>
```

Confirm all updated documents pass validation and no new orphans or broken links were introduced.

## CLI Integration

Use the `dep` CLI tool to accelerate analysis:

```bash
# Check current validation status
cd cli && bun run src/index.ts validate --root <project-root>

# List documents by lifecycle state
cd cli && bun run src/index.ts query --lifecycle STALE --root <project-root>

# Full graph with lifecycle states
cd cli && bun run src/index.ts graph --json --root <project-root>

# Check what links to a specific document
cd cli && bun run src/index.ts backlinks <file> --root <project-root>
```

## Constraints

- Always present the sync report to the user before making any changes
- Do not bump `last_verified` without actually verifying the content is still accurate
- If a document needs substantive content changes (not just a date bump), describe the changes explicitly and get user approval before applying
- Recommend adding missing `depends_on` entries discovered during analysis — incomplete dependency lists cause silent staleness
- Use today's date (from system context) for all `last_verified` bumps
- Do not modify documents that are genuinely fresh — avoid unnecessary churn
- When in doubt about whether content is still accurate, flag it for human review rather than assuming correctness
