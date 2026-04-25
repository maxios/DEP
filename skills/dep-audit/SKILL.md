---
description: Audit existing documentation and retrofit DEP compliance. Analyzes unstructured docs, identifies types, detects contamination, and produces a migration plan.
---

# DEP Audit Skill

You audit existing documentation that was NOT written with DEP and produce a migration plan to bring it into compliance.

## Trigger

The user asks you to audit, assess, or migrate existing documentation to DEP standards.

## Prerequisites

Both the `dep` and `dap` CLI binaries must be available. Resolve in order:

1. Check: `which dep || test -x ~/.dep/bin/dep`
2. Check: `which dap || test -x ~/.dap/bin/dap`
3. If not found, install: `curl -fsSL https://raw.githubusercontent.com/maxios/DEP/main/install.sh | sh`
4. Ensure PATH: `export PATH="$HOME/.dep/bin:$HOME/.dap/bin:$PATH"`

## CLI-First Principle

**Always use the `dep` CLI for documentation queries and the `dap` CLI for decision navigation.** These are your primary tools — never read YAML frontmatter directly or hardcode decision logic.

- Use `dep` for querying, navigating, and analyzing documentation (`dep graph`, `dep validate`, `dep query`, `dep search`, `dep neighbors`, `dep roadmap`, `dep prereqs`, etc.)
- Use `dap` for navigating decisions (`dap resolve`, `dap node`) — load one node at a time, evaluate conditions, follow branches
- Prefer `--json` when processing results programmatically
- Never edit YAML frontmatter directly — use `dep set`, `dep bump`, `dep tag`, or `dep link`

## Protocol

### Step 1 — Resolve the DAP Decision Tree

Find the appropriate decision tree for auditing:

```bash
dap resolve "audit documentation" --json --root <dap-root>
```

This returns the `audit-existing-docs` tree (ID: `audit-existing-docs`, entry node: `inventory-docs`).

### Step 2 ��� Load the Entry Node

```bash
dap node audit-existing-docs inventory-docs --json --root <dap-root>
```

This returns the first node — an **observe** node that instructs you to inventory existing documentation. Execute the action.

### Step 3 �� Follow the Decision Tree

After executing each node's action, load the next node:

```bash
dap node audit-existing-docs <next-node-id> --json --root <dap-root>
```

At each node:

- **observe `[?]`** — Gather information. For inventory steps, use DEP CLI first:
  ```bash
  dep graph --json --root <project-root>
  dep validate --json --root <project-root>
  dep query --lifecycle STALE --root <project-root>
  ```
  For documents without DEP metadata, scan the directory manually.

- **decide `[>]`** — Evaluate conditions against collected outputs. Follow the matching branch (e.g., scope decision, contamination severity).

- **act `[!]`** — Execute the terminal action. For audit, this produces reports or migration plans.

- **delegate `[@]`** — Transfer control to another DAP tree (e.g., `validate-and-fix` after migration).

### Step 4 — Handle Gates

The audit tree includes gates for:

- **Scope selection** — Audit all docs or a subset
- **Migration approach** — Phase-by-phase or all-at-once
- **Plan approval** — Present the migration plan for user sign-off

When the tree presents a gate node, present the prompt and options to the user. Wait for their decision before continuing.

### Step 5 — Apply Manual Judgment Where Needed

Some audit steps require manual analysis that the DAP tree routes you through but cannot automate:

1. **Type classification** — Read document content to determine which DEP type it matches (tutorial, how-to, reference, explanation, decision-record, or contaminated)
2. **Contamination analysis** — Identify which sections belong to which type and where extraction boundaries should be
3. **Vocabulary assessment** — Check if documents match their intended audience level

Use `dep` CLI to supplement manual analysis:

```bash
# Prerequisite chains that skip levels may indicate contamination
dep prereqs <file> --root <project-root>

# Check audience learning paths — sparse paths indicate gaps
dep roadmap <audience-id> --root <project-root>

# Search for concepts to find documented vs. missing areas
dep search "<key-concept>" --root <project-root>

# Assess connectivity — 0-1 neighbors = poorly connected
dep neighbors <file> --depth 2 --root <project-root>
```

### Step 6 — Post-Migration Verification

After the user executes the migration plan, verify compliance:

```bash
dep validate --root <project-root>
dep index --root <project-root>
```

Or delegate to the validation tree:

```bash
dap node validate-and-fix run-validation --json --root <dap-root>
```

## Constraints

- Do not modify existing documents during audit — only analyze and plan
- Present the plan to the user for approval before any changes
- Preserve all existing content — migration should not delete information
- Flag documents that may be outdated but let the owner decide
- Always traverse the DAP tree node-by-node — never skip nodes or hardcode decision paths
