---
dep:
  type: tutorial
  audience: [project-lead]
  owner: "@dep-core"
  created: 2026-03-23T14:00:00+02:00
  last_verified: 2026-03-23T14:00:00+02:00
  confidence: high
  depends_on: [docs/reference/docspec-schema.md, seed.md]
  tags: [getting-started, bootstrap, tutorial, adoption]
  links:
    - target: ../reference/docspec-schema.md
      rel: TEACHES
    - target: ./write-your-first-dep-document.md
      rel: NEXT
    - target: ../explanation/dep-vs-other-frameworks.md
      rel: NEXT
---

# Tutorial: Bootstrap DEP for Your Project

## Prerequisites

- A project repository (any language, any domain)
- Bun installed (`bun --version`) for running the DEP CLI
- Basic familiarity with YAML and Markdown

## What You'll Build

A fully configured DEP documentation system for your project: a `.docspec` configuration file, the directory structure, and your first document — ready for validation and further expansion.

## Steps

### Step 1 — Identify Your Audiences

Before creating any files, answer: who reads your documentation, and what are they trying to do?

List at least two distinct audiences. For each one, capture:
- **ID**: a kebab-case identifier (e.g., `backend-dev`, `ops-engineer`, `new-hire`)
- **Goal**: what they're trying to accomplish
- **Context**: what they already know
- **Entry point**: which document they should read first

Example for a web API project:

| ID | Goal | Entry Point |
|----|------|-------------|
| `backend-dev` | Build and extend the API | `docs/tutorials/dev-setup.md` |
| `ops-engineer` | Deploy and monitor the API | `docs/tutorials/ops-onboarding.md` |

**Expected result**: A list of 2+ audiences with IDs, goals, and entry points.

### Step 2 — Create the `.docspec` File

Create a file named `.docspec` at the root of your project:

```yaml
dep_version: "0.1.0"

project:
  name: "Your Project Name"
  docs_root: "./docs"
  description: "One-line description of your documentation system."

audiences:
  - id: backend-dev
    name: "Backend Developer"
    goal: "Build and extend the API"
    context: "Knows the language and framework; new to this codebase"
    entry_point: "./docs/tutorials/dev-setup.md"
    vocabulary_level: expert
    time_budget: deep
    success_criteria: "Can set up the dev environment and make a first contribution"

  - id: ops-engineer
    name: "Operations Engineer"
    goal: "Deploy and monitor the API"
    context: "Knows infrastructure tooling; unfamiliar with application internals"
    entry_point: "./docs/tutorials/ops-onboarding.md"
    vocabulary_level: advanced
    time_budget: scanning
    success_criteria: "Can deploy to staging and set up monitoring dashboards"

architecture:
  directory_map:
    tutorials: docs/tutorials
    how-to: docs/how-to
    reference: docs/reference
    explanation: docs/explanation
    decision-records: docs/decision-records
  require_index_files: true
  link_style: relative

governance:
  ownership_strategy: per-document
  fallback_owner: "@your-team"
  review_cadence:
    tutorial: 90
    how-to: 60
    reference: 30
    explanation: 180
    decision-record: 365

generation:
  ai_provider: constrained
  require_human_review: false
```

Replace the placeholder values with your project's details.

**Expected result**: A `.docspec` file at your project root.

### Step 3 — Create the Directory Structure

Create the five directories defined in your `architecture.directory_map`:

```bash
mkdir -p docs/tutorials docs/how-to docs/reference docs/explanation docs/decision-records
```

**Expected result**: Five empty directories under `docs/`.

### Step 4 — Create the Documentation Index

Create `docs/index.md` with a `dep:` metadata block and links organized by audience:

```yaml
---
dep:
  type: reference
  audience: [backend-dev, ops-engineer]
  owner: "@your-team"
  created: 2026-03-23T14:00:00+02:00
  last_verified: 2026-03-23T14:00:00+02:00
  confidence: high
  depends_on: [.docspec]
  tags: [navigation, root, index]
  links: []
---
```

Below the metadata, add a section for each audience with links to their entry point and key documents.

**Expected result**: A `docs/index.md` file with valid metadata.

### Step 5 — Write Your First Document

Create the entry point document for your first audience. Use the appropriate type — typically a tutorial for onboarding audiences.

Follow the type signature from the [Document Type Signatures](../reference/document-type-signatures.md) reference. At minimum, include:
- A valid `dep:` metadata block
- The required structural patterns for your chosen type
- At least one link to another planned document

**Expected result**: One DEP-compliant document in the appropriate directory.

### Step 6 — Install and Run the CLI

```bash
# Clone the DEP CLI (or copy the cli/ directory to your project)
cd cli && bun install

# Validate your documentation
bun run src/index.ts validate --root ..

# View the documentation graph
bun run src/index.ts graph --root ..
```

**Expected result**: The validator runs and reports the status of your documents.

## What You Built

You created a DEP documentation system for your project:
- A `.docspec` file defining audiences, architecture, and governance
- The five-directory structure for all document types
- A documentation index as the navigation root
- Your first DEP-compliant document
- A working CLI for validation and graph visualization

## Next Steps

- [Tutorial: Write Your First DEP Document](./write-your-first-dep-document.md) — detailed guide for authoring individual documents
- [Explanation: DEP vs Other Frameworks](../explanation/dep-vs-other-frameworks.md) — understand how DEP compares to what you may already use
- [How-To: Configure Governance](../how-to/configure-governance.md) — fine-tune review cadences and ownership
