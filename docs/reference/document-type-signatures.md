---
dep:
  type: reference
  audience:
    - ai-generator
    - ai-agent
    - human-author
  owner: "@dep-core"
  created: 2026-03-22T23:36:54+02:00
  last_verified: 2026-04-26T20:29:13.570+03:00
  confidence: high
  depends_on:
    - seed.md
  tags:
    - types
    - validation
    - structure
  links:
    - target: ./type-signature-tutorial.md
      rel: NEXT
    - target: ./type-signature-howto.md
      rel: NEXT
    - target: ./type-signature-reference.md
      rel: NEXT
    - target: ./type-signature-explanation.md
      rel: NEXT
    - target: ./type-signature-decision-record.md
      rel: NEXT
---

# Document Type Signatures Reference

Each DEP document type has a **type signature**: required structural patterns that MUST be present, and violation patterns that MUST NOT be present.

## Per-Type Signatures

Each type's full signature — required patterns, violation patterns, and structural template — is defined in its own document:

- [Tutorial](type-signature-tutorial.md) — Construct a new mental model through guided experience
- [How-To](type-signature-howto.md) — Enable execution of a known task
- [Reference](type-signature-reference.md) — Provide precise lookup of specific facts
- [Explanation](type-signature-explanation.md) — Reshape or deepen an existing mental model
- [Decision Record](type-signature-decision-record.md) — Preserve the reasoning behind a choice

## Type Purity Test

A document passes the type purity test if:

1. All required patterns for its declared type are present.
2. No violation patterns for its declared type are present.
3. A reader can predict the document's structure from its type alone.

If a document fails this test, it is **contaminated**. The fix is always **extraction**: move the contaminating content to a new document of the correct type, and replace it with a cross-reference link.
