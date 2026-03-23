---
dep:
  type: tutorial
  audience: [ai-agent]
  owner: "@dep-core"
  created: 2026-03-23T14:00:00+02:00
  last_verified: 2026-03-24T00:00:00+02:00
  confidence: high
  depends_on: [skills/dep-generate/SKILL.md, skills/dep-validate/SKILL.md, skills/dep-audit/SKILL.md, skills/dep-sync/SKILL.md]
  tags: [agent, integration, tutorial, skills]
  links:
    - target: ../reference/dep-skills-api.md
      rel: TEACHES
    - target: ../how-to/validate-a-document.md
      rel: NEXT
    - target: ../how-to/generate-a-document-set.md
      rel: NEXT
---

# Tutorial: Integrate DEP into Your Agent

## Prerequisites

- A Claude Code session (or compatible agent framework)
- A project repository where you want to manage documentation
- The DEP plugin installed via `/plugin install dep@dep-marketplace`

## What You'll Build

A working agent integration that can generate, validate, and maintain DEP-compliant documentation using the four DEP skills. By the end, you'll have used each skill at least once and understand when to invoke them.

## Steps

### Step 1 — Install the DEP Plugin

Add the DEP marketplace and install the plugin:

```bash
/plugin marketplace add owner/dep
/plugin install dep@dep-marketplace
```

This installs four skills: `/dep-generate`, `/dep-validate`, `/dep-audit`, and `/dep-sync`.

**Expected result**: All four skills are available as slash commands in your Claude Code session.

### Step 2 — Audit Existing Documentation

If your project already has documentation, start with an audit:

```
/dep-audit
```

The audit skill will:
1. Scan existing Markdown files
2. Classify them by probable type
3. Identify contaminated documents (mixed types)
4. Produce a migration plan with phases

Review the migration plan. You don't need to execute it all at once — it's a roadmap.

**Expected result**: A migration report showing what exists, what's contaminated, and what's missing.

### Step 3 — Generate a Documentation Set

For a new project (or to fill gaps identified by the audit):

```
/dep-generate
```

Provide a description of your system when prompted. The skill will:
1. Propose a `.docspec` file (or use an existing one)
2. Present a document plan for your approval
3. Generate documents in dependency order
4. Run validation on the generated set

**Expected result**: A set of DEP-compliant documents in your `docs/` directory with a valid `.docspec`.

### Step 4 — Validate the Documentation

After generation (or after any manual edits):

```
/dep-validate
```

The validator checks:
- Metadata completeness and validity
- Type purity (required patterns present, violation patterns absent)
- Link integrity (all targets resolve)
- Graph integrity (no orphans, no cycles, all entry points exist)
- Lifecycle freshness (FRESH / AGING / STALE states)

Fix any issues flagged in the report.

**Expected result**: A clean validation report with all documents passing.

### Step 5 — Sync Documentation with Code Changes

After code changes that may have outdated documentation:

```
/dep-sync
```

The sync skill:
1. Analyzes git history since each document's `last_verified` date
2. Cross-references changes against `depends_on` declarations
3. Identifies stale documents and proposes updates
4. Bumps `last_verified` dates after approved updates

**Expected result**: A sync report showing which documents need attention, with updates applied.

### Step 6 — Install and Use the CLI

All skills use the DEP CLI under the hood. Install the standalone binary for direct access:

```bash
curl -fsSL https://raw.githubusercontent.com/maxios/DEP/main/install.sh | sh
export PATH="$HOME/.dep/bin:$PATH"
```

Then run commands directly:

```bash
# Validate
dep validate --root . --json

# View graph
dep graph --root . --mermaid

# Find backlinks
dep backlinks docs/reference/some-doc.md --root .

# Query by metadata
dep query --type how-to --root .

# Search across documents
dep search "lifecycle" --root .

# Explore document neighborhoods
dep neighbors seed.md --depth 2 --root .

# View audience learning path
dep roadmap ai-agent --root .

# Check prerequisite chains
dep prereqs docs/tutorials/write-your-first-dep-document.md --root .
```

**Expected result**: CLI commands run successfully and return structured output.

## What You Built

You integrated DEP into your agent workflow with four skills:
- `/dep-audit` — assess existing documentation
- `/dep-generate` — create new documentation sets
- `/dep-validate` — check documentation quality
- `/dep-sync` — keep documentation fresh as code changes

These skills form a complete documentation lifecycle: audit → generate → validate → sync.

## Next Steps

- [DEP Skills API Reference](../reference/dep-skills-api.md) — detailed interface for each skill
- [How-To: Validate a Document](../how-to/validate-a-document.md) — targeted validation workflows
- [How-To: Generate a Document Set](../how-to/generate-a-document-set.md) — advanced generation options
