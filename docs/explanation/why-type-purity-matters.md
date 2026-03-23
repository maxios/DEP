---
dep:
  type: explanation
  audience: [human-author, ai-generator]
  owner: "@dep-core"
  created: 2026-03-23T14:00:00+02:00
  last_verified: 2026-03-23T14:00:00+02:00
  confidence: high
  depends_on: [seed.md, docs/reference/document-type-signatures.md]
  tags: [type-purity, architecture, principles]
  links:
    - target: ../reference/document-type-signatures.md
      rel: EXPLAINS
    - target: ../decision-records/dr-001-five-types-not-four.md
      rel: EXPLAINS
---

# Why Type Purity Matters

## Context

DEP enforces a strict rule: every document must perform exactly one mental operation. A tutorial teaches. A how-to enables execution. A reference provides lookup. An explanation deepens understanding. A decision record preserves reasoning. Mixing these within a single document is called **type contamination**, and DEP treats it as a structural defect.

This raises a natural question — why be so strict? Most documentation frameworks allow (or even encourage) blending styles within a single page. DEP does not. This explanation covers why.

## The Reader Navigation Problem

When a reader opens a document, they carry an implicit question:

- "Teach me" → they want a tutorial
- "Help me do X" → they want a how-to
- "What is the exact value of X?" → they want a reference
- "Why is it this way?" → they want an explanation

If a how-to guide contains a three-paragraph explanation of why the approach works, the reader doing the task must skip over content that doesn't serve their goal. If a tutorial contains an exhaustive parameter table, the learner is overwhelmed with details they don't yet need.

Type contamination forces every reader to perform their own triage — scanning for the parts that match their mental operation and ignoring the rest. This is cognitive overhead that scales with document length.

## The AI Processing Problem

For AI agents consuming documentation, type purity is even more critical. An AI agent processing a how-to guide expects: goal, prerequisites, steps, verification. When the document also contains teaching asides and reference tables, the agent must determine which parts are actionable steps and which are background context. This ambiguity leads to:

- **Hallucinated steps** — the agent may interpret an explanatory aside as an instruction
- **Missed steps** — the agent may skip actual instructions buried in narrative prose
- **Token waste** — the agent processes irrelevant content that inflates context windows

A type-pure document is unambiguous: its structure tells the agent exactly how to process every section.

## The Maintenance Problem

Mixed documents have a hidden cost: sections within the same file age at different rates.

Consider a document that combines a how-to (steps to deploy) with an explanation (why blue-green deploys work). The deployment steps change every time the infrastructure changes. The explanation of blue-green deploys may stay valid for years. But they share one `last_verified` date, one owner, and one review cadence.

DEP's Lifecycle Independence Test says: if two sections could have different owners, different confidence levels, or different review cadences, they belong in separate documents. Type contamination almost always violates this test.

## The Fix Is Always Extraction

When contamination is detected, the fix is always the same:

1. Identify the contaminating content
2. Determine its correct type
3. Extract it to a new document of that type
4. Replace the extracted content with a cross-reference link

This produces more files but each file is:
- **Predictable** — readers know the structure from the type alone
- **Independently maintainable** — each file has its own lifecycle
- **Composable** — AI agents and navigation systems can assemble the right set of documents per reader

## Tradeoffs

**More files**: Type purity means more, smaller documents. This increases the number of files in a project but reduces the cognitive cost per file. The documentation graph (managed by `.docspec` and the `dep` CLI) handles navigation.

**Upfront effort**: Splitting a contaminated document takes work. But the cost is paid once at write time, while the benefit of clean separation compounds every time someone reads, reviews, or updates the documentation.

**Cross-reference overhead**: Extracted content must be linked. DEP's typed links (`TEACHES`, `USES`, `EXPLAINS`, etc.) make these relationships explicit and navigable, turning a potential downside into a structural advantage.

## Related

- [Document Type Signatures](../reference/document-type-signatures.md) — the required and violation patterns for each type
- [DR-001: Five Types Not Four](../decision-records/dr-001-five-types-not-four.md) — why DEP uses five types
- [DR-002: Atomic Files Over Long Documents](../decision-records/dr-002-atomic-files-over-long-documents.md) — the atomicity principle behind extraction
