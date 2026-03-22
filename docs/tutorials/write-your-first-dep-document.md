```yaml
---
dep:
  type: tutorial
  audience: [human-author]
  owner: "@dep-core"
  created: 2026-03-22
  last_verified: 2026-03-22
  confidence: high
  depends_on: [seed.md, docs/reference/dep-metadata-schema.md, docs/reference/document-type-signatures.md]
  tags: [getting-started, first-document, tutorial]
---
```

# Tutorial: Write Your First DEP Document

## Prerequisites

- A text editor that supports Markdown
- A project with a `.docspec` file (see [Bootstrap DEP for Your Project](bootstrap-dep-for-your-project.md) if you don't have one)
- You have read the [DEP Metadata Schema](../reference/dep-metadata-schema.md) reference

## What You'll Build

A single, DEP-compliant how-to guide for your project — complete with metadata block, type-pure structure, and cross-references. By the end, you'll understand the core workflow for writing any DEP document.

## Steps

### Step 1 — Choose Your Document's Type

Before writing a single word of content, decide what mental operation your document performs on the reader:

| If the reader is asking... | Your type is... |
|---------------------------|-----------------|
| "Teach me" | `tutorial` |
| "Help me do X" | `how-to` |
| "What is the exact value of X?" | `reference` |
| "Why is it this way?" | `explanation` |
| "Why was X chosen over Y?" | `decision-record` |

For this tutorial, we'll write a **how-to** guide — the most common document type in most projects.

**Expected result**: You have a clear type in mind. Write it down.

### Step 2 — Write the Metadata Block

Create a new Markdown file in your project's `how-to` directory (check your `.docspec` for the exact path). Start with the metadata block:

```yaml
---
dep:
  type: how-to
  audience: [your-audience-id]
  owner: "@your-name"
  created: 2026-03-22
  last_verified: 2026-03-22
  confidence: medium
  depends_on: []
  tags: []
---
```

Fill in each field:
- **type**: `how-to` (we chose this in Step 1)
- **audience**: Look up the audience IDs in your `.docspec` and pick the ones this document serves
- **owner**: Your name or team — you're accountable for keeping this accurate
- **created**: Today's date
- **last_verified**: Same as created for new documents
- **confidence**: Start with `medium` — you can upgrade to `high` after review
- **depends_on**: List any files that, if changed, would make this document wrong
- **tags**: Add searchable labels

**Expected result**: A valid metadata block at the top of your file.

### Step 3 — Write the Content Using the Type Signature

A how-to document has four required sections. Write them in order:

**Goal statement** — One sentence explaining what the reader will accomplish:
```markdown
**Goal**: Deploy the application to the staging environment.
```

**Prerequisites** — What must be true before starting:
```markdown
## Prerequisites
- Access to the staging server
- Application built successfully (`npm run build`)
```

**Action steps** — Numbered, imperative, minimal explanation:
```markdown
## Steps
1. Run `ssh staging-server`.
2. Pull the latest build: `git pull origin main`.
3. Restart the service: `systemctl restart app`.
```

**Verification** — How to confirm success:
```markdown
## Verification
Open `https://staging.example.com` and confirm the new version number appears in the footer.
```

**Expected result**: A document with all four required sections and nothing else.

### Step 4 — Check for Type Contamination

Review your document for violation patterns. A how-to must NOT contain:

- Teaching asides ("Let's understand why this works...")
- Exhaustive reference tables (parameter lists with every option)
- Historical context ("This was introduced in v2.3 because...")
- Multiple approaches side-by-side

If you find any of these, extract them:
- Teaching content → new tutorial or explanation document
- Reference tables → new reference document
- Historical context → explanation or decision record

Replace the extracted content with a link: `See [Why We Use Blue-Green Deploys](../explanation/why-blue-green-deploys.md)`.

**Expected result**: Your document contains only goal, prerequisites, steps, and verification.

### Step 5 — Add Cross-References

At the bottom of your document, add a Related section linking to:
- The reference document for any tools or APIs mentioned in your steps
- The explanation document for the concepts behind your procedure
- The next how-to the reader might need

```markdown
## Related
- [CLI Reference](../reference/cli-reference.md) — full flag documentation
- [Why Blue-Green Deploys](../explanation/why-blue-green-deploys.md) — context for this approach
```

**Expected result**: Your document links to at least one other document. No orphans.

### Step 6 — Self-Validate

Run through this checklist:

- [ ] Metadata block is present with all required fields
- [ ] `type` is `how-to`
- [ ] `audience` references IDs from `.docspec`
- [ ] Document has: goal statement, prerequisites, steps, verification
- [ ] Document does NOT have: teaching asides, reference tables, historical context
- [ ] All links point to real files (or planned files noted as `(planned)`)
- [ ] The document is reachable from your audience's entry point

**Expected result**: All checks pass. Your document is DEP-compliant.

## What You Built

You created a single DEP-compliant how-to guide with:
- A valid metadata block declaring type, audience, ownership, and lifecycle data
- Type-pure content following the how-to signature exactly
- Cross-references connecting it to the documentation graph

The same workflow applies to every DEP document type — only the type signature changes.

## Next Steps

- [Document Type Signatures Reference](../reference/document-type-signatures.md) — learn the required patterns for all five types
- [How-To: Validate a Document](../how-to/validate-a-document.md) — use the DEP validator
- [Explanation: Why Type Purity Matters](../explanation/why-type-purity-matters.md) — understand the reasoning behind type separation
