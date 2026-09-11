---
dep:
  type: reference
  audience: [ai-generator, ai-agent, human-author, project-lead]
  owner: "@dep-core"
  created: 2026-03-22
  last_verified: 2026-09-11T08:33:09.126Z
  confidence: high
  depends_on: [.docspec]
  tags: [navigation, root, index]
  links: []
---

# Documentation Engineering Protocol — Documentation Root

> The DEP standard documented using DEP itself — a self-referential documentation system.

---

## By Audience

### AI Documentation Generator

**Entry point**: [seed.md](../seed.md)

- [Bootstrap Sequence for AI](explanation/bootstrap-sequence.md)
- [The `.docspec` File](explanation/docspec-file.md)
- [Anti-Patterns](explanation/anti-patterns.md)
- [Domain Generalization](explanation/domain-generalization.md)
- [Extension Points](explanation/extension-points.md)
- [Why Type Purity Matters](explanation/why-type-purity-matters.md)
- [DR-001: Five Document Types, Not Four](decision-records/dr-001-five-types-not-four.md)
- [DR-002: Atomic Files Over Long Documents](decision-records/dr-002-atomic-files-over-long-documents.md)
- [DR-003: Standard Frontmatter and Explicit Relationship Links](decision-records/dr-003-standard-frontmatter-and-explicit-links.md)
- [DR-004: Timestamp Precision for Lifecycle Fields](decision-records/dr-004-timestamp-precision-for-lifecycle-fields.md)
- [DEP Metadata Schema Reference](reference/dep-metadata-schema.md)
- [Type Signature: Reference](reference/type-signature-reference.md)
- [.docspec Schema Reference](reference/docspec-schema.md)
- [Type Signature: How-To](reference/type-signature-howto.md)
- [Type Signature: Tutorial](reference/type-signature-tutorial.md)
- [Type Signature: Explanation](reference/type-signature-explanation.md)
- [Document Type Signatures Reference](reference/document-type-signatures.md)
- [Type Signature: Decision Record](reference/type-signature-decision-record.md)
- [Documentation Engineering Protocol — Seed Document](../seed.md)

### AI Agent Integrator

**Entry point**: [integrate-dep-into-agent.md](tutorials/integrate-dep-into-agent.md)

- [Why Budgeted Context](explanation/why-budgeted-context.md)
- [How-To: Generate a Document Set](how-to/generate-a-document-set.md)
- [How-To: Use DEP from Claude Desktop](how-to/use-dep-from-claude-desktop.md)
- [How-To: Validate a Document](how-to/validate-a-document.md)
- [How-To: Embed DEP in Your Own Program](how-to/embed-dep-in-your-program.md)
- [How-To: Keep the Retrieval Index Current](how-to/keep-the-index-current.md)
- [How-To: Assemble a Context Bundle](how-to/assemble-a-context-bundle.md)
- [Tutorial: Integrate DEP into Your Agent](tutorials/integrate-dep-into-agent.md)
- [DR-002: Atomic Files Over Long Documents](decision-records/dr-002-atomic-files-over-long-documents.md)
- [DR-003: Standard Frontmatter and Explicit Relationship Links](decision-records/dr-003-standard-frontmatter-and-explicit-links.md)
- [DR-004: Timestamp Precision for Lifecycle Fields](decision-records/dr-004-timestamp-precision-for-lifecycle-fields.md)
- [DEP Metadata Schema Reference](reference/dep-metadata-schema.md)
- [Type Signature: Reference](reference/type-signature-reference.md)
- [.docspec Schema Reference](reference/docspec-schema.md)
- [DEP Skills API Reference](reference/dep-skills-api.md)
- [Type Signature: How-To](reference/type-signature-howto.md)
- [Type Signature: Tutorial](reference/type-signature-tutorial.md)
- [Type Signature: Explanation](reference/type-signature-explanation.md)
- [Document Type Signatures Reference](reference/document-type-signatures.md)
- [Type Signature: Decision Record](reference/type-signature-decision-record.md)
- [Context Bundle Schema Reference](reference/context-bundle-schema.md)

### Human Documentation Author

**Entry point**: [write-your-first-dep-document.md](tutorials/write-your-first-dep-document.md)

