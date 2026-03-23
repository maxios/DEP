---
dep:
  type: explanation
  audience: [ai-generator, project-lead]
  owner: "@dep-core"
  created: 2026-03-23T21:49:13+02:00
  last_verified: 2026-03-24T00:00:00+02:00
  confidence: high
  depends_on: [seed.md]
  tags: [extensions, customization, advanced]
  links:
    - target: ../reference/docspec-schema.md
      rel: EXPLAINS
    - target: ../../seed.md
      rel: REQUIRES
---

# Extension Points

DEP is designed to be extended without breaking the core protocol.

## Custom Types

If a domain genuinely requires a document type that is not one of the five, it can be defined as an extension of an existing type:

```yaml
custom_types:
  - id: runbook
    extends: how-to
    additional_required_patterns: [severity_classification, escalation_path, rollback_procedure]
```

The custom type inherits all rules of its parent and adds additional constraints. It does NOT replace the parent type in the taxonomy.

## Custom Validators

Domain-specific validation rules can be added alongside the standard validators:

```yaml
validation:
  custom_rules:
    - path: validators/medical-terminology-check.py
    - path: validators/legal-citation-format.py
```

## Custom Relationships

If the six canonical relationships are insufficient, additional typed relationships can be defined:

```yaml
custom_relationships:
  - id: SUPERSEDES
    meaning: "This document replaces an older version"
    inverse: SUPERSEDED_BY
```

## AI Instruction on Extensions

Use extensions sparingly. Before creating a custom type, verify that the need cannot be met by one of the five canonical types with additional metadata. The test: does the custom type perform a fundamentally different *mental operation* on the reader? If not — if it's the same operation with domain-specific content — it's a variant, not a new type.
