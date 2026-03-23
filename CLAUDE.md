# DEP — Documentation Engineering Protocol

This is the DEP project: a universal documentation standard for humans and AI.

## Project Structure

```
dep/
├── seed.md              # The foundational DEP specification (self-referential)
├── .docspec             # DEP configuration for this project (DEP documenting itself)
├── CLAUDE.md            # This file
├── docs/
│   ├── index.md         # Root navigation — routes by audience and type
│   ├── tutorials/       # Guided learning documents
│   ├── how-to/          # Task-completion documents
│   ├── reference/       # Lookup documents (schemas, signatures, API)
│   ├── explanation/     # Conceptual depth documents
│   └── decision-records/# Decision preservation documents
├── skills/              # Claude Code skills for DEP workflows
│   ├── dep-generate.md  # Generate DEP-compliant documentation
│   ├── dep-validate.md  # Validate documentation against DEP
│   └── dep-audit.md     # Audit and migrate existing docs to DEP
└── cli/                 # DEP CLI tool (bun + typescript)
    └── src/             # graph, backlinks, validate, query, index commands
```

## Key Principles

1. **Every document has exactly one type**: tutorial, how-to, reference, explanation, or decision-record
2. **Every document declares its audience**: mind-state + goal pairs defined in `.docspec`
3. **Type purity**: no mixing mental operations — extract contamination into separate documents
4. **Atomicity**: prefer more files over more lines (Lifecycle Independence Test)
5. **Graph integrity**: no orphans, all links resolve, typed relationships
6. **Lifecycle awareness**: documents have owners, review cadences, and confidence levels

## When Editing Documents

- Use standard YAML frontmatter (`---`) — NOT fenced code blocks
- Always include the DEP metadata block with all required fields
- Populate `links` with typed relationships (TEACHES, USES, EXPLAINS, DECIDES, REQUIRES, NEXT)
- Follow the type signature for the declared type (see `docs/reference/document-type-signatures.md`)
- Check audience IDs against `.docspec`
- Set `confidence` honestly: `high` if verified, `medium` if inferred, `low` if speculative

## CLI Tool

Run from the `cli/` directory:

```bash
bun run src/index.ts graph --root ..          # view documentation graph
bun run src/index.ts backlinks <file> --root ..  # see what links to a document
bun run src/index.ts validate --root ..       # validate all documents
bun run src/index.ts query --type reference --root ..  # filter by metadata
bun run src/index.ts index --root ..          # auto-generate index files
```

All commands support `--json` for machine-readable output.

## Skills

- `/dep-generate` — Generate DEP-compliant documentation for any system
- `/dep-validate` — Validate documents and documentation sets against DEP
- `/dep-audit` — Audit existing documentation and plan DEP migration
