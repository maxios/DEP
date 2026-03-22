```yaml
---
dep:
  type: reference
  audience: [ai-agent]
  owner: "@dep-core"
  created: 2026-03-22
  last_verified: 2026-03-22
  confidence: high
  depends_on: [skills/dep-generate.md, skills/dep-validate.md, skills/dep-audit.md]
  tags: [skills, api, agent, integration]
---
```

# DEP Skills API Reference

DEP provides three skills that AI agents can invoke to generate, validate, and audit documentation. Skills follow the Claude Code skill convention.

---

## `/dep-generate`

| Property | Value |
|----------|-------|
| File | `skills/dep-generate.md` |
| Trigger | User asks to generate documentation for a system or domain |
| Input | System description, optional `.docspec` |
| Output | Complete DEP-compliant documentation set |

### Workflow

1. Load or create `.docspec`
2. Plan the document set (present to user for approval)
3. Generate documents in dependency order
4. Run validation on the full set

### When to Use

- Greenfield documentation for a new project
- Generating docs from a codebase, API spec, or system description
- Expanding an existing DEP documentation set with new documents

---

## `/dep-validate`

| Property | Value |
|----------|-------|
| File | `skills/dep-validate.md` |
| Trigger | User asks to validate, audit, review, or check documentation |
| Input | File path (single doc) or docs root / `.docspec` (full set) |
| Output | Validation report with pass/warn/fail per check |

### Check Categories

| Category | Scope | Checks |
|----------|-------|--------|
| Metadata | Per document | All required fields present and valid |
| Type purity | Per document | Required patterns present, violation patterns absent |
| Link integrity | Per document | All internal links resolve |
| Lifecycle | Per document | Freshness state based on `last_verified` and cadence |
| Orphan detection | Graph | Every doc reachable from an entry point |
| Reference coverage | Graph | Tutorials link to reference entries |
| Reciprocal linking | Graph | References link back to tutorials/how-tos |
| Cycle detection | Graph | No circular REQUIRES chains |

### When to Use

- Before committing new documentation
- During periodic documentation reviews
- After modifying documents that others depend on

---

## `/dep-audit`

| Property | Value |
|----------|-------|
| File | `skills/dep-audit.md` |
| Trigger | User asks to audit or migrate existing (non-DEP) documentation |
| Input | Path to existing documentation directory |
| Output | Migration plan with phases |

### Migration Phases

| Phase | Action |
|-------|--------|
| 1. Metadata | Add DEP headers to existing docs |
| 2. Extraction | Split contaminated documents by type |
| 3. Gap Fill | Create missing documents |
| 4. Graph Construction | Build index, entry points, cross-references |
| 5. Governance | Create `.docspec`, assign owners, set cadences |

### When to Use

- Adopting DEP for a project with existing documentation
- Evaluating documentation quality before a rewrite
- Planning a documentation improvement initiative

---

## Skill Installation

To make DEP skills available in a Claude Code project, add to your project's `CLAUDE.md`:

```markdown
## Skills

- `/dep-generate` — Generate DEP-compliant documentation
- `/dep-validate` — Validate documentation against DEP standards
- `/dep-audit` — Audit and migrate existing documentation to DEP
```

Or copy the skill files from `skills/` into your project's `.claude/skills/` directory.
