---
dep:
  type: how-to
  audience: [ai-agent, human-author]
  owner: "@dep-core"
  created: 2026-03-23T14:00:00+02:00
  last_verified: 2026-03-23T14:00:00+02:00
  confidence: high
  depends_on: [cli/src/commands/validate.ts, docs/reference/dep-metadata-schema.md]
  tags: [validation, cli, workflow]
  links:
    - target: ../reference/dep-metadata-schema.md
      rel: USES
    - target: ../reference/document-type-signatures.md
      rel: USES
    - target: ../reference/dep-skills-api.md
      rel: USES
---

# How-To: Validate a Document

**Goal**: Check a DEP document (or full documentation set) for metadata completeness, type purity, link integrity, and lifecycle freshness.

## Prerequisites

- Bun installed (`bun --version`)
- CLI dependencies installed (`cd cli && bun install`)
- A project with a `.docspec` file at the root

## Steps

### Single Document Validation

1. Run the validator from the `cli/` directory:

   ```bash
   cd cli && bun run src/index.ts validate --root ..
   ```

2. Review the output. Each document gets a status:
   - **PASS** — all checks passed
   - **WARN** — non-critical issues (e.g., approaching staleness)
   - **FAIL** — critical issues that must be fixed

3. For machine-readable output, add `--json`:

   ```bash
   bun run src/index.ts validate --root .. --json
   ```

### Using the `/dep-validate` Skill

1. In a Claude Code session within your project, invoke:

   ```
   /dep-validate
   ```

2. Provide the path to a single document or let it scan the full docs root.

3. Review the validation report and apply suggested fixes.

## Verification

After fixing issues, re-run `validate`. A clean run shows all documents as **PASS** and the graph integrity section shows no orphans, no cycles, and all entry points present.

## Related

- [DEP Metadata Schema](../reference/dep-metadata-schema.md) — field definitions the validator checks against
- [Document Type Signatures](../reference/document-type-signatures.md) — structural patterns the validator enforces
- [DEP Skills API](../reference/dep-skills-api.md) — full skill interface reference