- [Why Budgeted Context](explanation/why-budgeted-context.md)
- [Anti-Patterns](explanation/anti-patterns.md)
- [Why Type Purity Matters](explanation/why-type-purity-matters.md)
- [DEP vs Other Documentation Frameworks](explanation/dep-vs-other-frameworks.md)
- [How-To: Configure Governance](how-to/configure-governance.md)
- [How-To: Generate a Document Set](how-to/generate-a-document-set.md)
- [How-To: Validate a Document](how-to/validate-a-document.md)
- [How-To: Add DEP Metadata to Existing Docs](how-to/add-dep-metadata.md)
- [How-To: Embed DEP in Your Own Program](how-to/embed-dep-in-your-program.md)
- [How-To: Keep the Retrieval Index Current](how-to/keep-the-index-current.md)
- [How-To: Assemble a Context Bundle](how-to/assemble-a-context-bundle.md)
- [Tutorial: Write Your First DEP Document](tutorials/write-your-first-dep-document.md)
- [DR-001: Five Document Types, Not Four](decision-records/dr-001-five-types-not-four.md)
- [DR-002: Atomic Files Over Long Documents](decision-records/dr-002-atomic-files-over-long-documents.md)
- [DR-003: Standard Frontmatter and Explicit Relationship Links](decision-records/dr-003-standard-frontmatter-and-explicit-links.md)
- [DR-004: Timestamp Precision for Lifecycle Fields](decision-records/dr-004-timestamp-precision-for-lifecycle-fields.md)
- [DEP Metadata Schema Reference](reference/dep-metadata-schema.md)
- [Type Signature: Reference](reference/type-signature-reference.md)
- [Type Signature: How-To](reference/type-signature-howto.md)
- [Type Signature: Tutorial](reference/type-signature-tutorial.md)
- [Type Signature: Explanation](reference/type-signature-explanation.md)
- [Document Type Signatures Reference](reference/document-type-signatures.md)
- [Type Signature: Decision Record](reference/type-signature-decision-record.md)
- [Context Bundle Schema Reference](reference/context-bundle-schema.md)

### Project Lead / Adopter

**Entry point**: [bootstrap-dep-for-your-project.md](tutorials/bootstrap-dep-for-your-project.md)

- [Why Budgeted Context](explanation/why-budgeted-context.md)
- [Extension Points](explanation/extension-points.md)
- [DEP vs Other Documentation Frameworks](explanation/dep-vs-other-frameworks.md)
- [How-To: Configure Governance](how-to/configure-governance.md)
- [How-To: Use DEP from Claude Desktop](how-to/use-dep-from-claude-desktop.md)
- [How-To: Keep the Retrieval Index Current](how-to/keep-the-index-current.md)
- [Tutorial: Bootstrap DEP for Your Project](tutorials/bootstrap-dep-for-your-project.md)
- [.docspec Schema Reference](reference/docspec-schema.md)

---

## By Type

### Explanation

- [Why Budgeted Context](explanation/why-budgeted-context.md)
- [Bootstrap Sequence for AI](explanation/bootstrap-sequence.md)
- [The `.docspec` File](explanation/docspec-file.md)
- [Anti-Patterns](explanation/anti-patterns.md)
- [Domain Generalization](explanation/domain-generalization.md)
- [Extension Points](explanation/extension-points.md)
- [Why Type Purity Matters](explanation/why-type-purity-matters.md)
- [DEP vs Other Documentation Frameworks](explanation/dep-vs-other-frameworks.md)
- [Documentation Engineering Protocol — Seed Document](../seed.md)

### How To

- [How-To: Configure Governance](how-to/configure-governance.md)
- [How-To: Generate a Document Set](how-to/generate-a-document-set.md)
- [How-To: Use DEP from Claude Desktop](how-to/use-dep-from-claude-desktop.md)
- [How-To: Validate a Document](how-to/validate-a-document.md)
- [How-To: Add DEP Metadata to Existing Docs](how-to/add-dep-metadata.md)
- [How-To: Embed DEP in Your Own Program](how-to/embed-dep-in-your-program.md)
- [How-To: Keep the Retrieval Index Current](how-to/keep-the-index-current.md)
- [How-To: Assemble a Context Bundle](how-to/assemble-a-context-bundle.md)

### Tutorial

- [Tutorial: Bootstrap DEP for Your Project](tutorials/bootstrap-dep-for-your-project.md)
- [Tutorial: Integrate DEP into Your Agent](tutorials/integrate-dep-into-agent.md)
- [Tutorial: Write Your First DEP Document](tutorials/write-your-first-dep-document.md)

### Decision Record

- [DR-001: Five Document Types, Not Four](decision-records/dr-001-five-types-not-four.md)
- [DR-002: Atomic Files Over Long Documents](decision-records/dr-002-atomic-files-over-long-documents.md)
- [DR-003: Standard Frontmatter and Explicit Relationship Links](decision-records/dr-003-standard-frontmatter-and-explicit-links.md)
- [DR-004: Timestamp Precision for Lifecycle Fields](decision-records/dr-004-timestamp-precision-for-lifecycle-fields.md)

### Reference

- [DEP Metadata Schema Reference](reference/dep-metadata-schema.md)
- [Type Signature: Reference](reference/type-signature-reference.md)
- [.docspec Schema Reference](reference/docspec-schema.md)
- [DEP Skills API Reference](reference/dep-skills-api.md)
- [Type Signature: How-To](reference/type-signature-howto.md)
- [Type Signature: Tutorial](reference/type-signature-tutorial.md)
- [Type Signature: Explanation](reference/type-signature-explanation.md)
- [Document Type Signatures Reference](reference/document-type-signatures.md)
- [Type Signature: Decision Record](reference/type-signature-decision-record.md)
- [Context Bundle Schema Reference](reference/context-bundle-schema.md)
