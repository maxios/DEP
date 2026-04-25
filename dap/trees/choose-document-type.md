---
dap:
  id: choose-document-type
  version: 1
  trigger: "determine what type a DEP document should be"
  trigger_patterns:
    - "what type should this document be"
    - "choose document type"
    - intent: classify_document
  audience: [ai-generator, human-author]
  owner: "@dep-core"
  created: 2026-04-25T14:00:00+02:00
  last_verified: 2026-04-25T14:00:00+02:00
  confidence: high
  depends_on:
    - dep://docs/reference/document-type-signatures.md
    - dep://docs/reference/type-signature-tutorial.md
    - dep://docs/reference/type-signature-howto.md
    - dep://docs/reference/type-signature-reference.md
    - dep://docs/reference/type-signature-explanation.md
    - dep://docs/reference/type-signature-decision-record.md
    - dep://docs/explanation/why-type-purity-matters.md
  tags: [authoring, type-purity, classification]
  entry_node: identify-reader-question
---

# Choose Document Type

Classify content into the correct DEP document type based on what mental operation the reader needs.

## identify-reader-question [?]

Determine what question the reader is asking when they reach this document.

- **method**: prompt
- **prompt**: "What is the reader trying to do? (a) Learn something new through guided steps, (b) Execute a known task, (c) Look up a specific fact/value, (d) Understand why something works the way it does, (e) Understand why a decision was made"
- **outputs**: reader_intent
- **next**: classify-type

## classify-type [>]

Map the reader's intent to a document type.

| condition | next |
| --- | --- |
| `reader_intent == "a"` | recommend-tutorial |
| `reader_intent == "b"` | recommend-howto |
| `reader_intent == "c"` | recommend-reference |
| `reader_intent == "d"` | recommend-explanation |
| `reader_intent == "e"` | recommend-decision-record |
| `_otherwise` | ask-clarification |

## recommend-tutorial [?]

Tutorial: "Teach me" -- construct a new mental model through guided experience.

- **method**: gate
- **prompt**: "Recommended type: TUTORIAL. Reader doesn't yet know what questions to ask. Document must contain: sequential steps, prerequisites, expected outputs, 'what you built' summary. Confirm?"
- **options**: confirm, reconsider
- **outputs**: confirmation
- **next**: decide-tutorial-confirm

## decide-tutorial-confirm [>]

| condition | next |
| --- | --- |
| `confirmation == "confirm"` | apply-tutorial |
| `_otherwise` | identify-reader-question |

## apply-tutorial [!]

Apply the tutorial type signature.

- **action_type**: document
- **ref**: dep://docs/reference/type-signature-tutorial.md
- **summary**: Follow the tutorial type signature. Required: sequential steps, prerequisites, expected outputs after each step, "what you built" summary. Violations: exhaustive parameter lists, alternative approaches, architectural justification.
- **terminal**: true

## recommend-howto [?]

How-To: "Help me do X" -- enable execution of a known task.

- **method**: gate
- **prompt**: "Recommended type: HOW-TO. Reader knows what they want, needs steps. Document must contain: goal statement, action steps, verification step. Confirm?"
- **options**: confirm, reconsider
- **outputs**: confirmation
- **next**: decide-howto-confirm

## decide-howto-confirm [>]

| condition | next |
| --- | --- |
| `confirmation == "confirm"` | apply-howto |
| `_otherwise` | identify-reader-question |

## apply-howto [!]

Apply the how-to type signature.

- **action_type**: document
- **ref**: dep://docs/reference/type-signature-howto.md
- **summary**: Follow the how-to type signature. Required: goal statement, action steps, verification step. Violations: teaching asides, exhaustive reference tables, historical context.
- **terminal**: true

## recommend-reference [?]

Reference: "What is the exact value?" -- provide precise lookup.

- **method**: gate
- **prompt**: "Recommended type: REFERENCE. Reader knows what they're looking for, needs exact values. Document must contain: consistent entry structure, complete listings, type info, defaults, constraints. Confirm?"
- **options**: confirm, reconsider
- **outputs**: confirmation
- **next**: decide-reference-confirm

## decide-reference-confirm [>]

| condition | next |
| --- | --- |
| `confirmation == "confirm"` | apply-reference |
| `_otherwise` | identify-reader-question |

## apply-reference [!]

Apply the reference type signature.

- **action_type**: document
- **ref**: dep://docs/reference/type-signature-reference.md
- **summary**: Follow the reference type signature. Required: consistent entry structure, complete listings, type information, defaults, constraints. Violations: narrative paragraphs, step-by-step procedures, opinions.
- **terminal**: true

## recommend-explanation [?]

Explanation: "Why is it this way?" -- reshape or deepen understanding.

- **method**: gate
- **prompt**: "Recommended type: EXPLANATION. Reader has experience, seeks understanding. Document must contain: context-setting, conceptual narrative, tradeoffs/alternatives. Confirm?"
- **options**: confirm, reconsider
- **outputs**: confirmation
- **next**: decide-explanation-confirm

## decide-explanation-confirm [>]

| condition | next |
| --- | --- |
| `confirmation == "confirm"` | apply-explanation |
| `_otherwise` | identify-reader-question |

## apply-explanation [!]

Apply the explanation type signature.

- **action_type**: document
- **ref**: dep://docs/reference/type-signature-explanation.md
- **summary**: Follow the explanation type signature. Required: context-setting, conceptual narrative, tradeoffs or alternatives. Violations: procedural steps, parameter tables, sequential instructions.
- **terminal**: true

## recommend-decision-record [?]

Decision Record: "Why was X chosen over Y?" -- preserve reasoning.

- **method**: gate
- **prompt**: "Recommended type: DECISION RECORD. Reader needs to understand or revisit a past decision. Document must contain: context, decision statement, alternatives with rejections, consequences, review trigger. Confirm?"
- **options**: confirm, reconsider
- **outputs**: confirmation
- **next**: decide-dr-confirm

## decide-dr-confirm [>]

| condition | next |
| --- | --- |
| `confirmation == "confirm"` | apply-decision-record |
| `_otherwise` | identify-reader-question |

## apply-decision-record [!]

Apply the decision-record type signature.

- **action_type**: document
- **ref**: dep://docs/reference/type-signature-decision-record.md
- **summary**: Follow the decision-record type signature. Required: context, decision statement, alternatives considered with reasons for rejection, consequences, review trigger.
- **terminal**: true

## ask-clarification [?]

Unable to classify from the initial answer. Gather more detail.

- **method**: prompt
- **prompt**: "Could you describe the content more specifically? What will the reader DO with this information?"
- **outputs**: reader_intent
- **next**: classify-type
