---
dep:
  type: reference
  audience:
    - ai-generator
    - ai-agent
    - human-author
  owner: "@dep-core"
  created: 2026-03-23T21:49:13+02:00
  last_verified: 2026-04-26T20:29:13.749+03:00
  confidence: high
  depends_on:
    - seed.md
  tags:
    - types
    - explanation
    - validation
    - structure
  links:
    - target: ./document-type-signatures.md
      rel: REQUIRES
---

# Type Signature: Explanation

**Mental operation**: Reshape or deepen an existing mental model.

**Reader's question**: "Why is it this way?"

## Required Patterns

| Pattern | Description |
|---------|-------------|
| Context-setting | Establishes what the reader already knows and where this explanation begins |
| Conceptual narrative | Prose that builds understanding progressively |
| Tradeoffs or alternatives | Discussion of what else could have been done and why this approach was chosen |

## Violation Patterns (Contamination)

| Pattern | Correct Location |
|---------|-----------------|
| Procedural steps | How-To or Tutorial |
| Parameter tables | Reference document |
| Sequential instructions | Tutorial |
| Exhaustive listings | Reference document |

## Structural Template

```markdown
# [Why/How/What] [Topic]

## Context
[What the reader already knows; where this explanation starts]

## [Core Concept]
[Narrative explanation]

## [Second Concept or Deeper Layer]
[Narrative explanation]

## Tradeoffs
[What alternatives exist and why this approach was chosen]

## Related
- [Link to reference for specifics]
- [Link to decision record for the choice]
```
