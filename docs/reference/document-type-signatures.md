---
dep:
  type: reference
  audience: [ai-generator, ai-agent, human-author]
  owner: "@dep-core"
  created: 2026-03-22
  last_verified: 2026-03-22
  confidence: high
  depends_on: [seed.md]
  tags: [types, validation, structure]
  links: []
---

# Document Type Signatures Reference

Each DEP document type has a **type signature**: required structural patterns that MUST be present, and violation patterns that MUST NOT be present. This reference defines the complete signature for each type.

---

## Tutorial

**Mental operation**: Construct a new mental model through guided experience.

**Reader's question**: "Teach me."

### Required Patterns

| Pattern | Description |
|---------|-------------|
| Prerequisites | What the reader must have/know before starting |
| Learning objective | What the reader will be able to do after completing |
| Sequential steps | Numbered steps the reader follows in order |
| Expected output | What the reader should see/have after each major step |
| Completion summary | "What you built" recap at the end |

### Violation Patterns (Contamination)

| Pattern | Correct Location |
|---------|-----------------|
| Exhaustive parameter lists | Reference document |
| Alternative approaches | Explanation document |
| Architectural justification | Explanation or Decision Record |
| Troubleshooting tables | How-To document |

### Structural Template

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

---

## How-To

**Mental operation**: Enable execution of a known task.

**Reader's question**: "Help me do X."

### Required Patterns

| Pattern | Description |
|---------|-------------|
| Goal statement | One sentence: what the reader will accomplish |
| Prerequisites | What must be true before starting |
| Action steps | Numbered steps — imperative voice, minimal explanation |
| Verification | How to confirm the task succeeded |

### Violation Patterns (Contamination)

| Pattern | Correct Location |
|---------|-----------------|
| Teaching asides ("let's understand why...") | Tutorial or Explanation |
| Exhaustive reference tables | Reference document |
| Historical context | Explanation or Decision Record |
| Multiple approaches side-by-side | Explanation document |

### Structural Template

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

---

## Reference

**Mental operation**: Provide precise lookup of specific facts.

**Reader's question**: "What is the exact value of X?"

### Required Patterns

| Pattern | Description |
|---------|-------------|
| Consistent entry structure | Every entry follows the same format |
| Complete listings | All parameters, fields, endpoints, or properties — no gaps |
| Type information | Data types, formats, constraints for every field |
| Defaults | Default values where applicable |

### Violation Patterns (Contamination)

| Pattern | Correct Location |
|---------|-----------------|
| Narrative paragraphs (> 2 sentences) | Explanation document |
| Step-by-step procedures | How-To or Tutorial |
| Opinions or recommendations | Explanation or Decision Record |
| "Getting started" sections | Tutorial |

### Structural Template

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

---

## Explanation

**Mental operation**: Reshape or deepen an existing mental model.

**Reader's question**: "Why is it this way?"

### Required Patterns

| Pattern | Description |
|---------|-------------|
| Context-setting | Establishes what the reader already knows and where this explanation begins |
| Conceptual narrative | Prose that builds understanding progressively |
| Tradeoffs or alternatives | Discussion of what else could have been done and why this approach was chosen |

### Violation Patterns (Contamination)

| Pattern | Correct Location |
|---------|-----------------|
| Procedural steps | How-To or Tutorial |
| Parameter tables | Reference document |
| Sequential instructions | Tutorial |
| Exhaustive listings | Reference document |

### Structural Template

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

---

## Decision Record

**Mental operation**: Preserve the reasoning behind a choice.

**Reader's question**: "Why was X chosen over Y?"

### Required Patterns

| Pattern | Description |
|---------|-------------|
| Context | The situation and constraints at the time of the decision |
| Decision statement | What was decided — clear and unambiguous |
| Alternatives considered | Each alternative with reasons for rejection |
| Consequences | What this decision enables and constrains going forward |
| Review trigger | Condition under which this decision should be revisited |

### Violation Patterns (Contamination)

| Pattern | Correct Location |
|---------|-----------------|
| Implementation procedures | How-To document |
| API references | Reference document |
| Tutorials or learning sequences | Tutorial |
| Exhaustive technical specs | Reference document |

### Structural Template

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

---

## Type Purity Test

A document passes the type purity test if:

1. All required patterns for its declared type are present.
2. No violation patterns for its declared type are present.
3. A reader can predict the document's structure from its type alone.

If a document fails this test, it is **contaminated**. The fix is always **extraction**: move the contaminating content to a new document of the correct type, and replace it with a cross-reference link.
