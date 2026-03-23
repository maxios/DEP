---
dep:
  type: explanation
  audience: [ai-generator]
  owner: "@dep-core"
  created: 2026-03-23T21:49:13+02:00
  last_verified: 2026-03-24T00:00:00+02:00
  confidence: high
  depends_on: [seed.md]
  tags: [docspec, configuration, governance]
  links:
    - target: ../reference/docspec-schema.md
      rel: EXPLAINS
---

# The `.docspec` File

## The Abstraction

The `.docspec` file is the machine-readable root configuration for a documentation system. It encodes all five layers into a single file that tooling, AI generators, and validators consume.

Think of `.docspec` as the constitution of a documentation system. Individual documents are laws that must be consistent with the constitution. Validators are the judiciary. Generators are the legislature operating within constitutional constraints.

## Structure

```yaml
dep_version: "0.1.0"

project:
  name: "[System Name]"
  docs_root: "[Path to documentation root]"

audiences:
  - id: [machine-readable-id]
    name: "[Human-readable name]"
    goal: "[What this audience is trying to accomplish]"
    context: "[What this audience already knows]"
    entry_point: "[Path to their starting document]"
    vocabulary_level: [non-technical | intermediate | advanced | expert]
    time_budget: [deep | scanning | urgent]
    success_criteria: "[Measurable outcome of successful documentation]"

architecture:
  directory_map:
    tutorials: [path]
    how-to: [path]
    reference: [path]
    explanation: [path]
    decision-record: [path]
  require_index_files: true
  link_style: relative

governance:
  ownership_strategy: [per-document | per-directory | per-component]
  fallback_owner: "[Default owner]"
  review_cadence:
    tutorial: [days]
    how-to: [days]
    reference: [days]
    explanation: [days]
    decision-record: [days]

generation:
  ai_provider: [constrained | disabled]
  require_human_review: [true | false]
```

## AI Instruction

When asked to create documentation for any system:

1. **FIRST**: Generate the `.docspec` file. This forces you to define audiences, structure, and governance before writing a single document.
2. **SECOND**: Generate the root `index.md` that routes each audience to their entry point.
3. **THIRD**: Generate the entry point document for each audience.
4. **FOURTH**: Generate documents in dependency order — if Document B requires Document A, generate A first.
5. **LAST**: Run graph-level validation across the full set.

Never generate documents before the `.docspec` exists. The spec constrains everything downstream.
