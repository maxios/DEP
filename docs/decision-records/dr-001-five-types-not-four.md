---
dep:
  type: decision-record
  audience: [ai-generator, human-author]
  owner: "@dep-core"
  created: 2026-03-22
  last_verified: 2026-03-22
  confidence: high
  depends_on: [seed.md]
  tags: [architecture, types, taxonomy, diátaxis]
  links:
    - target: ../reference/document-type-signatures.md
      rel: DECIDES
---

# DR-001: Five Document Types, Not Four

## Status

Accepted

## Context

The Diátaxis framework (by Daniele Procida) identifies four document types: tutorials, how-to guides, reference, and explanation. This framework is well-established and widely adopted.

DEP needed a content taxonomy — a set of document types that cover all possible documentation needs across any domain. The question was whether to adopt Diátaxis directly or modify it.

The constraint: DEP must work for AI agents that produce and consume documentation autonomously. Every document type must map to a distinct mental operation. If two types map to the same operation, they should be merged. If a necessary operation is missing, a type must be added.

## Decision

DEP uses **five** document types: the four from Diátaxis plus **Decision Record**.

The five types and their mental operations:
1. **Tutorial** — Construct a new mental model
2. **How-To** — Execute a known task
3. **Reference** — Look up a specific fact
4. **Explanation** — Reshape/deepen an existing model
5. **Decision Record** — Preserve the reasoning behind a choice

## Alternatives Considered

### Alternative A: Adopt Diátaxis as-is (four types)

Decision records would be classified as either explanations or reference entries.

**Rejected because**: A decision record performs a distinct mental operation — it answers "Why was X chosen over Y?" with specific alternatives and tradeoffs. This is different from explanation ("Why does X work this way?") because it is:
- Bounded in time (a specific decision at a specific moment)
- Enumerative (lists specific alternatives considered)
- Actionable (includes review triggers for revisiting)

Forcing decision records into the explanation type contaminates both: explanations gain procedural decision content, and decisions lose their structured format.

### Alternative B: More than five types (add Runbook, FAQ, Changelog, etc.)

**Rejected because**: Additional proposed types do not represent new mental operations:
- **Runbook** = How-To with additional required patterns (severity, escalation, rollback). Modeled as a custom type extending `how-to`.
- **FAQ** = Collection of explanation snippets. Should be decomposed into individual explanations or how-tos.
- **Changelog** = Time-ordered reference entries. Modeled within the reference type.
- **ADR (Architecture Decision Record)** = Domain-specific name for `decision-record`. Same type, different label.

The test: does the proposed type perform a fundamentally different *mental operation*? If not, it's a variant of an existing type.

## Consequences

**Enables**:
- Complete coverage of documentation needs across domains
- Clear mapping between reader questions and document types
- Decision traceability as a first-class concern (critical for regulated domains: medicine, law, finance)
- AI generators have an unambiguous type to assign for every document

**Constrains**:
- Projects familiar with Diátaxis must learn the fifth type
- The extension mechanism (`custom_types` in `.docspec`) must be well-documented to prevent type proliferation

## Review Trigger

Revisit this decision if a documentation need is identified that genuinely cannot be served by any of the five types AND cannot be modeled as a custom type extending one of the five.

## Participants

- @dep-core
