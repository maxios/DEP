---
dap:
  id: audit-existing-docs
  version: 1
  trigger: "migrate existing documentation to DEP compliance"
  trigger_patterns:
    - "audit documentation"
    - "migrate docs to DEP"
    - "retrofit DEP"
    - intent: audit_docs
  audience: [ai-agent, ai-generator, project-lead]
  owner: "@dep-core"
  created: 2026-04-25T14:00:00+02:00
  last_verified: 2026-04-25T14:00:00+02:00
  confidence: high
  depends_on:
    - dep://docs/explanation/anti-patterns.md
    - dep://docs/reference/dep-metadata-schema.md
    - dep://docs/reference/document-type-signatures.md
    - dep://docs/explanation/why-type-purity-matters.md
  tags: [audit, migration, retrofit, compliance]
  entry_node: inventory-docs
---

# Audit Existing Documentation

Analyze unstructured documentation and produce a DEP migration plan.

## inventory-docs [?]

Catalog all existing documentation files.

- **method**: tool_call
- **tool**: find_docs
- **args**: { "patterns": ["**/*.md", "**/*.rst", "**/*.txt"], "exclude": ["node_modules", ".git"] }
- **outputs**: doc_inventory, total_docs, has_existing_metadata
- **next**: assess-scope

## assess-scope [>]

Route based on the size and state of existing documentation.

| condition | next |
| --- | --- |
| `total_docs == 0` | no-docs-found |
| `total_docs <= 10` | classify-all |
| `total_docs > 10` | gate-scope |
| `_otherwise` | classify-all |

## no-docs-found [!]

No existing documentation found. Redirect to generation.

- **action_type**: intent
- **intent**: present_report
- **params**: { "report": "No existing documentation found. Use the generate-doc-set tree to create documentation from scratch." }
- **terminal**: true

## gate-scope [?]

Large documentation set. Confirm scope with human.

- **method**: gate
- **prompt**: "Found {{ total_docs }} documents to audit. Audit all at once, or start with a subset?"
- **options**: audit-all, pick-subset
- **outputs**: scope_decision
- **next**: decide-scope

## decide-scope [>]

| condition | next |
| --- | --- |
| `scope_decision == "audit-all"` | classify-all |
| `_otherwise` | pick-subset |

## pick-subset [?]

Let the human choose which documents to audit first.

- **method**: prompt
- **prompt**: "Which documents or directories should we audit first? List paths or patterns."
- **outputs**: doc_inventory
- **next**: classify-all

## classify-all [?]

Classify each document by probable DEP type based on content analysis.

- **method**: tool_call
- **tool**: analyze_content
- **args**: { "docs": "{{ doc_inventory }}" }
- **outputs**: classifications, contaminated_docs, contamination_count
- **next**: gate-classifications

## gate-classifications [?]

Present type classifications for human review.

- **method**: gate
- **prompt**: "Classification results: {{ classifications }}. {{ contamination_count }} documents have type contamination (mixed mental operations). Review and confirm?"
- **options**: approve, adjust
- **outputs**: classification_approval
- **next**: decide-classification

## decide-classification [>]

| condition | next |
| --- | --- |
| `classification_approval == "approve"` | check-contamination |
| `_otherwise` | classify-all |

## check-contamination [>]

Route based on contamination severity.

| condition | next |
| --- | --- |
| `contamination_count == 0` | analyze-gaps |
| `contamination_count > 0` | plan-extractions |
| `_otherwise` | analyze-gaps |

## plan-extractions [!]

Plan content extractions for contaminated documents.

- **action_type**: document
- **ref**: dep://docs/explanation/why-type-purity-matters.md
- **summary**: For each contaminated document, identify the contaminating sections. Plan extraction into new documents of the correct type, replacing contamination with cross-reference links. Apply the Lifecycle Independence Test.
- **on_success**: analyze-gaps
- **on_failure**: present-migration-plan

## analyze-gaps [?]

Identify gaps in documentation coverage.

- **method**: tool_call
- **tool**: dep_validate
- **args**: { "flags": "--json" }
- **outputs**: gap_analysis, missing_refs, orphan_count, audience_gaps
- **next**: compile-migration-plan

## compile-migration-plan [?]

Compile the full migration plan from all analysis.

- **method**: eval
- **expr**: "compile(classifications, contamination, gaps)"
- **outputs**: migration_plan, migration_phases, estimated_changes
- **next**: gate-migration-plan

## gate-migration-plan [?]

Present the complete migration plan for human approval.

- **method**: gate
- **prompt**: "Migration plan: {{ migration_phases }} phases, {{ estimated_changes }} changes. Phase 1: Add metadata. Phase 2: Extract contamination. Phase 3: Fill gaps. Phase 4: Build graph links. Phase 5: Set governance. Approve?"
- **options**: approve, revise, cancel
- **outputs**: migration_approval
- **next**: decide-migration

## decide-migration [>]

| condition | next |
| --- | --- |
| `migration_approval == "approve"` | execute-migration |
| `migration_approval == "revise"` | compile-migration-plan |
| `_otherwise` | report-cancelled |

## execute-migration [!]

Execute the approved migration plan.

- **action_type**: document
- **ref**: dep://docs/reference/dep-metadata-schema.md
- **summary**: Execute migration in phases. Phase 1: Add dep: frontmatter to all classified documents using `dep set`. Phase 2: Extract contaminated sections into new typed documents. Phase 3: Generate missing documents for identified gaps. Phase 4: Add typed links using `dep link`. Phase 5: Configure governance via .docspec.
- **on_success**: validate-migration
- **on_failure**: present-migration-plan

## validate-migration [?]

Validate the migrated documentation set.

- **method**: tool_call
- **tool**: dep_validate
- **args**: { "flags": "--json" }
- **outputs**: post_migration_result, post_fail_count
- **next**: assess-migration

## assess-migration [>]

| condition | next |
| --- | --- |
| `post_fail_count == 0` | report-success |
| `_otherwise` | delegate-fix |

## delegate-fix [@]

Post-migration validation failures. Delegate to validate-and-fix.

- **delegate_to**: dap://validate-and-fix.md
- **pass_context**: { "validation_result": "{{ post_migration_result }}" }
- **on_return**: validate-migration

## report-success [!]

Migration completed successfully.

- **action_type**: intent
- **intent**: report_success
- **params**: { "message": "Documentation migration complete. All documents DEP-compliant." }
- **terminal**: true

## present-migration-plan [!]

Present the plan for manual execution.

- **action_type**: intent
- **intent**: present_report
- **params**: { "report": "Migration plan compiled. {{ migration_phases }} phases, {{ estimated_changes }} changes. Execute manually or re-run with adjustments." }
- **terminal**: true

## report-cancelled [!]

Migration cancelled by user.

- **action_type**: intent
- **intent**: report_success
- **params**: { "message": "Documentation audit complete. Migration cancelled." }
- **terminal**: true
