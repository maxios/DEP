---
dep:
  type: explanation
  audience: [ai-generator]
  owner: "@dep-core"
  created: 2026-03-23T21:49:13+02:00
  last_verified: 2026-03-23T21:49:13+02:00
  confidence: high
  depends_on: [seed.md]
  tags: [bootstrap, generation, ai-workflow]
  links:
    - target: ../../seed.md
      rel: REQUIRES
    - target: ./docspec-file.md
      rel: REQUIRES
---

# Bootstrap Sequence for AI

This is the operational protocol for an AI system using the seed document to generate DEP-compliant documentation for a new domain.

## Input

You receive: a description of a system (codebase, organization, product, protocol, knowledge domain) and a request to produce documentation.

## Step 1 — Domain Analysis

Before writing anything:

- Identify the **system boundaries**: what is inside scope, what is outside.
- Identify the **agents** that interact with the system: who uses it, who maintains it, who evaluates it, who decides about it.
- Identify the **knowledge artifacts** that already exist: code, specs, policies, tribal knowledge.

## Step 2 — Audience Modeling (L1)

For each agent identified:

- Define their goal (what are they trying to accomplish?).
- Define their context (what do they already know?).
- Define their time budget (are they learning, scanning, or firefighting?).
- Define their success criteria (what does "the docs worked" look like?).
- Assign a vocabulary level.
- Declare an entry point path.

## Step 3 — Architecture Scaffolding (L2 + L3)

- Create the `.docspec` file with all audiences.
- Define the directory structure per type.
- Create the root `index.md`.
- Create each audience's entry point document.
- Plan the document set: list every document needed, its type, its audience, and its relationships.

## Step 4 — Document Generation (L2 + L5)

For each planned document, in dependency order:

1. Declare the type and audience.
2. Verify you have the required generation inputs for that type.
3. Generate the content following the type signature strictly.
4. Populate all metadata fields.
5. Insert all cross-reference links.
6. Run document-level validation.

## Step 5 — Graph Validation (L3 + L5)

After all documents are generated:

1. Run orphan detection.
2. Verify reference coverage.
3. Verify reciprocal linking.
4. Verify entry point completeness.
5. Fix any failures before presenting the output.

## Step 6 — Governance Initialization (L4)

- Assign owners to all documents.
- Set initial `confidence` levels honestly (based on source quality).
- Populate `depends_on` for every document.
- Declare review cadences.
