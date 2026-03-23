---
dep:
  type: reference
  audience: [ai-generator, ai-agent, project-lead]
  owner: "@dep-core"
  created: 2026-03-22T23:36:54+02:00
  last_verified: 2026-03-24T00:00:00+02:00
  confidence: high
  depends_on: [seed.md, .docspec]
  tags: [docspec, configuration, schema]
  links: []
---

# .docspec Schema Reference

The `.docspec` file is the machine-readable root configuration for a DEP documentation system. This reference defines every field.

---

## Top-Level Structure

```yaml
dep_version: <string>
project: <ProjectConfig>
audiences: <AudienceConfig[]>
architecture: <ArchitectureConfig>
governance: <GovernanceConfig>
generation: <GenerationConfig>
custom_types: <CustomTypeConfig[]>        # optional
custom_relationships: <RelationshipConfig[]>  # optional
validation: <ValidationConfig>            # optional
```

---

## `dep_version`

| Property | Value |
|----------|-------|
| Type | `string` — semver |
| Required | Yes |
| Purpose | Declares which version of the DEP spec this file conforms to |
| Current | `"0.1.0"` |

---

## `project`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Human-readable project name |
| `docs_root` | `string` | Yes | Relative path to documentation root directory |
| `description` | `string` | No | One-line description of the documentation system |

---

## `audiences[]`

Each entry defines one audience persona.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Machine-readable identifier (kebab-case) |
| `name` | `string` | Yes | Human-readable name |
| `goal` | `string` | Yes | What this audience is trying to accomplish |
| `context` | `string` | Yes | What this audience already knows |
| `entry_point` | `string` | Yes | Relative path to their starting document |
| `vocabulary_level` | `enum` | Yes | `non-technical`, `intermediate`, `advanced`, `expert` |
| `time_budget` | `enum` | Yes | `deep`, `scanning`, `urgent` |
| `success_criteria` | `string` | Yes | Measurable outcome of successful documentation |

Minimum: 2 audience entries. If only 1 is defined, audience modeling is insufficient.

---

## `architecture`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `directory_map` | `object` | Yes | Maps each document type to a directory path |
| `require_index_files` | `boolean` | No | Whether each directory must have an index file (default: `true`) |
| `link_style` | `enum` | No | `relative` or `absolute` (default: `relative`) |

### `directory_map`

| Field | Type | Required |
|-------|------|----------|
| `tutorials` | `string` | Yes |
| `how-to` | `string` | Yes |
| `reference` | `string` | Yes |
| `explanation` | `string` | Yes |
| `decision-records` | `string` | Yes |

---

## `governance`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ownership_strategy` | `enum` | Yes | `per-document`, `per-directory`, `per-component` |
| `fallback_owner` | `string` | Yes | Default owner when a document's owner is unavailable |
| `review_cadence` | `object` | Yes | Days between required reviews, per document type |

### `review_cadence`

| Field | Type | Description |
|-------|------|-------------|
| `tutorial` | `integer` | Days between reviews for tutorials |
| `how-to` | `integer` | Days between reviews for how-to guides |
| `reference` | `integer` | Days between reviews for reference docs |
| `explanation` | `integer` | Days between reviews for explanations |
| `decision-record` | `integer` | Days between reviews for decision records |

Suggested defaults: tutorials 90, how-to 60, reference 30, explanation 180, decision-record 365.

---

## `generation`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ai_provider` | `enum` | Yes | `constrained` (AI generates within DEP rules) or `disabled` (human-only) |
| `require_human_review` | `boolean` | Yes | Whether AI-generated docs require human review before publishing |

---

## `custom_types[]` (Optional)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Machine-readable type identifier |
| `extends` | `string` | Yes | Which canonical type this extends |
| `additional_required_patterns` | `string[]` | Yes | Patterns required in addition to the parent type |

Example:
```yaml
custom_types:
  - id: runbook
    extends: how-to
    additional_required_patterns: [severity_classification, escalation_path, rollback_procedure]
```

---

## `custom_relationships[]` (Optional)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Relationship identifier (UPPER_SNAKE_CASE) |
| `meaning` | `string` | Yes | What this relationship means |
| `inverse` | `string` | No | The inverse relationship ID |

---

## `validation` (Optional)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `custom_rules` | `object[]` | No | List of custom validator paths |

Each entry: `{ path: "<relative path to validator script>" }`

---

## File Location

The `.docspec` file MUST be placed at the root of the project (same level as `docs_root`). There is exactly one `.docspec` per documentation system.
