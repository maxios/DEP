---
dap:
  id: generate-doc-set
  version: 1
  trigger: "generate documentation for a new system or domain"
  trigger_patterns:
    - "generate documentation"
    - "document a new system"
    - "bootstrap DEP for *"
    - intent: generate_docs
  audience: [ai-generator]
  owner: "@dep-core"
  created: 2026-04-25T14:00:00+02:00
  last_verified: 2026-04-25T14:00:00+02:00
  confidence: high
  depends_on:
    - dep://docs/tutorials/bootstrap-dep-for-your-project.md
    - dep://docs/how-to/generate-a-document-set.md
    - dep://docs/explanation/bootstrap-sequence.md
    - dep://docs/reference/docspec-schema.md
  tags: [generation, bootstrap, authoring]
  entry_node: check-docspec
---

# Generate DEP Document Set

Follow the DEP bootstrap sequence to generate documentation for a system. Includes human gates at each critical checkpoint.

## check-docspec [?]

Check if a .docspec configuration already exists.

- **method**: eval
- **expr**: "file_exists('.docspec')"
- **outputs**: has_docspec
- **next**: decide-bootstrap

## decide-bootstrap [>]

| condition | next |
| --- | --- |
| `has_docspec == true` | load-existing-config |
| `_otherwise` | model-audiences |

## model-audiences [?]

No .docspec exists. Start the bootstrap sequence by modeling audiences.

- **method**: prompt
- **prompt**: "Who interacts with this system? Identify at least 2 audience personas as (mind-state + goal) pairs. For each: ID, goal, context (what they know), entry point, vocabulary level, time budget."
- **outputs**: audience_models
- **next**: gate-audiences

## gate-audiences [?]

Present the audience model for human approval before proceeding.

- **method**: gate
- **prompt**: "Proposed audiences: {{ audience_models }}. These define who the documentation serves. Each audience gets their own entry point and learning path. Approve?"
- **options**: approve, revise
- **outputs**: audience_approval
- **next**: decide-audience-approval

## decide-audience-approval [>]

| condition | next |
| --- | --- |
| `audience_approval == "approve"` | create-docspec |
| `_otherwise` | model-audiences |

## create-docspec [!]

Generate the .docspec configuration file.

- **action_type**: document
- **ref**: dep://docs/reference/docspec-schema.md
- **summary**: Create .docspec with: project name/description, docs_root, audiences array, directory_map (tutorials, how-to, reference, explanation, decision-records), governance settings (ownership_strategy, review_cadence per type, fallback_owner).
- **on_success**: plan-document-set
- **on_failure**: present-error

## load-existing-config [?]

.docspec exists. Load it to understand the project setup.

- **method**: tool_call
- **tool**: dep_graph
- **args**: { "flags": "--json" }
- **outputs**: existing_graph, existing_doc_count
- **next**: decide-generation-scope

## decide-generation-scope [>]

| condition | next |
| --- | --- |
| `existing_doc_count == 0` | plan-document-set |
| `_otherwise` | plan-incremental |

## plan-document-set [?]

Plan the full set of documents to generate. Follow dependency order.

- **method**: prompt
- **prompt**: "Based on the system and audiences, plan the document set. For each document: title, type, audience, and any REQUIRES dependencies. Start with entry points, then tutorials, then supporting references and explanations."
- **outputs**: document_plan
- **next**: gate-plan

## plan-incremental [?]

Documents already exist. Plan additions/updates.

- **method**: prompt
- **prompt**: "{{ existing_doc_count }} documents already exist. What new documents are needed? Check for gaps: missing reference entries, unserved audiences, undocumented decisions."
- **outputs**: document_plan
- **next**: gate-plan

## gate-plan [?]

Present the document plan for human approval.

- **method**: gate
- **prompt**: "Document generation plan: {{ document_plan }}. Documents will be generated in dependency order (REQUIRES chain). Approve?"
- **options**: approve, revise, cancel
- **outputs**: plan_approval
- **next**: decide-plan-approval

## decide-plan-approval [>]

| condition | next |
| --- | --- |
| `plan_approval == "approve"` | generate-documents |
| `plan_approval == "revise"` | plan-document-set |
| `_otherwise` | report-cancelled |

## generate-documents [!]

Generate all planned documents following the bootstrap sequence.

- **action_type**: document
- **ref**: dep://docs/how-to/generate-a-document-set.md
- **summary**: Generate documents in dependency order. For each: (1) Create file with dep: frontmatter. (2) Set metadata via `dep set`. (3) Write content following type signature. (4) Add links via `dep link`. (5) Validate via `dep validate`.
- **on_success**: validate-generated
- **on_failure**: present-error

## validate-generated [?]

Run validation on the complete generated set.

- **method**: tool_call
- **tool**: dep_validate
- **args**: { "flags": "--json" }
- **outputs**: validation_result, final_fail_count
- **next**: assess-generation

## assess-generation [>]

| condition | next |
| --- | --- |
| `final_fail_count == 0` | gate-final-review |
| `_otherwise` | delegate-fix |

## delegate-fix [@]

Validation failures in generated docs. Delegate to the validate-and-fix tree.

- **delegate_to**: dap://validate-and-fix.md
- **pass_context**: { "validation_result": "{{ validation_result }}" }
- **on_return**: validate-generated

## gate-final-review [?]

All documents pass validation. Present for final human review.

- **method**: gate
- **prompt**: "Generation complete. All documents pass validation. Please review the generated documentation for accuracy and completeness."
- **options**: accept, needs-edits
- **outputs**: final_review
- **next**: decide-final

## decide-final [>]

| condition | next |
| --- | --- |
| `final_review == "accept"` | report-complete |
| `_otherwise` | report-needs-edits |

## report-complete [!]

Documentation generation succeeded.

- **action_type**: intent
- **intent**: report_success
- **params**: { "message": "Documentation set generated and validated successfully." }
- **terminal**: true

## report-needs-edits [!]

Documentation needs human edits before finalizing.

- **action_type**: intent
- **intent**: present_report
- **params**: { "report": "Documentation generated and validated, but needs manual edits. Run `dep validate` after edits to confirm compliance." }
- **terminal**: true

## report-cancelled [!]

Generation cancelled by user.

- **action_type**: intent
- **intent**: report_success
- **params**: { "message": "Documentation generation cancelled." }
- **terminal**: true

## present-error [!]

An error occurred during generation.

- **action_type**: intent
- **intent**: escalate
- **params**: { "reason": "Error during document generation. Manual intervention needed." }
- **terminal**: true
