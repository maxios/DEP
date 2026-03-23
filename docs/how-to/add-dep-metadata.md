---
dep:
  type: how-to
  audience: [human-author]
  owner: "@dep-core"
  created: 2026-03-23T14:00:00+02:00
  last_verified: 2026-03-24T00:00:00+02:00
  confidence: high
  depends_on: [docs/reference/dep-metadata-schema.md]
  tags: [metadata, migration, workflow]
  links:
    - target: ../reference/dep-metadata-schema.md
      rel: USES
    - target: ./validate-a-document.md
      rel: NEXT
---

# How-To: Add DEP Metadata to Existing Docs

**Goal**: Add a valid DEP metadata block to an existing Markdown document so it becomes part of the DEP documentation graph.

## Prerequisites

- An existing Markdown document without DEP metadata
- A `.docspec` file in the project root (for audience IDs and governance settings)
- Familiarity with the [DEP Metadata Schema](../reference/dep-metadata-schema.md)

## Steps

1. Determine the document's type by asking: what mental operation does it perform on the reader?

   | Reader's question | Type |
   |-------------------|------|
   | "Teach me" | `tutorial` |
   | "Help me do X" | `how-to` |
   | "What is the exact value of X?" | `reference` |
   | "Why is it this way?" | `explanation` |
   | "Why was X chosen over Y?" | `decision-record` |

2. Open the document and add YAML frontmatter at the very top (before any existing content):

   ```yaml
   ---
   dep:
     type: <chosen-type>
     audience: [<audience-id-from-docspec>]
     owner: "@your-name"
     created: 2026-03-23T14:00:00+02:00
     last_verified: 2026-03-23T14:00:00+02:00
     confidence: medium
     depends_on: []
     tags: []
     links: []
   ---
   ```

3. Fill in `audience` using IDs from your `.docspec` file's `audiences` section.

4. Set `depends_on` to list any files (code or docs) that, if changed, would make this document inaccurate.

5. Add `links` entries for any documents this one references, using the appropriate relationship type (`TEACHES`, `USES`, `EXPLAINS`, `DECIDES`, `REQUIRES`, `NEXT`).

6. Check for type contamination — if the document mixes types (e.g., a how-to with teaching asides), extract the contaminating content into a separate document and replace it with a link.

7. Run validation:

   ```bash
   cd cli && bun run src/index.ts validate --root ..
   ```

## Verification

The validator reports the document as **PASS** with no broken links, and the document appears in the graph output (`dep graph`).

## Related

- [DEP Metadata Schema](../reference/dep-metadata-schema.md) — complete field reference
- [How-To: Validate a Document](./validate-a-document.md) — run validation after adding metadata
