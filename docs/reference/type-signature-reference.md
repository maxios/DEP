---
dep:
  type: reference
  audience:
    - ai-generator
    - ai-agent
    - human-author
  owner: "@dep-core"
  created: 2026-03-23T21:49:13+02:00
  last_verified: 2026-04-26T20:29:13.616+03:00
  confidence: high
  depends_on:
    - seed.md
  tags:
    - types
    - reference
    - validation
    - structure
  links:
    - target: ./document-type-signatures.md
      rel: REQUIRES
---

# Type Signature: Reference

**Mental operation**: Provide precise lookup of specific facts.

**Reader's question**: "What is the exact value of X?"

## Required Patterns

| Pattern | Description |
|---------|-------------|
| Consistent entry structure | Every entry follows the same format |
| Complete listings | All parameters, fields, endpoints, or properties — no gaps |
| Type information | Data types, formats, constraints for every field |
| Defaults | Default values where applicable |

## Violation Patterns (Contamination)

| Pattern | Correct Location |
|---------|-----------------|
| Narrative paragraphs (> 2 sentences) | Explanation document |
| Step-by-step procedures | How-To or Tutorial |
| Opinions or recommendations | Explanation or Decision Record |
| "Getting started" sections | Tutorial |

## Structural Template

```markdown
# [Subject] Reference

[One sentence: what this reference covers]

---

## [Entry 1]

| Property | Value |
|----------|-------|
| Type | ... |
| Required | ... |
| Default | ... |
| Description | ... |

## [Entry 2]

| Property | Value |
|----------|-------|
| Type | ... |
| Required | ... |
| Default | ... |
| Description | ... |
```
