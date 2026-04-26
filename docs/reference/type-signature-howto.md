---
dep:
  type: reference
  audience:
    - ai-generator
    - ai-agent
    - human-author
  owner: "@dep-core"
  created: 2026-03-23T21:49:13+02:00
  last_verified: 2026-04-26T20:29:13.661+03:00
  confidence: high
  depends_on:
    - seed.md
  tags:
    - types
    - how-to
    - validation
    - structure
  links:
    - target: ./document-type-signatures.md
      rel: REQUIRES
---

# Type Signature: How-To

**Mental operation**: Enable execution of a known task.

**Reader's question**: "Help me do X."

## Required Patterns

| Pattern | Description |
|---------|-------------|
| Goal statement | One sentence: what the reader will accomplish |
| Prerequisites | What must be true before starting |
| Action steps | Numbered steps — imperative voice, minimal explanation |
| Verification | How to confirm the task succeeded |

## Violation Patterns (Contamination)

| Pattern | Correct Location |
|---------|-----------------|
| Teaching asides ("let's understand why...") | Tutorial or Explanation |
| Exhaustive reference tables | Reference document |
| Historical context | Explanation or Decision Record |
| Multiple approaches side-by-side | Explanation document |

## Structural Template

```markdown
# How-To: [Verb] [Object]

**Goal**: [One sentence — what you'll accomplish]

## Prerequisites
- [Prerequisite 1]

## Steps

1. [Action step]
2. [Action step]
3. [Action step]

## Verification

[How to confirm it worked]

## Related
- [Link to reference for details]
- [Link to explanation for context]
```
