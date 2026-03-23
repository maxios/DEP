---
dep:
  type: reference
  audience: [ai-generator, ai-agent, human-author]
  owner: "@dep-core"
  created: 2026-03-23T21:49:13+02:00
  last_verified: 2026-03-24T00:00:00+02:00
  confidence: high
  depends_on: [seed.md]
  tags: [types, decision-record, validation, structure]
  links:
    - target: ./document-type-signatures.md
      rel: REQUIRES
---

# Type Signature: Decision Record

**Mental operation**: Preserve the reasoning behind a choice.

**Reader's question**: "Why was X chosen over Y?"

## Required Patterns

| Pattern | Description |
|---------|-------------|
| Context | The situation and constraints at the time of the decision |
| Decision statement | What was decided — clear and unambiguous |
| Alternatives considered | Each alternative with reasons for rejection |
| Consequences | What this decision enables and constrains going forward |
| Review trigger | Condition under which this decision should be revisited |

## Violation Patterns (Contamination)

| Pattern | Correct Location |
|---------|-----------------|
| Implementation procedures | How-To document |
| API references | Reference document |
| Tutorials or learning sequences | Tutorial |
| Exhaustive technical specs | Reference document |

## Structural Template

```markdown
# DR-[NNN]: [Decision Title]

## Status
[Accepted | Superseded | Under Review]

## Context
[The situation, constraints, and forces at play]

## Decision
[What was decided]

## Alternatives Considered

### [Alternative A]
[Description and reason for rejection]

### [Alternative B]
[Description and reason for rejection]

## Consequences
[What this enables and constrains]

## Review Trigger
[Condition under which to revisit this decision]

## Participants
- [Person/team involved]
```
