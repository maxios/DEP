---
dep:
  type: explanation
  audience: [project-lead, human-author]
  owner: "@dep-core"
  created: 2026-03-23T14:00:00+02:00
  last_verified: 2026-03-24T00:00:00+02:00
  confidence: high
  depends_on: [seed.md]
  tags: [comparison, frameworks, adoption]
  links:
    - target: ../decision-records/dr-001-five-types-not-four.md
      rel: EXPLAINS
---

# DEP vs Other Documentation Frameworks

## Context

If you're evaluating DEP for your project, you likely know other documentation approaches — Diátaxis, docs-as-code, wikis, or no formal framework at all. This explanation compares DEP to the most common alternatives so you can understand what DEP adds and where it differs.

## DEP and Diátaxis

DEP builds directly on the [Diátaxis framework](https://diataxis.fr) by Daniele Procida. Both share the same core insight: documentation types should map to distinct mental operations (learning, doing, looking up, understanding).

**What DEP inherits from Diátaxis:**
- The four canonical types: tutorial, how-to, reference, explanation
- The principle that each document serves one mental operation
- The emphasis on audience-oriented structure over topic-oriented structure

**What DEP adds beyond Diátaxis:**

| Capability | Diátaxis | DEP |
|-----------|----------|-----|
| Content taxonomy | 4 types | 5 types (adds decision record) |
| Machine-readable metadata | None | YAML frontmatter with typed fields |
| Audience modeling | Implicit | Explicit personas in `.docspec` |
| Lifecycle management | None | Automated staleness detection |
| Link typing | None | 6 canonical relationship types |
| Graph integrity | None | Orphan detection, cycle detection, entry point validation |
| AI generation rules | None | Structural constraints for AI producers and consumers |
| Validation tooling | None | CLI + skills for automated checking |

Diátaxis is a philosophy. DEP is a protocol — it operationalizes the philosophy with metadata, tooling, and governance rules that both humans and AI can execute against.

## DEP and Docs-as-Code

The docs-as-code approach treats documentation like source code: version-controlled, reviewed via PRs, built with CI pipelines, and deployed alongside the product.

DEP is fully compatible with docs-as-code and assumes it as the default workflow. DEP documents are Markdown files in a git repository. The `.docspec` file is version-controlled. The CLI runs in CI.

**What DEP adds to docs-as-code:**
- **Structural constraints** — docs-as-code tells you *how* to manage docs (git, PRs, CI) but not *what* to write or *how* to organize. DEP provides the content architecture.
- **Freshness tracking** — docs-as-code keeps history but doesn't track whether documentation is still accurate relative to the code it describes. DEP's `last_verified` + `depends_on` + review cadences fill this gap.
- **Cross-document integrity** — docs-as-code has no concept of a documentation graph. DEP's typed links and graph validation ensure documents stay connected.

## DEP and Wikis

Wiki-based documentation (Confluence, Notion, MediaWiki) prioritizes ease of creation over structural discipline. Anyone can create a page anywhere with any format.

**Where wikis struggle (and DEP helps):**
- **No type enforcement** — wiki pages freely mix tutorials, reference tables, and explanations. DEP enforces type purity.
- **No lifecycle management** — wikis accumulate stale pages with no automated way to detect them. DEP computes freshness from `last_verified` dates.
- **No audience modeling** — wikis serve all readers the same content. DEP routes readers through audience-specific entry points.
- **No graph integrity** — wiki links break silently. DEP validates link targets and detects orphans.

**Where wikis excel (and DEP trades off):**
- **Low barrier to entry** — anyone can create a wiki page in seconds. DEP requires metadata, type selection, and structural compliance.
- **Collaboration features** — wikis offer real-time editing, comments, and notifications built in. DEP relies on git workflows for collaboration.

DEP is not a wiki replacement. It's a structural layer for projects that need documentation quality over documentation volume.

## DEP and No Framework

Many projects have no documentation framework — docs are written ad hoc, organized by folder intuition, and reviewed sporadically (if at all).

DEP provides the missing structure. The adoption path is incremental:
1. Add a `.docspec` file to define audiences and governance
2. Add `dep:` metadata blocks to existing documents
3. Run validation to identify gaps and broken links
4. Gradually refactor contaminated documents into type-pure ones

The `/dep-audit` skill automates this assessment for existing documentation sets.

## Tradeoffs

**DEP requires more discipline**: Every document needs metadata, a declared type, and typed links. This is overhead that simpler approaches avoid. The payoff is automated quality assurance and AI compatibility.

**DEP is opinionated**: Five types, six link relationships, mandatory audience declaration. Projects that need flexibility in document structure may find DEP too rigid. The `custom_types` and `custom_relationships` extensions in `.docspec` provide escape hatches.

**DEP is tooling-dependent**: The full value of DEP (lifecycle tracking, graph validation, orphan detection) requires the CLI or skills. Without tooling, DEP is just metadata in frontmatter blocks.

## Related

- [DR-001: Five Types Not Four](../decision-records/dr-001-five-types-not-four.md) — why DEP extends Diátaxis with decision records
- [Tutorial: Bootstrap DEP for Your Project](../tutorials/bootstrap-dep-for-your-project.md) — getting started with DEP adoption
