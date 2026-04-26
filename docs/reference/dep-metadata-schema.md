---
dep:
  type: reference
  audience:
    - ai-generator
    - ai-agent
    - human-author
  owner: "@dep-core"
  created: 2026-03-22T23:36:54+02:00
  last_verified: 2026-04-26T20:29:13.483+03:00
  confidence: high
  depends_on:
    - seed.md
  tags:
    - metadata
    - schema
    - reference
  links: []
---

# DEP Metadata Schema Reference

Every DEP-compliant document begins with a metadata block. This reference defines every field, its type, constraints, and defaults.

---

## Metadata Block Format

The metadata block uses standard YAML frontmatter at the very beginning of the file:

```yaml
---
dep:
  type: <type>
  audience: <audience_list>
  owner: <owner>
  created: <datetime>
  last_verified: <datetime>
  confidence: <level>
  depends_on: <dependency_list>
  tags: <tag_list>
  links: <link_list>
---
```

The frontmatter MUST be the first content in the file — no content may precede it. This ensures compatibility with standard markdown tooling (Obsidian, gray-matter, remark, MarkdownDB, etc.).

---

## Field Reference

### `type`

| Property | Value |
|----------|-------|
| Required | Yes |
| Type | `string` — enum |
| Values | `tutorial`, `how-to`, `reference`, `explanation`, `decision-record` |
| Purpose | Declares the single mental operation this document performs |

A document MUST have exactly one type. Custom types declared in `.docspec` via `custom_types` are also valid.

---

### `audience`

| Property | Value |
|----------|-------|
| Required | Yes |
| Type | `string[]` — list of audience IDs |
| Values | Must reference IDs defined in `.docspec` `audiences` section |
| Purpose | Declares which mind-state + goal pairs this document serves |

A document may serve multiple audiences only if the content does not require different vocabulary levels or depth for each. If audience needs diverge, split into separate documents.

---

### `owner`

| Property | Value |
|----------|-------|
| Required | Yes |
| Type | `string` |
| Format | `@username`, `@team-name`, or email |
| Purpose | The person or team accountable for this document's accuracy |

Ownership is not authorship. The owner ensures the document stays accurate over time. When an owner departs, ownership transfers to `fallback_owner` defined in `.docspec`.

---

### `created`

| Property | Value |
|----------|-------|
| Required | Yes |
| Type | `string` — ISO 8601 datetime |
| Format | `YYYY-MM-DDTHH:MM:SS±HH:MM` |
| Purpose | The datetime the document was first created |

Immutable after creation. Includes timezone offset for precise ordering of same-day events.

---

### `last_verified`

| Property | Value |
|----------|-------|
| Required | Yes |
| Type | `string` — ISO 8601 datetime |
| Format | `YYYY-MM-DDTHH:MM:SS±HH:MM` |
| Purpose | The datetime the content was last confirmed accurate |

Updated during review. Full timestamp precision enables same-day staleness detection when comparing against git commit timestamps. Drives the lifecycle state machine:
- `FRESH`: `last_verified` is within `review_cadence` for the document's type.
- `AGING`: `last_verified` is approaching the cadence deadline (within 2x).
- `STALE`: `last_verified` exceeds the cadence, or a dependency has changed.

---

### `confidence`

| Property | Value |
|----------|-------|
| Required | Yes |
| Type | `string` — enum |
| Values | `high`, `medium`, `low`, `stale` |
| Purpose | Honest assessment of content accuracy |

| Level | Meaning |
|-------|---------|
| `high` | Generated from verified source material; reviewed by owner |
| `medium` | Inferred from available context; likely accurate but not verified |
| `low` | Speculative; based on incomplete information |
| `stale` | Was accurate; system has changed; needs re-verification |

---

### `depends_on`

| Property | Value |
|----------|-------|
| Required | Yes (may be empty list `[]`) |
| Type | `string[]` — list of file paths or artifact identifiers |
| Purpose | Lists every document or external artifact that, if changed, could invalidate this document |

When any dependency is modified after `last_verified`, the document transitions to `STALE`.

Examples:
- `["../reference/api-endpoints.md"]` — depends on another DEP document
- `["src/config/schema.ts"]` — depends on source code
- `["https://api.example.com/v2/spec.json"]` — depends on external spec

---

### `tags`

| Property | Value |
|----------|-------|
| Required | No (defaults to `[]`) |
| Type | `string[]` |
| Purpose | Free-form labels for search and filtering |

Tags do not affect validation or lifecycle. They aid discovery.

---

### `links`

| Property | Value |
|----------|-------|
| Required | No (defaults to `[]`) |
| Type | `DepLink[]` — list of typed relationship objects |
| Purpose | Declares typed navigation relationships to other documents |

Each entry in the `links` array has two fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target` | `string` | Yes | Relative path to the target document |
| `rel` | `string` | Yes | Relationship type |

Valid `rel` values (canonical):

| Relationship | Meaning | Typical source → target |
|-------------|---------|------------------------|
| `TEACHES` | Introduces a concept that has a reference entry | tutorial → reference |
| `USES` | Uses a component defined in a reference | how-to → reference |
| `EXPLAINS` | Clarifies the rationale behind a reference | explanation → reference |
| `DECIDES` | Justifies a choice affecting a component | decision-record → any |
| `REQUIRES` | Must be read before this document | any → any |
| `NEXT` | Suggested follow-up after this document | any → any |

Custom relationships declared in `.docspec` via `custom_relationships` are also valid.

Example:
```yaml
dep:
  links:
    - target: ../reference/widget-api.md
      rel: TEACHES
    - target: ./basic-setup.md
      rel: REQUIRES
    - target: ./your-first-feature.md
      rel: NEXT
```

**Backlinks are computed, never stored.** The `links` field only contains forward relationships. Reverse relationships (backlinks) are derived at build time by the `dep` CLI tool.

---

## Optional Fields

### `superseded_by`

| Property | Value |
|----------|-------|
| Required | Only when `confidence: stale` and document is being deprecated |
| Type | `string` — file path |
| Purpose | Points to the replacement document |

### `review_trigger`

| Property | Value |
|----------|-------|
| Required | Only for `decision-record` type |
| Type | `string` — human-readable condition |
| Purpose | Defines when this decision should be revisited |
| Example | `"If monthly active users exceed 100k"` |

### `participants`

| Property | Value |
|----------|-------|
| Required | Only for `decision-record` type |
| Type | `string[]` |
| Purpose | Who was involved in making this decision |

---

## Validation Rules

1. All required fields must be present.
2. `type` must be a recognized value (canonical or custom).
3. `audience` entries must reference IDs in `.docspec`.
4. `confidence` must be one of the four enum values.
5. `created` must not be in the future.
6. `last_verified` must not be earlier than `created`.
7. `depends_on` paths must resolve to existing files (warning if not).
8. `links[].target` paths must resolve to existing `.md` files.
9. `links[].rel` must be a canonical relationship type or one declared in `.docspec` `custom_relationships`.
