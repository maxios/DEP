---
dep:
  type: decision-record
  audience: [ai-generator, ai-agent, human-author]
  owner: "@dep-core"
  created: 2026-03-23
  last_verified: 2026-03-23
  confidence: high
  depends_on: [seed.md, docs/reference/dep-metadata-schema.md]
  tags: [metadata, frontmatter, relationships, tooling]
  links:
    - target: ../reference/dep-metadata-schema.md
      rel: DECIDES
    - target: ./dr-002-atomic-files-over-long-documents.md
      rel: REQUIRES
---

# DR-003: Standard Frontmatter and Explicit Relationship Links

## Status

Accepted

## Context

Two related problems emerged as DEP matured:

**Problem 1: Metadata format incompatibility.** DEP originally wrapped YAML metadata in fenced code blocks (`` ```yaml ... ``` ``). This preserved the metadata as visible content in any markdown renderer, but it broke compatibility with every standard frontmatter tool: gray-matter, Obsidian, remark-frontmatter, MarkdownDB, and others. Any tooling for DEP required a custom parser.

**Problem 2: Relationships were implicit.** DEP defines six relationship types (TEACHES, USES, EXPLAINS, DECIDES, REQUIRES, NEXT) in the protocol, but they were only expressed as inline markdown links. There was no way to:
- Compute backlinks programmatically
- Query "what teaches this reference?"
- Validate that every tutorial TEACHES to a reference entry
- Build a navigation graph without parsing natural language

Both problems block the navigation system needed to scale atomic files (DR-002).

## Decision

### Part A: Switch to standard YAML frontmatter

All DEP documents use standard YAML frontmatter (`---` delimiters) as the first content in the file. No fenced code block wrapper.

Before:
````
```yaml
---
dep:
  type: tutorial
---
```
````

After:
```
---
dep:
  type: tutorial
---
```

### Part B: Add a `links` field for typed relationships

A new optional field `links` in the DEP metadata block encodes typed navigation relationships:

```yaml
dep:
  links:
    - target: ../reference/widget-api.md
      rel: TEACHES
    - target: ./basic-setup.md
      rel: REQUIRES
```

Each entry has:
- `target`: relative path to the target document
- `rel`: one of the six canonical types or a custom relationship from `.docspec`

Backlinks are **computed at build time** by the `dep` CLI, never stored in files.

## Alternatives Considered

### Alt A1: Keep fenced code blocks, build custom parser

**Rejected because**: Every tool in the markdown ecosystem expects standard frontmatter. Building a custom parser solves one project's problem but prevents DEP from benefiting from Obsidian's graph view, gray-matter's parsing, MarkdownDB's queries, and future tools. The cost of switching is a one-time migration; the cost of not switching is permanent tooling isolation.

### Alt A2: Support both formats

**Rejected because**: Two valid formats means every tool must handle both, every example must show both, and contributors are confused about which to use. A protocol must be opinionated about its own format.

### Alt B1: Infer relationship types from document types

A link from a tutorial to a reference would automatically be classified as TEACHES based on the source and target types.

**Rejected because**: This only works for 4 of 6 relationship types. When a tutorial links to another tutorial, is it REQUIRES or NEXT? When a how-to links to another how-to, the relationship is ambiguous. Inference produces incorrect results for same-type links and cannot handle custom relationships.

### Alt B2: Wikilink syntax with relationship prefix

Use Obsidian-style `[[TEACHES::reference/widget-api]]` syntax.

**Rejected because**: This is non-standard markdown — it only renders correctly in Obsidian. DEP documents must be valid markdown that renders correctly in any viewer (GitHub, VS Code, static site generators). Embedding structured data in markdown syntax conflates content with metadata.

### Alt B3: Store backlinks in target documents

When document A links to B with `rel: TEACHES`, also add a reverse entry in B's metadata.

**Rejected because**: Bidirectional storage creates a sync problem. Every link change requires editing two files. If either edit is missed, the graph is inconsistent. Computed backlinks cost O(E) at build time — negligible for documentation-scale graphs — and are always consistent by construction.

## Consequences

**Enables**:
- Obsidian compatibility: DEP docs can be opened as an Obsidian vault with working frontmatter and graph view
- Standard tooling: gray-matter, remark-frontmatter, MarkdownDB all work out of the box
- Computed backlinks: the `dep` CLI can build a reverse index from `links` metadata
- Graph queries: "What documents teach this reference?" becomes a metadata query
- Validation: "Does every tutorial have a TEACHES link to a reference?" is now checkable
- Auto-generated indexes: index files can be built from metadata rather than maintained manually

**Constrains**:
- All existing documents must be migrated (one-time cost)
- Authors must populate the `links` field when creating documents (mitigated by the `dep-generate` skill)
- The metadata block is no longer visible as content in basic markdown renderers — it's parsed as frontmatter and hidden (this is standard behavior and expected by most tools)

## Review Trigger

Revisit if a significant markdown tool emerges that requires a different frontmatter format, or if the `links` field proves insufficient for expressing a common relationship pattern.

## Participants

- @dep-core
