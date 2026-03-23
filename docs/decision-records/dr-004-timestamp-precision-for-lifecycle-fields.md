---
dep:
  type: decision-record
  audience: [ai-generator, ai-agent, human-author]
  owner: "@dep-core"
  created: 2026-03-23T21:49:13+02:00
  last_verified: 2026-03-23T21:49:13+02:00
  confidence: high
  depends_on: [seed.md, docs/reference/dep-metadata-schema.md]
  tags: [metadata, lifecycle, timestamps, precision]
  links:
    - target: ../reference/dep-metadata-schema.md
      rel: DECIDES
    - target: ./dr-003-standard-frontmatter-and-explicit-links.md
      rel: REQUIRES
---

# DR-004: Timestamp Precision for Lifecycle Fields

## Status

Accepted

## Context

DEP's `created` and `last_verified` fields originally used date-only format (`YYYY-MM-DD`). This worked during initial development when docs and code were created on different calendar days. However, as the project matured, a gap emerged:

**The same-day blindness problem.** When a document is verified at 09:00 and code changes land at 14:00 on the same day, both resolve to `2026-03-23`. The `/dep-sync` skill — which compares git commit timestamps against `last_verified` — cannot detect that the document is stale. The doc appears fresh because the date matches, even though the code changed hours after verification.

This became apparent during the first `/dep-sync` run: bootstrap docs were created on 2026-03-22 at 23:36, and the CLI was added on 2026-03-23 at 20:12. While these fell on different calendar days (and were caught), the pattern would fail for same-day changes — a common scenario during active development.

Git commits have second-precision timestamps. DEP's lifecycle fields had day-precision. This mismatch made precise staleness detection impossible.

## Decision

Switch `created` and `last_verified` from date-only (`YYYY-MM-DD`) to full ISO 8601 datetime with timezone offset (`YYYY-MM-DDTHH:MM:SS±HH:MM`).

Examples:
- Before: `last_verified: 2026-03-23`
- After: `last_verified: 2026-03-23T21:49:13+02:00`

The timezone offset is mandatory — it prevents ambiguity when collaborators work across time zones and enables direct comparison with git's `%aI` format.

## Alternatives Considered

### Alt A: Keep date-only, compare via git commit SHAs

Track the last-synced git commit SHA in each document's metadata (e.g., `last_synced_commit: abc1234`). Staleness is detected by checking if any commits affecting dependencies landed after that SHA.

**Rejected because**: This adds a new metadata field, requires git access for every staleness check, and conflates two concerns. The `last_verified` field already exists for this purpose — it just needed more precision. SHA-based tracking also breaks when rebasing or amending commits, while timestamps are stable.

### Alt B: Keep date-only, treat same-day as potentially stale

When `last_verified` equals the commit date, flag it for review rather than assuming freshness.

**Rejected because**: This produces false positives. If a doc is verified at 18:00 and an unrelated commit lands at 09:00 the same day, the doc would be flagged despite being fresh. Over-flagging erodes trust in the sync process and creates review fatigue.

### Alt C: Use Unix timestamps

Store seconds-since-epoch for maximum precision and simplest comparison.

**Rejected because**: Unix timestamps are not human-readable. A core DEP principle is that metadata should be meaningful to human readers without tooling. `2026-03-23T21:49:13+02:00` is immediately understandable; `1774572553` is not.

## Consequences

**Enables**:
- Precise same-day staleness detection in `/dep-sync`
- Direct comparison between git commit timestamps (`%aI`) and doc `last_verified` values
- Timezone-aware lifecycle tracking for distributed teams
- The CLI's `computeLifecycle()` function requires no changes — `new Date()` already parses ISO 8601 timestamps

**Constrains**:
- All existing documents must be migrated from `YYYY-MM-DD` to full timestamp (one-time cost, done in this commit)
- Authors must provide timestamps when creating documents (mitigated by tooling: the `dep index` command and `/dep-generate` skill auto-populate timestamps)
- Slightly more verbose frontmatter (29 chars vs 10 chars per date field)

## Review Trigger

Revisit if timestamp precision causes friction in manual authoring workflows, or if a simpler format proves sufficient for staleness detection accuracy.

## Participants

- @dep-core
