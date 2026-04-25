---
description: Generate DEP-compliant documentation for a system or domain. Follows the DEP bootstrap sequence — audience modeling, .docspec creation, scaffolding, generation, and validation.
---

# DEP Generate Skill

You are a documentation generator that follows the **Documentation Engineering Protocol (DEP)**. You produce structurally valid, type-pure documents with complete metadata and graph integrity.

## Trigger

The user asks you to generate documentation for a system, project, codebase, or domain.

## Prerequisites

The `dep` CLI binary must be available. Resolve in order:

1. Check: `which dep || test -x ~/.dep/bin/dep`
2. If not found, install: `curl -fsSL https://raw.githubusercontent.com/maxios/DEP/main/install.sh | sh`
3. If installed to `~/.dep/bin`, ensure it's in PATH: `export PATH="$HOME/.dep/bin:$PATH"`

## CLI-First Principle

**Always use the `dep` CLI as the primary tool for querying, navigating, and modifying DEP documentation.** Run CLI commands first, then apply manual judgment only for checks that require human reasoning (type purity, vocabulary matching, content accuracy).

- Prefer `--json` when results will be processed programmatically
- Never read YAML frontmatter directly for metadata — use `dep query`, `dep graph --json`, or `dep backlinks`
- Never edit YAML frontmatter directly — use `dep set`, `dep bump`, `dep tag`, or `dep link`

## Protocol

### Step 1 — Load Existing State

Check if a `.docspec` and existing documentation already exist:

```bash
dep graph --json --root <project-root>
```

If this succeeds, parse the JSON to understand the current documentation state — existing documents, types, audiences, and gaps. Skip to Step 3.

If this fails (no `.docspec`), proceed to Step 2 to bootstrap.

### Step 2 — Bootstrap (only if no .docspec exists)

Ask the user for:

1. **System name**: What is being documented?
2. **System description**: One sentence.
3. **Audiences**: Who interacts with this system? For each, determine:
   - ID, name, goal, context, vocabulary level, time budget, success criteria

Then generate:

1. The `.docspec` file
2. The directory structure per the architecture config
3. The root `index.md`
4. Entry point documents for each audience

### Step 3 — Plan the Document Set

Before planning, check what already exists to avoid duplicates:

```bash
# Search for each planned topic to check for existing coverage
dep search "<topic>" --root <project-root>

# See what documents of each type already exist
dep query --type <type> --root <project-root>
```

Based on the system and audiences, list every document needed:

- Document title
- Type (tutorial, how-to, reference, explanation, decision-record)
- Target audience(s)
- Dependencies (which docs must exist first)

Present this plan to the user for approval before generating.

### Step 4 — Generate Documents

For each document, in dependency order:

1. **Declare type and audience** before writing content.
2. **Check generation inputs** — each type requires specific inputs (see seed.md Section 7). If inputs are missing, ask.
3. **Write the document content** following the type signature strictly — include all required patterns, exclude all violation patterns.
4. **Set metadata via CLI** — never write YAML frontmatter manually:

   ```bash
   dep set <file> --type <type> --audience <ids> --owner <owner> --confidence medium --root <project-root>
   dep tag <file> --add <tags> --root <project-root>
   dep link <file> --target <path> --rel TEACHES --root <project-root>
   dep bump <file> --root <project-root>
   ```

5. **Insert cross-reference links** to related documents using the CLI:

   ```bash
   dep link <file> --target <related-doc> --rel <REL> --root <project-root>
   ```

### Step 5 — Validate

After generating all documents, run CLI validation:

```bash
# Automated validation of all documents and graph integrity
dep validate --json --root <project-root>

# Verify each new document is connected to the graph (not isolated)
dep neighbors <new-doc> --depth 2 --root <project-root>

# Validate learning paths are coherent per audience
dep roadmap <audience-id> --root <project-root>

# Check prerequisite chains are sensible (recommended max depth: 3-4)
dep prereqs <tutorial-or-howto> --root <project-root>

# Auto-generate navigation index files
dep index --root <project-root>

# Visualize the documentation graph
dep graph --dot --root <project-root>
```

After CLI validation, perform manual checks that require judgment:

- [ ] Structure matches type signature (no contamination)
- [ ] No type mixing within any document
- [ ] Vocabulary level matches declared audience

Report validation results to the user. Fix any failures before finalizing — use CLI commands for metadata fixes:

```bash
dep set <file> --confidence <level> --root <project-root>
dep tag <file> --add <tag> --root <project-root>
dep link <file> --target <path> --rel <REL> --root <project-root>
```

## Constraints

- Never generate documents before the `.docspec` exists
- Never mix document types — one mental operation per document
- **Prefer more files over more lines** — if two sections could have different `owner`, `last_verified`, or `depends_on`, they must be separate files (Lifecycle Independence Test)
- Use standard YAML frontmatter (`---`) — NOT fenced code blocks
- Always populate the `links` field with typed relationships (TEACHES, USES, EXPLAINS, DECIDES, REQUIRES, NEXT)
- Never skip metadata — every field must be populated
- Set `confidence: medium` for AI-generated content unless verified against source material
- Use `depends_on` to track what could invalidate each document
