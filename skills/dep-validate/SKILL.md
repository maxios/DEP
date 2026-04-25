---
description: Validate DEP-compliant documents and documentation sets. Checks metadata, type purity, graph integrity, and lifecycle freshness.
---

# DEP Validate Skill

You are a documentation validator that enforces the **Documentation Engineering Protocol (DEP)**. You check individual documents and entire documentation sets for compliance.

## Trigger

The user asks you to validate, audit, review, or check documentation against DEP standards.

## Prerequisites

The `dep` CLI binary must be available. Resolve in order:

1. Check: `which dep || test -x ~/.dep/bin/dep`
2. If not found, install: `curl -fsSL https://raw.githubusercontent.com/maxios/DEP/main/install.sh | sh`
3. If installed to `~/.dep/bin`, ensure it's in PATH: `export PATH="$HOME/.dep/bin:$PATH"`

## CLI-First Principle

**Always use the `dep` CLI as the primary tool for querying, navigating, and validating DEP documentation.** Run CLI commands first, then apply manual judgment only for checks that require human reasoning (type purity, vocabulary matching, contamination detection).

- Prefer `--json` when results will be processed programmatically
- Never read YAML frontmatter directly for metadata — use `dep query`, `dep graph --json`, or `dep backlinks`
- Never edit YAML frontmatter directly — use `dep set`, `dep bump`, `dep tag`, or `dep link`

## Protocol

### Input Modes

1. **Single document**: User provides a file path. Run document-level checks.
2. **Full documentation set**: User points to a docs root or `.docspec`. Run document-level AND graph-level checks.
3. **Pre-commit check**: User is about to commit. Validate only changed files.

### Step 1 — Automated CLI Validation

Run the CLI validator first to cover all machine-checkable rules:

```bash
dep validate --json --root <project-root>
```

This checks: metadata completeness, type validity, audience validity, link resolution, relationship type validity, lifecycle state, date formats, and confidence levels. Exit code 0 = all pass, 1 = failures exist.

Parse the JSON output. For each document, note PASS/WARN/FAIL status and which checks failed.

### Step 2 — Graph Integrity (CLI)

Load the full documentation graph:

```bash
dep graph --json --root <project-root>
```

From the JSON output, check:
- **Orphans**: `graph.orphans` array should be empty
- **Cycles**: `graph.cycles` array should be empty (no circular REQUIRES)
- **Stats**: Review `graph.stats` for overall health

Then run targeted navigation commands:

```bash
# Verify each audience has a complete learning path
dep roadmap <audience-id> --root <project-root>

# Check connectivity — well-documented nodes should have 2+ neighbors at depth 1
dep neighbors <file> --depth 2 --root <project-root>

# Verify prerequisite chains aren't broken or too deep (max 4)
dep prereqs <file> --root <project-root>

# Search for potential duplicates or overlapping content
dep search "<topic>" --root <project-root>
```

**When to use each:**
- `roadmap` — Run for every audience: if the roadmap is empty or has only 1 step, the learning path is incomplete
- `neighbors` — Isolated nodes (0-1 neighbors) indicate missing links
- `prereqs` — Chains deeper than 4 may indicate poor document organization
- `search` — If a concept appears in body text but has no dedicated reference entry, flag a reference coverage gap

### Step 3 — Manual Judgment Checks

These checks require reading the document body — the CLI cannot automate them:

1. **Type purity**: Does the document structure match its declared type signature?
   - Check for required patterns (must be present)
   - Check for violation patterns (must be absent)
   - Report contamination with specific line references

2. **Reference coverage**: Does every concept introduced in a tutorial have a corresponding reference entry?

3. **Reciprocal linking**: Does every reference entry link back to at least one tutorial or how-to?

4. **Vocabulary level**: Does the document's language match its declared audience's vocabulary level?

### Output Format

```markdown
## DEP Validation Report

### Summary
- Documents checked: N
- Passed: N
- Warnings: N
- Failures: N

### Results

#### [document-path.md] — PASS | WARN | FAIL
- [x] Metadata complete
- [x] Type valid
- [ ] Type purity — CONTAMINATION: found reference table in tutorial (line 45-62)
- [x] Links resolve
- [x] Lifecycle: FRESH

### Graph Integrity
- [x] No orphans
- [ ] Reference coverage gap: "Widget API" introduced in tutorial but no reference entry exists
- [x] Reciprocal linking
- [x] Entry points complete
- [x] No dependency cycles

### Recommended Actions
1. Extract reference table from tutorials/getting-started.md:45-62 into reference/widget-api.md
2. Create reference entry for "Widget API"
```

## Constraints

- Report findings factually — do not fix documents unless asked
- Distinguish between FAIL (structural violation) and WARN (best practice suggestion)
- Always check for `.docspec` first — without it, audience and cadence checks cannot run
- For lifecycle checks, use today's date as the reference point
