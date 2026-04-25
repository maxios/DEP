---
description: Audit existing documentation and retrofit DEP compliance. Analyzes unstructured docs, identifies types, detects contamination, and produces a migration plan.
---

# DEP Audit Skill

You audit existing documentation that was NOT written with DEP and produce a migration plan to bring it into compliance.

## Trigger

The user asks you to audit, assess, or migrate existing documentation to DEP standards.

## Prerequisites

The `dep` CLI binary must be available. Resolve in order:

1. Check: `which dep || test -x ~/.dep/bin/dep`
2. If not found, install: `curl -fsSL https://raw.githubusercontent.com/maxios/DEP/main/install.sh | sh`
3. If installed to `~/.dep/bin`, ensure it's in PATH: `export PATH="$HOME/.dep/bin:$PATH"`

## CLI-First Principle

**Always use the `dep` CLI as the primary tool for querying, navigating, and analyzing DEP documentation.** Run CLI commands first to understand the existing state, then apply manual judgment for checks that require human reasoning (type classification, contamination analysis, vocabulary assessment).

- Prefer `--json` when results will be processed programmatically
- Never read YAML frontmatter directly for metadata — use `dep query`, `dep graph --json`, or `dep backlinks`
- Never edit YAML frontmatter directly — use `dep set`, `dep bump`, `dep tag`, or `dep link`

## Protocol

### Step 1 — Inventory

Start by checking if any existing docs already have DEP metadata:

```bash
# If any docs have DEP metadata, load the current graph state
dep graph --json --root <project-root>

# Run validation to find structural issues in existing DEP docs
dep validate --json --root <project-root>

# Check for stale documents
dep query --lifecycle STALE --root <project-root>
```

Parse the CLI output to catalog existing DEP-compliant documents — their types, audiences, lifecycle states, and any validation failures.

For documents without DEP metadata, scan the directory manually and catalog:

- File path
- Approximate word count
- Detected language/format (markdown, rst, plain text, etc.)
- Whether it has any metadata/frontmatter

### Step 2 — Type Classification

This step requires manual analysis — the CLI cannot classify document types from content.

For each document, determine which DEP type it most closely matches:

- Does it teach through guided steps? -> `tutorial`
- Does it enable a specific task? -> `how-to`
- Does it list facts for lookup? -> `reference`
- Does it explain concepts or reasoning? -> `explanation`
- Does it record a decision? -> `decision-record`
- Does it mix multiple types? -> `contaminated` (list which types are present)

### Step 3 — Contamination Analysis

For contaminated documents, identify:

- Which sections belong to which type
- Where extraction boundaries should be
- What new documents would be created from extraction

Use CLI to supplement manual analysis for documents already in the graph:

```bash
# Prerequisite chains that skip levels may indicate a document is trying to teach too much
dep prereqs <file> --root <project-root>
```

### Step 4 — Audience Mapping

For documents already in the graph, check how well each audience is served:

```bash
# Run for each identified audience — empty or sparse roadmaps = audience not served
dep roadmap <audience-id> --root <project-root>
```

Then supplement with manual analysis:

- Who are these documents written for?
- Are there vocabulary mismatches?
- Are there missing audiences (people who need docs but don't have them)?

### Step 5 — Gap Analysis

Start with CLI to find structural gaps:

```bash
# Search for key system concepts to find what's documented vs missing
dep search "<key-concept>" --root <project-root>

# Documents with 0-1 neighbors are poorly connected and likely missing links
dep neighbors <file> --depth 2 --root <project-root>

# Check prerequisite depth — deep chains may need restructuring
dep prereqs <file> --root <project-root>
```

Then identify what's missing manually:

- Concepts introduced but never given reference entries
- Tasks mentioned but no how-to exists
- Decisions implied but not recorded
- Audiences identified but no entry point exists

### Step 6 — Migration Plan

Produce a structured plan:

```markdown
## DEP Migration Plan

### Current State
- Total documents: N
- Pure (single type): N
- Contaminated (multiple types): N
- Unclassifiable: N

### Audiences Identified
1. [audience-id]: [description]

### Actions Required

#### Phase 1: Metadata (add DEP headers to existing docs)
- [ ] [file] -> type: [type], audience: [audiences]

#### Phase 2: Extraction (split contaminated documents)
- [ ] [file] -> extract lines N-M into [new-file] (type: [type])

#### Phase 3: Gap Fill (create missing documents)
- [ ] Create [type]: [title] for audience [audience]

#### Phase 4: Graph Construction (link everything)
- [ ] Create index.md
- [ ] Create audience entry points
- [ ] Add cross-references

#### Phase 5: Governance Setup
- [ ] Create .docspec
- [ ] Assign owners
- [ ] Set review cadences
```

After the user executes the migration plan, verify compliance:

```bash
dep validate --root <project-root>
dep index --root <project-root>
```

## Constraints

- Do not modify existing documents during audit — only analyze and plan
- Present the plan to the user for approval before any changes
- Preserve all existing content — migration should not delete information
- Flag documents that may be outdated but let the owner decide
