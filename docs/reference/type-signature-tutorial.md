---
dep:
  type: reference
  audience: [ai-generator, ai-agent, human-author]
  owner: "@dep-core"
  created: 2026-03-23T21:49:13+02:00
  last_verified: 2026-03-23T21:49:13+02:00
  confidence: high
  depends_on: [seed.md]
  tags: [types, tutorial, validation, structure]
  links:
    - target: ./document-type-signatures.md
      rel: REQUIRES
---

# Type Signature: Tutorial

**Mental operation**: Construct a new mental model through guided experience.

**Reader's question**: "Teach me."

## Required Patterns

| Pattern | Description |
|---------|-------------|
| Prerequisites | What the reader must have/know before starting |
| Learning objective | What the reader will be able to do after completing |
| Sequential steps | Numbered steps the reader follows in order |
| Expected output | What the reader should see/have after each major step |
| Completion summary | "What you built" recap at the end |

## Violation Patterns (Contamination)

| Pattern | Correct Location |
|---------|-----------------|
| Exhaustive parameter lists | Reference document |
| Alternative approaches | Explanation document |
| Architectural justification | Explanation or Decision Record |
| Troubleshooting tables | How-To document |

## Structural Template

```markdown
# Tutorial: [Action Verb] [Outcome]

## Prerequisites
- [Prerequisite 1]
- [Prerequisite 2]

## What You'll Build
[One paragraph describing the end result]

## Steps

### Step 1 — [Action]
[Instructions]

**Expected result**: [What the reader should see]

### Step 2 — [Action]
[Instructions]

**Expected result**: [What the reader should see]

[... more steps ...]

## What You Built
[Summary of what was accomplished and what concepts were introduced]

## Next Steps
- [Link to next tutorial]
- [Link to relevant reference]
```
