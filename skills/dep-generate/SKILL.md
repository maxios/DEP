---
description: Generate DEP-compliant documentation for a system or domain. Follows the DEP bootstrap sequence — audience modeling, .docspec creation, scaffolding, generation, and validation.
---

# DEP Generate Skill

You are a documentation generator that follows the **Documentation Engineering Protocol (DEP)**. You produce structurally valid, type-pure documents with complete metadata and graph integrity.

## Trigger

The user asks you to generate documentation for a system, project, codebase, or domain.

## Prerequisites

Both the `dep` and `dap` CLI binaries must be available. Resolve in order:

1. Check: `which dep || test -x ~/.dep/bin/dep`
2. Check: `which dap || test -x ~/.dap/bin/dap`
3. If not found, install: `curl -fsSL https://raw.githubusercontent.com/maxios/DEP/main/install.sh | sh`
4. Ensure PATH: `export PATH="$HOME/.dep/bin:$HOME/.dap/bin:$PATH"`

## CLI-First Principle

**Always use the `dep` CLI for documentation queries and the `dap` CLI for decision navigation.** These are your primary tools — never read YAML frontmatter directly or hardcode decision logic.

- Use `dep` for querying, navigating, and modifying documentation (`dep validate`, `dep graph`, `dep query`, `dep search`, `dep set`, `dep tag`, `dep link`, `dep bump`, etc.)
- Use `dap` for navigating decisions (`dap resolve`, `dap node`) — load one node at a time, evaluate conditions, follow branches
- Prefer `--json` when processing results programmatically
- Never edit YAML frontmatter directly — use `dep set`, `dep bump`, `dep tag`, or `dep link`

## Protocol

### Step 1 — Resolve the DAP Decision Tree

Find the appropriate decision tree for generation:

```bash
dap resolve "generate documentation" --json --root <dap-root>
```

This returns the `generate-doc-set` tree (ID: `generate-doc-set`, entry node: `check-docspec`).

### Step 2 — Load the Entry Node

```bash
dap node generate-doc-set check-docspec --json --root <dap-root>
```

This returns the first node — an **observe** node that checks if a `.docspec` exists. Execute the check.

### Step 3 — Follow the Decision Tree

After executing each node's action, load the next node:

```bash
dap node generate-doc-set <next-node-id> --json --root <dap-root>
```

At each node:

- **observe `[?]`** — Gather information. Run the specified tool call or gate prompt, capture outputs.
- **decide `[>]`** — Evaluate conditions against collected outputs. Follow the matching branch.
- **act `[!]`** — Execute the terminal action. For document generation, this means writing content and setting metadata via CLI.
- **delegate `[@]`** — Transfer control to another DAP tree (e.g., `validate-and-fix` after generation).

### Step 4 — Handle Gates

The generation tree includes critical human gates:

- **Audience approval gate** — Present modeled audiences for user confirmation
- **Document plan gate** — Present the planned document set for user approval before generating
- **Final review gate** — Present generated documents for user sign-off

When the tree presents a gate node, present the prompt and options to the user. Wait for their decision before continuing.

### Step 5 — Execute Actions with DEP CLI

When the DAP tree instructs you to create documents or modify metadata, always use the `dep` CLI:

```bash
# Set metadata on generated documents
dep set <file> --type <type> --audience <ids> --owner <owner> --confidence medium --root <project-root>
dep tag <file> --add <tags> --root <project-root>
dep link <file> --target <path> --rel TEACHES --root <project-root>
dep bump <file> --root <project-root>

# Check for duplicates before creating
dep search "<topic>" --root <project-root>

# Verify connectivity after generation
dep neighbors <new-doc> --depth 2 --root <project-root>

# Validate learning paths
dep roadmap <audience-id> --root <project-root>

# Auto-generate navigation
dep index --root <project-root>
```

### Step 6 — Delegation to Validation

The generation tree delegates to `validate-and-fix` after generation. When you hit a **delegate** node, switch to the referenced tree:

```bash
dap node validate-and-fix run-validation --json --root <dap-root>
```

Continue traversing the validation tree until it terminates.

## Constraints

- Never generate documents before the `.docspec` exists
- Never mix document types — one mental operation per document
- **Prefer more files over more lines** — if two sections could have different `owner`, `last_verified`, or `depends_on`, they must be separate files (Lifecycle Independence Test)
- Always populate the `links` field with typed relationships (TEACHES, USES, EXPLAINS, DECIDES, REQUIRES, NEXT)
- Never skip metadata — every field must be populated
- Set `confidence: medium` for AI-generated content unless verified against source material
- Use `depends_on` to track what could invalidate each document
- Always traverse the DAP tree node-by-node — never skip nodes or hardcode decision paths
