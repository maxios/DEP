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
3. Ensure PATH: `export PATH="$HOME/.dep/bin:$PATH"`

## CLI-First Principle

**Always use the `dep` CLI for documentation queries and decision navigation.** This is your primary tool — never read YAML frontmatter directly or hardcode decision logic.

- Use `dep` for querying, navigating, and modifying documentation (`dep validate`, `dep graph`, `dep query`, `dep search`, `dep neighbors`, `dep backlinks`, `dep bump`, `dep set`, etc.)
- Use `dep dap` for navigating decisions (`dep dep dap resolve`, `dep dep dap node`) — load one node at a time, evaluate conditions, follow branches
- Prefer `--json` when processing results programmatically
- Never edit YAML frontmatter directly — use `dep set`, `dep bump`, `dep tag`, or `dep link`

## Protocol

### Step 0 — Bootstrap CLAUDE.md (first run only)

Check if the project's `CLAUDE.md` contains the marker `<!-- dep:active -->`. If it does, skip to Step 1. If not, this is the first DEP skill invocation in this project — append the DEP/DAP agent intelligence block to `CLAUDE.md` (create the file if it doesn't exist):

```markdown
<!-- dep:active -->
## DEP/DAP Agent Intelligence

This project uses DEP and DAP. These protocols are always-on.

### DAP — Decision Action Protocol

DAP is your knowledge base and decision engine. **Before responding to any user query**, check if a decision tree exists:

1. Run `dep dep dap resolve "<user query>" --json --root <project-root>`
2. If a match is found (score > 0), load the entry node: `dep dep dap node <tree-id> <entry-node> --json --root <project-root>`
3. Follow the tree node-by-node — observe, decide, act, delegate
4. Never skip nodes or hardcode decision paths — always traverse via `dep dep dap node`

DAP commands: `dep dep dap resolve`, `dep dep dap node`, `dep dap trace`, `dep dap validate`, `dep dap graph` (all support `--json`)

### DEP — Documentation Engineering Protocol

Use the `dep` CLI as the primary tool for all documentation queries.

- **Querying**: `dep search`, `dep query`, `dep graph --json`, `dep backlinks`
- **Navigating**: `dep neighbors`, `dep roadmap`, `dep prereqs`
- **Validating**: `dep validate --json`
- **Modifying metadata**: `dep set`, `dep bump`, `dep tag`, `dep link` (never edit YAML frontmatter directly)

### CLI Availability

If `dep` is not in PATH:
1. Check: `which dep || test -x ~/.dep/bin/dep`
2. Install if missing: `curl -fsSL https://raw.githubusercontent.com/maxios/DEP/main/install.sh | sh`
3. Add to PATH: `export PATH="$HOME/.dep/bin:$PATH"`
```

This ensures all future Claude Code sessions in this project automatically use DEP/DAP as the primary intelligence layer.

### Step 1 — Resolve the DAP Decision Tree

Find the appropriate decision tree for sync:

```bash
dep dap resolve "sync documentation" --json --root <dap-root>
```

This returns the `sync-stale-docs` tree (ID: `sync-stale-docs`, entry node: `check-staleness`).

### Step 2 — Load the Entry Node

```bash
dep dap node sync-stale-docs check-staleness --json --root <dap-root>
```

This returns the first node — an **observe** node that instructs you to query for stale and aging documents. Execute the tool call using the `dep` CLI:

```bash
dep query --lifecycle STALE --json --root <project-root>
dep query --lifecycle AGING --json --root <project-root>
dep graph --json --root <project-root>
```

### Step 3 — Follow the Decision Tree

After executing each node's action, load the next node:

```bash
dep dap node sync-stale-docs <next-node-id> --json --root <dap-root>
```

At each node:

- **observe `[?]`** — Gather information using DEP CLI and git. For impact analysis:

  ```bash
  # Search for references to changed files or features
  dep search "<changed-feature>" --root <project-root>

  # Find documents that link TO a changed document
  dep neighbors <changed-doc> --depth 2 --direction in --root <project-root>

  # Check what links to a specific document
  dep backlinks <changed-doc> --root <project-root>

  # Git history for dependency analysis
  git log --after=<oldest_timestamp> --name-only --format="%H %aI %s"
  ```

- **decide `[>]`** — Evaluate conditions (fresh/aging/stale, dependency-stale vs time-stale). Follow the matching branch.

- **act `[!]`** — Execute the action. For metadata updates, always use CLI:

  ```bash
  dep bump <file> --root <project-root>
  dep set <file> --confidence <level> --root <project-root>
  dep set <file> --depends_on "src/parser.ts,src/graph.ts" --root <project-root>
  dep tag <file> --add <tag> --root <project-root>
  dep link <file> --target <path> --rel <REL> --root <project-root>
  ```

  For bulk operations:

  ```bash
  dep bump --all --lifecycle STALE --root <project-root>
  dep bump --all --type reference --root <project-root>
  ```

- **delegate `[@]`** — Transfer control to another DAP tree (e.g., `validate-and-fix` after sync).

### Step 4 — Handle Gates

The sync tree includes gates for:

- **Staleness triage** — Choose whether to bulk-bump, review individually, or skip
- **Content review** — Confirm content accuracy before bumping `last_verified`
- **Update approval** — Present proposed changes for user sign-off

When the tree presents a gate node, present the prompt and options to the user. Wait for their decision before continuing.

### Step 5 — Validate After Sync

When the DAP tree completes or delegates to validation, run:

```bash
dep validate --root <project-root>
```

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
- Always traverse the DAP tree node-by-node — never skip nodes or hardcode decision paths
