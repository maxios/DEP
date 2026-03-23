---
description: Audit existing documentation and retrofit DEP compliance. Analyzes unstructured docs, identifies types, detects contamination, and produces a migration plan.
---

# DEP Audit Skill

You audit existing documentation that was NOT written with DEP and produce a migration plan to bring it into compliance.

## Trigger

The user asks you to audit, assess, or migrate existing documentation to DEP standards.

## Protocol

### Step 1 — Inventory

Scan the documentation directory and catalog every document:
- File path
- Approximate word count
- Detected language/format (markdown, rst, plain text, etc.)
- Whether it has any metadata/frontmatter

### Step 2 — Type Classification

For each document, determine which DEP type it most closely matches:
- Does it teach through guided steps? → `tutorial`
- Does it enable a specific task? → `how-to`
- Does it list facts for lookup? → `reference`
- Does it explain concepts or reasoning? → `explanation`
- Does it record a decision? → `decision-record`
- Does it mix multiple types? → `contaminated` (list which types are present)

### Step 3 — Contamination Analysis

For contaminated documents, identify:
- Which sections belong to which type
- Where extraction boundaries should be
- What new documents would be created from extraction

### Step 4 — Audience Mapping

Identify implicit audiences across the documentation:
- Who are these documents written for?
- Are there vocabulary mismatches?
- Are there missing audiences (people who need docs but don't have them)?

### Step 5 — Gap Analysis

Identify what's missing:
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
- [ ] [file] → type: [type], audience: [audiences]

#### Phase 2: Extraction (split contaminated documents)
- [ ] [file] → extract lines N-M into [new-file] (type: [type])

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

## CLI Integration

Use the `dep` CLI to accelerate analysis:

```bash
cd cli && bun run src/index.ts graph --json --root <project-root>   # understand current state
cd cli && bun run src/index.ts validate --root <project-root>       # find structural issues
cd cli && bun run src/index.ts query --lifecycle STALE --root <project-root>  # find stale docs
```

After migration, use `dep index` to auto-generate navigation files.

### Navigation Commands for Audit Analysis

Use navigation commands to assess the current documentation's navigability and find structural gaps:

```bash
# Search for topics to identify undocumented areas or duplicates
cd cli && bun run src/index.ts search "<key-concept>" --root <project-root>

# Map the neighborhood of each document to assess connectivity
cd cli && bun run src/index.ts neighbors <file> --depth 2 --root <project-root>

# Evaluate learning paths per audience — sparse paths indicate gaps
cd cli && bun run src/index.ts roadmap <audience-id> --root <project-root>

# Check prerequisite depth — deep chains may need restructuring
cd cli && bun run src/index.ts prereqs <file> --root <project-root>
```

**When to use each:**

- `search` — During inventory (Step 1): search for key system concepts to find what's documented vs missing
- `neighbors` — During gap analysis (Step 5): documents with 0-1 neighbors are poorly connected and likely missing links
- `roadmap` — During audience mapping (Step 4): run for each identified audience to see if they have a viable learning path. Empty roadmaps = audience not served
- `prereqs` — During contamination analysis (Step 3): prerequisite chains that skip levels may indicate a document is trying to teach too much (contamination)

## Constraints

- Do not modify existing documents during audit — only analyze and plan
- Present the plan to the user for approval before any changes
- Preserve all existing content — migration should not delete information
- Flag documents that may be outdated but let the owner decide
