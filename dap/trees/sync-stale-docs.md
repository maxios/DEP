---
dap:
  id: sync-stale-docs
  version: 1
  trigger: "documentation may be out of date after code changes"
  trigger_patterns:
    - "sync documentation"
    - "docs may be stale"
    - "update docs after changes"
    - intent: sync_docs
  audience: [ai-agent, ai-generator]
  owner: "@dep-core"
  created: 2026-04-25T14:00:00+02:00
  last_verified: 2026-04-25T14:00:00+02:00
  confidence: high
  depends_on:
    - dep://docs/how-to/configure-governance.md
  tags: [sync, freshness, lifecycle, maintenance]
  entry_node: check-staleness
---

# Sync Stale Documentation

Detect stale documents after code changes and route to the appropriate update strategy.

## check-staleness [?]

Query for stale and aging documents using the DEP CLI.

- **method**: tool_call
- **tool**: dep_query
- **args**: { "flags": "--lifecycle STALE --json" }
- **outputs**: stale_docs, stale_count
- **next**: check-aging

## check-aging [?]

Also check for aging documents approaching staleness.

- **method**: tool_call
- **tool**: dep_query
- **args**: { "flags": "--lifecycle AGING --json" }
- **outputs**: aging_docs, aging_count
- **next**: assess-freshness

## assess-freshness [>]

Route based on staleness severity.

| condition | next |
| --- | --- |
| `stale_count == 0 AND aging_count == 0` | report-fresh |
| `stale_count == 0 AND aging_count > 0` | report-aging-only |
| `stale_count > 0` | classify-staleness |
| `_otherwise` | report-fresh |

## report-fresh [!]

All documentation is fresh.

- **action_type**: intent
- **intent**: report_success
- **params**: { "message": "All documents are FRESH. No sync needed." }
- **terminal**: true

## report-aging-only [!]

No stale docs, but some approaching review deadline.

- **action_type**: intent
- **intent**: present_report
- **params**: { "report": "{{ aging_count }} documents are AGING (approaching review cadence). No action required yet, but review soon: {{ aging_docs }}" }
- **terminal**: true

## classify-staleness [?]

Check git history to determine WHY documents are stale.

- **method**: tool_call
- **tool**: git_log
- **args**: { "flags": "--since='60 days ago' --name-only --oneline" }
- **outputs**: changed_files, recent_changes
- **next**: determine-staleness-type

## determine-staleness-type [>]

Classify staleness cause.

| condition | next |
| --- | --- |
| `stale_docs depends_on intersects changed_files` | handle-dependency-stale |
| `stale_count > 5` | handle-bulk-stale |
| `_otherwise` | handle-time-stale |

## handle-dependency-stale [?]

Documents are stale because their dependencies changed. These need content review.

- **method**: gate
- **prompt**: "{{ stale_count }} documents are dependency-stale: their depends_on files changed in git. These likely need CONTENT updates, not just timestamp bumps. Review each one?"
- **options**: review-each, bulk-bump-anyway, skip
- **outputs**: dep_stale_decision
- **next**: decide-dep-stale-action

## decide-dep-stale-action [>]

| condition | next |
| --- | --- |
| `dep_stale_decision == "review-each"` | review-stale-content |
| `dep_stale_decision == "bulk-bump-anyway"` | bulk-bump-stale |
| `_otherwise` | report-skipped |

## review-stale-content [!]

Review each dependency-stale document individually.

- **action_type**: document
- **ref**: dep://docs/how-to/configure-governance.md
- **summary**: For each stale document: (1) Check what changed in its depends_on files. (2) Update the document content if needed. (3) Run `dep bump <file>` to mark as verified. (4) Adjust confidence if accuracy is uncertain.
- **terminal**: true

## handle-bulk-stale [?]

Many documents are stale. Present for bulk action.

- **method**: gate
- **prompt**: "{{ stale_count }} documents are stale. Bulk bump all to FRESH, or review individually?"
- **options**: bulk-bump, review-individually
- **outputs**: bulk_decision
- **next**: decide-bulk-action

## decide-bulk-action [>]

| condition | next |
| --- | --- |
| `bulk_decision == "bulk-bump"` | bulk-bump-stale |
| `_otherwise` | review-stale-content |

## handle-time-stale [?]

Documents are time-stale (exceeded review cadence but no dependency changes). Safe to bump after quick verification.

- **method**: gate
- **prompt**: "{{ stale_count }} documents exceeded their review cadence but have no dependency changes. Quick-verify and bump?"
- **options**: bump-all, review-first
- **outputs**: time_stale_decision
- **next**: decide-time-stale-action

## decide-time-stale-action [>]

| condition | next |
| --- | --- |
| `time_stale_decision == "bump-all"` | bulk-bump-stale |
| `_otherwise` | review-stale-content |

## bulk-bump-stale [!]

Bump all stale documents to FRESH.

- **action_type**: tool_call
- **tool**: dep_bump
- **args**: { "flags": "--all --lifecycle STALE" }
- **terminal**: true

## report-skipped [!]

User chose to skip sync.

- **action_type**: intent
- **intent**: report_success
- **params**: { "message": "Sync skipped. {{ stale_count }} documents remain STALE." }
- **terminal**: true
