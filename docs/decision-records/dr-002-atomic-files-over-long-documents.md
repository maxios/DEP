---
dep:
  type: decision-record
  audience: [ai-generator, ai-agent, human-author]
  owner: "@dep-core"
  created: 2026-03-22T23:53:17+02:00
  last_verified: 2026-03-24T00:00:00+02:00
  confidence: high
  depends_on: [seed.md, docs/decision-records/dr-001-five-types-not-four.md]
  tags: [architecture, atomicity, granularity, principle]
  links: []
---

# DR-002: Atomic Files Over Long Documents

## Status

Accepted

## Context

DEP's type purity principle prevents mixing mental operations within a single document. But a question remains about granularity *within* a single type: should a reference document cover 20 API endpoints in one file, or should each endpoint be its own file?

Two forces are in tension:

1. **Human reading patterns** favor fewer files with more content — less navigation, more context in one place.
2. **AI agent consumption patterns** favor many small files — load only what's needed, minimize context window waste.

DEP is designed to serve both humans and AI. But the standard must choose a default that the architecture optimizes for, while remaining usable by the other.

Additionally, documentation governance (Layer 4) operates at the file level: `owner`, `last_verified`, `confidence`, and `depends_on` are per-file metadata. The larger a file, the coarser these signals become.

## Decision

**DEP adopts the principle: prefer more files over more lines.**

A document should cover **one concept, one task, one entry, or one decision**. When a document grows to cover multiple distinct items within the same type, it should be split into separate files.

The principle is stated as a preference, not an absolute rule. The test for when to split:

> **If two sections of the same document could have different `owner`, `last_verified`, `confidence`, or `depends_on` values, they should be separate files.**

This is the **Lifecycle Independence Test**. Sections that age independently should live independently.

### Granularity Guidelines

| Type | Atomic unit | Example |
|------|------------|---------|
| Tutorial | One learning objective | "Build Your First Widget" is one file, not a chapter in "All Tutorials" |
| How-To | One task | "Deploy to Staging" and "Deploy to Production" are separate files |
| Reference | One entity or concept | Each API endpoint, each config option, each CLI command gets its own file |
| Explanation | One concept or question | "Why Event Sourcing" and "Why CQRS" are separate, even though related |
| Decision Record | One decision | Already atomic by convention |

### Index Files Bridge the Gap

Atomic files create navigation overhead. DEP mitigates this with **index files** — one per directory — that provide:

- Grouped listings (by category, by audience, alphabetically)
- Brief descriptions (one line per entry)
- Suggested reading order where applicable

Index files are the table of contents. Atomic files are the pages. Humans navigate via indexes. AI agents navigate via metadata and links.

## Alternatives Considered

### Alternative A: No granularity guidance (leave it to authors)

**Rejected because**: Without a default, AI generators produce monolithic documents (the LLM Flood anti-pattern from [Anti-Patterns](../explanation/anti-patterns.md)). Humans produce documents that grow unbounded over time. A stated default prevents both failure modes.

### Alternative B: Optimize for human reading (fewer, longer files)

**Rejected because**:
- Lifecycle metadata becomes imprecise — one stale section poisons the whole file's `confidence`
- AI agents waste context loading irrelevant content
- Git diffs become harder to review
- Ownership becomes ambiguous (who owns the file when different sections have different experts?)
- This approach is what most documentation systems already do, and it produces the anti-patterns DEP exists to prevent

### Alternative C: Strict one-concept-per-file with no exceptions

**Rejected because**: Some content is naturally tabular or enumerative (e.g., a list of error codes with one-line descriptions). Forcing 50 files for 50 error codes creates more overhead than value. The Lifecycle Independence Test provides a pragmatic boundary: if all entries share the same owner, same staleness cadence, and same dependencies, a single file is acceptable.

## Consequences

**Enables**:
- Precise lifecycle tracking — each file ages independently
- Efficient AI consumption — agents load only the atoms they need
- Clean git history — changes to one concept don't touch unrelated content
- Clear ownership — no ambiguity about who owns what
- Composability — documentation sets can be assembled from atoms for different audiences

**Constrains**:
- Projects must maintain index files (already required by DEP)
- File count will be higher than conventional documentation
- Authors must resist the impulse to "just add a section" to an existing file
- AI generators must be configured to produce atomic outputs, not monolithic dumps

## Review Trigger

Revisit if the file count in a documentation set exceeds the point where index files themselves become unwieldy (suggested threshold: 500+ files in a single type directory), indicating the need for hierarchical sub-directories or a different navigation mechanism.

## Participants

- @dep-core
