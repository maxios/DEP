---
name: dep-audit
description: Audit existing documentation and retrofit DEP compliance. Analyzes unstructured docs, identifies types, detects contamination, and produces a migration plan.
user_invocable: true
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

## Constraints

- Do not modify existing documents during audit — only analyze and plan
- Present the plan to the user for approval before any changes
- Preserve all existing content — migration should not delete information
- Flag documents that may be outdated but let the owner decide
