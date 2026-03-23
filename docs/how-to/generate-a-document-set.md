---
dep:
  type: how-to
  audience: [ai-agent, human-author]
  owner: "@dep-core"
  created: 2026-03-23T14:00:00+02:00
  last_verified: 2026-03-23T14:00:00+02:00
  confidence: high
  depends_on: [skills/dep-generate/SKILL.md, docs/reference/docspec-schema.md]
  tags: [generation, cli, workflow]
  links:
    - target: ../reference/docspec-schema.md
      rel: USES
    - target: ../reference/dep-skills-api.md
      rel: USES
    - target: ./validate-a-document.md
      rel: NEXT
---

# How-To: Generate a Document Set

**Goal**: Use the `/dep-generate` skill to produce a complete DEP-compliant documentation set for a system.

## Prerequisites

- A Claude Code session with DEP skills available
- A system description (codebase, API spec, or prose description of the domain)
- Optionally, an existing `.docspec` file

## Steps

1. Invoke the generation skill:

   ```
   /dep-generate
   ```

2. Provide the system description when prompted. Include:
   - What the system does
   - Who uses it (potential audiences)
   - Key concepts and components

3. Review the proposed `.docspec` file. Confirm or adjust:
   - Audience definitions (IDs, goals, entry points)
   - Directory structure
   - Governance settings (review cadences, ownership)

4. Review the document plan. The skill presents a list of documents it will generate, organized by type. Approve or modify the plan before generation begins.

5. Wait for generation. Documents are created in dependency order — references first, then tutorials and how-tos that link to them, then explanations.

6. Run validation on the generated set:

   ```bash
   cd cli && bun run src/index.ts validate --root ..
   ```

7. Fix any validation issues flagged in the report.

## Verification

Run `validate` and confirm all documents pass. Run `graph` to visualize the documentation structure and verify no orphans exist:

```bash
cd cli && bun run src/index.ts graph --root ..
```

## Related

- [.docspec Schema](../reference/docspec-schema.md) — configuration file the generator produces
- [DEP Skills API](../reference/dep-skills-api.md) — full `/dep-generate` interface
- [How-To: Validate a Document](./validate-a-document.md) — post-generation validation
