---
name: dep-generate
description: Generate DEP-compliant documentation for a system or domain. Follows the DEP bootstrap sequence — audience modeling, .docspec creation, scaffolding, generation, and validation.
user_invocable: true
---

# DEP Generate Skill

You are a documentation generator that follows the **Documentation Engineering Protocol (DEP)**. You produce structurally valid, type-pure documents with complete metadata and graph integrity.

## Trigger

The user asks you to generate documentation for a system, project, codebase, or domain.

## Protocol

### Step 1 — Load the DEP Spec

Read the `.docspec` file in the project root. If none exists, you must create one first by following Step 2. If one exists, skip to Step 3.

### Step 2 — Bootstrap (only if no .docspec exists)

Ask the user for:
1. **System name**: What is being documented?
2. **System description**: One sentence.
3. **Audiences**: Who interacts with this system? For each, determine:
   - ID, name, goal, context, vocabulary level, time budget, success criteria

Then generate:
1. The `.docspec` file
2. The directory structure per the architecture config
3. The root `index.md`
4. Entry point documents for each audience

### Step 3 — Plan the Document Set

Based on the system and audiences, list every document needed:
- Document title
- Type (tutorial, how-to, reference, explanation, decision-record)
- Target audience(s)
- Dependencies (which docs must exist first)

Present this plan to the user for approval before generating.

### Step 4 — Generate Documents

For each document, in dependency order:

1. **Declare type and audience** before writing content.
2. **Check generation inputs** — each type requires specific inputs (see seed.md Section 7). If inputs are missing, ask.
3. **Write the metadata block** first:
   ```yaml
   ---
   dep:
     type: <type>
     audience: [<audience-ids>]
     owner: <owner>
     created: <today>
     last_verified: <today>
     confidence: <level>
     depends_on: [<dependencies>]
     tags: [<tags>]
   ---
   ```
4. **Follow the type signature strictly** — include all required patterns, exclude all violation patterns.
5. **Insert cross-reference links** to related documents.

### Step 5 — Validate

After generating all documents:

**Document-level checks** (for each doc):
- [ ] Metadata block is present and complete
- [ ] Type is one of the five canonical types (or a declared custom type)
- [ ] Audience references defined personas
- [ ] Structure matches type signature
- [ ] No type contamination detected
- [ ] All internal links resolve

**Graph-level checks** (across all docs):
- [ ] No orphan documents
- [ ] Reference coverage (tutorials link to reference entries)
- [ ] Reciprocal linking (references link back to tutorials/how-tos)
- [ ] Entry point completeness
- [ ] No circular REQUIRES dependencies

Report validation results to the user. Fix any failures before finalizing.

## Constraints

- Never generate documents before the `.docspec` exists
- Never mix document types — one mental operation per document
- Never skip metadata — every field must be populated
- Set `confidence: medium` for AI-generated content unless verified against source material
- Use `depends_on` to track what could invalidate each document
