```yaml
---
dep:
  type: reference
  audience: [ai-generator, ai-agent, human-author, project-lead]
  owner: "@dep-core"
  created: 2026-03-22
  last_verified: 2026-03-22
  confidence: high
  depends_on: [.docspec]
  tags: [navigation, root, index]
---
```

# Documentation Engineering Protocol — Documentation Root

> A documentation standard for humans and AI alike.

---

## By Audience

### AI Documentation Generator

You process systems and produce documentation. Start here:

- **Entry point**: [Seed Document](../seed.md) — the complete protocol specification
- [Reference: DEP Metadata Schema](reference/dep-metadata-schema.md) — every metadata field defined
- [Reference: Document Type Signatures](reference/document-type-signatures.md) — structural rules per type
- [Reference: .docspec Schema](reference/docspec-schema.md) — configuration file specification

### AI Agent Integrator

You operate within an agent framework and need callable skills:

- **Entry point**: [Tutorial: Integrate DEP into Your Agent](tutorials/integrate-dep-into-agent.md)
- [Reference: DEP Skills API](reference/dep-skills-api.md) — all available skills and their interfaces
- [How-To: Validate a Document](how-to/validate-a-document.md)
- [How-To: Generate a Document Set](how-to/generate-a-document-set.md)

### Human Documentation Author

You write or review documentation and want to follow DEP:

- **Entry point**: [Tutorial: Write Your First DEP Document](tutorials/write-your-first-dep-document.md)
- [How-To: Add DEP Metadata to Existing Docs](how-to/add-dep-metadata.md)
- [Explanation: Why Type Purity Matters](explanation/why-type-purity-matters.md)

### Project Lead / Adopter

You're evaluating or adopting DEP for your project:

- **Entry point**: [Tutorial: Bootstrap DEP for Your Project](tutorials/bootstrap-dep-for-your-project.md)
- [Explanation: DEP vs Other Documentation Frameworks](explanation/dep-vs-other-frameworks.md)
- [How-To: Configure Governance](how-to/configure-governance.md)

---

## By Type

### Tutorials

- [Write Your First DEP Document](tutorials/write-your-first-dep-document.md)
- [Bootstrap DEP for Your Project](tutorials/bootstrap-dep-for-your-project.md)
- [Integrate DEP into Your Agent](tutorials/integrate-dep-into-agent.md)

### How-To

- [Validate a Document](how-to/validate-a-document.md)
- [Generate a Document Set](how-to/generate-a-document-set.md)
- [Add DEP Metadata](how-to/add-dep-metadata.md)
- [Configure Governance](how-to/configure-governance.md)

### Reference

- [DEP Metadata Schema](reference/dep-metadata-schema.md)
- [Document Type Signatures](reference/document-type-signatures.md)
- [.docspec Schema](reference/docspec-schema.md)
- [DEP Skills API](reference/dep-skills-api.md)

### Explanation

- [Why Type Purity Matters](explanation/why-type-purity-matters.md)
- [DEP vs Other Frameworks](explanation/dep-vs-other-frameworks.md)

### Decision Records

- [DR-001: Five Types Not Four](decision-records/dr-001-five-types-not-four.md)
- [DR-002: Atomic Files Over Long Documents](decision-records/dr-002-atomic-files-over-long-documents.md)
