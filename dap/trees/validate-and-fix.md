---
dap:
  id: validate-and-fix
  version: 1
  trigger: "validate DEP documentation and fix issues"
  trigger_patterns:
    - "validate documentation"
    - "check docs for issues"
    - "fix validation errors"
    - intent: validate_docs
  audience: [ai-agent, ai-generator]
  owner: "@dep-core"
  created: 2026-04-25T14:00:00+02:00
  last_verified: 2026-04-25T14:00:00+02:00
  confidence: high
  depends_on:
    - dep://docs/how-to/validate-a-document.md
    - dep://docs/how-to/add-dep-metadata.md
    - dep://docs/explanation/why-type-purity-matters.md
  tags: [validation, quality, maintenance]
  entry_node: run-validation
---

# Validate and Fix DEP Documentation

Run DEP validation, classify failures, and route to the appropriate fix.

## run-validation [?]

Run the DEP CLI validator to get a structured report.

- **method**: tool_call
- **tool**: dep_validate
- **args**: { "flags": "--json", "root": "." }
- **outputs**: validation_report, doc_failures, graph_failures, pass_count, fail_count, warn_count
- **next**: assess-results

## assess-results [>]

Route based on validation outcome.

| condition | next |
| --- | --- |
| `fail_count == 0 AND warn_count == 0` | report-clean |
| `fail_count == 0 AND warn_count > 0` | present-warnings |
| `fail_count > 0` | classify-failures |
| `_otherwise` | report-clean |

## report-clean [!]

All documents pass validation.

- **action_type**: intent
- **intent**: report_success
- **params**: { "message": "All {{ pass_count }} documents pass validation. No issues found." }
- **terminal**: true

## present-warnings [?]

Warnings found but no hard failures. Present for review.

- **method**: gate
- **prompt**: "{{ warn_count }} warnings found (likely lifecycle staleness). Review and fix, or acknowledge?"
- **options**: fix-warnings, acknowledge
- **outputs**: warning_decision
- **next**: decide-warning-action

## decide-warning-action [>]

| condition | next |
| --- | --- |
| `warning_decision == "fix-warnings"` | fix-lifecycle |
| `_otherwise` | report-clean |

## classify-failures [>]

Route the first failure type to its fix path.

| condition | next |
| --- | --- |
| `doc_failures contains "Metadata complete"` | fix-metadata |
| `doc_failures contains "Type valid"` | fix-type |
| `doc_failures contains "Audience valid"` | fix-audience |
| `doc_failures contains "Links resolve"` | fix-links |
| `doc_failures contains "Relationship types"` | fix-links |
| `graph_failures contains "orphans"` | fix-orphans |
| `graph_failures contains "cycles"` | fix-cycles |
| `_otherwise` | present-full-report |

## fix-metadata [!]

Documents have incomplete metadata. Follow the metadata how-to.

- **action_type**: document
- **ref**: dep://docs/how-to/add-dep-metadata.md
- **summary**: Add missing metadata fields (type, audience, owner, created, last_verified, confidence). Use `dep set <file> --<field> <value>` to set each field.
- **on_success**: run-validation
- **on_failure**: present-full-report

## fix-type [?]

Document has invalid or unrecognized type. Help choose the right one.

- **method**: gate
- **prompt**: "Document has invalid type. The five canonical types are: tutorial, how-to, reference, explanation, decision-record. Which type fits this document's mental operation?"
- **options**: tutorial, how-to, reference, explanation, decision-record
- **outputs**: correct_type
- **next**: apply-type-fix

## apply-type-fix [!]

Set the correct document type.

- **action_type**: tool_call
- **tool**: dep_set
- **args**: { "field": "type", "value": "{{ correct_type }}" }
- **on_success**: run-validation
- **on_failure**: present-full-report

## fix-audience [?]

Document references invalid audience IDs. Check .docspec for valid IDs.

- **method**: tool_call
- **tool**: dep_query
- **args**: { "flags": "--json" }
- **outputs**: valid_audiences
- **next**: present-audience-fix

## present-audience-fix [?]

Present valid audiences for selection.

- **method**: gate
- **prompt**: "Document has invalid audience. Valid audiences from .docspec: {{ valid_audiences }}. Which audiences should this document target?"
- **options**: select-audiences
- **outputs**: selected_audiences
- **next**: apply-audience-fix

## apply-audience-fix [!]

Set the correct audiences.

- **action_type**: tool_call
- **tool**: dep_set
- **args**: { "field": "audience", "value": "{{ selected_audiences }}" }
- **on_success**: run-validation
- **on_failure**: present-full-report

## fix-links [!]

Broken links or invalid relationship types. Repair cross-references.

- **action_type**: document
- **ref**: dep://docs/how-to/validate-a-document.md
- **summary**: Check each broken link. Either fix the target path or remove the link. Valid relationship types are TEACHES, USES, EXPLAINS, DECIDES, REQUIRES, NEXT. Use `dep link <file> --target <path> --rel <REL>` to manage links.
- **on_success**: run-validation
- **on_failure**: present-full-report

## fix-orphans [!]

Documents exist but are unreachable from any audience entry point.

- **action_type**: document
- **ref**: dep://docs/how-to/validate-a-document.md
- **summary**: Orphan documents need incoming links. Add a link from a parent document or index file using `dep link <parent> --target <orphan> --rel NEXT`. Or add the orphan to an index.md file.
- **on_success**: run-validation
- **on_failure**: present-full-report

## fix-cycles [!]

REQUIRES edges form a cycle, preventing valid prerequisite ordering.

- **action_type**: document
- **ref**: dep://docs/how-to/validate-a-document.md
- **summary**: Break the REQUIRES cycle by changing one REQUIRES link to NEXT or removing it. Use `dep link <file> --target <path> --rel REQUIRES --remove` then `dep link <file> --target <path> --rel NEXT`.
- **on_success**: run-validation
- **on_failure**: present-full-report

## fix-lifecycle [!]

Documents are stale (exceed review cadence). Bump last_verified after confirming accuracy.

- **action_type**: tool_call
- **tool**: dep_bump
- **args**: { "flags": "--all --lifecycle STALE" }
- **on_success**: run-validation
- **on_failure**: present-full-report

## present-full-report [!]

Multiple or complex failures. Present the full report for manual triage.

- **action_type**: intent
- **intent**: present_report
- **params**: { "report": "{{ validation_report }}" }
- **terminal**: true
