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
└── validators/          # Automated validation scripts (planned)
```

## Key Principles

1. **Every document has exactly one type**: tutorial, how-to, reference, explanation, or decision-record
2. **Every document declares its audience**: mind-state + goal pairs defined in `.docspec`
3. **Type purity**: no mixing mental operations — extract contamination into separate documents
4. **Graph integrity**: no orphans, all links resolve, bidirectional references
5. **Lifecycle awareness**: documents have owners, review cadences, and confidence levels

## When Editing Documents

- Always include the DEP metadata block
- Follow the type signature for the declared type (see `docs/reference/document-type-signatures.md`)
- Check audience IDs against `.docspec`
- Add cross-references to related documents
- Set `confidence` honestly: `high` if verified, `medium` if inferred, `low` if speculative

## Skills

- `/dep-generate` — Generate DEP-compliant documentation for any system
- `/dep-validate` — Validate documents and documentation sets against DEP
- `/dep-audit` — Audit existing documentation and plan DEP migration
