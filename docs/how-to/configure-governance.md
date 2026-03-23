---
dep:
  type: how-to
  audience: [project-lead, human-author]
  owner: "@dep-core"
  created: 2026-03-23T14:00:00+02:00
  last_verified: 2026-03-24T00:00:00+02:00
  confidence: high
  depends_on: [docs/reference/docspec-schema.md]
  tags: [governance, configuration, docspec]
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

5. Save the `.docspec` file and run validation to confirm the configuration is valid:

   ```bash
   cd cli && bun run src/index.ts validate --root ..
   ```

6. Use `/dep-sync` periodically to identify documents that have exceeded their review cadence.

## Verification

Run `dep graph` and check the lifecycle states. Documents should show `FRESH` immediately after setting up governance. Over time, `AGING` and `STALE` states appear as review cadences elapse.

## Related

- [.docspec Schema](../reference/docspec-schema.md) — full configuration reference
- [DEP Skills API](../reference/dep-skills-api.md) — `/dep-sync` for ongoing freshness checks
