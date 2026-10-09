---
dep:
  type: how-to
  audience:
    - project-lead
    - human-author
  owner: "@dep-core"
  created: 2026-03-23T14:00:00+02:00
  last_verified: 2026-10-09T08:19:31.407+03:00
  confidence: high
  depends_on:
    - docs/reference/docspec-schema.md
    - cli/src/graph.ts
  tags:
    - governance
    - configuration
    - docspec
  links:
    - target: ../reference/docspec-schema.md
      rel: USES
---

# How-To: Configure Governance

**Goal**: Set up ownership, review cadences, and lifecycle rules in your `.docspec` file so documentation stays fresh and accountable.

## Prerequisites

- A `.docspec` file at the project root (see [Bootstrap DEP for Your Project](../tutorials/bootstrap-dep-for-your-project.md) to create one)
- Knowledge of your team's documentation ownership model

## Steps

1. Open your `.docspec` file and locate the `governance` section.

2. Choose an ownership strategy:

   | Strategy | When to use |
   |----------|-------------|
   | `per-document` | Each doc has an individual owner (best for small teams) |
   | `per-directory` | One owner per directory/type (best for medium teams) |
   | `per-component` | Owners map to system components (best for large teams) |

   ```yaml
   governance:
     ownership_strategy: per-document
   ```

3. Set a fallback owner — the person or team who inherits ownership when an owner departs:

   ```yaml
     fallback_owner: "@your-team"
   ```

4. Configure review cadences (in days) for each document type. More volatile types need shorter cadences:

   ```yaml
     review_cadence:
       tutorial: 90
       how-to: 60
       reference: 30
       explanation: 180
       decision-record: 365
   ```

   Adjust based on your project's rate of change. A fast-moving API might need `reference: 14`.

5. Save the `.docspec` file and run validation to see each document's lifecycle under the new cadences:

   ```bash
   dep validate --root .
   ```

   A type with no `review_cadence` entry (for example a custom type) uses 90 days.

6. Use `/dep-sync` periodically to identify documents that have exceeded their review cadence.

## Verification

Run `dep graph --root .` and check the lifecycle markers (● FRESH, ◐ AGING, ○ STALE), or `dep query --lifecycle STALE --root .`. Documents show FRESH right after verification; a document becomes AGING once its type's cadence elapses and STALE after twice the cadence.

## Related

- [.docspec Schema](../reference/docspec-schema.md) — full configuration reference
- [DEP Skills API](../reference/dep-skills-api.md) — `/dep-sync` for ongoing freshness checks
