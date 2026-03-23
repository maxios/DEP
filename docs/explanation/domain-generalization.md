---
dep:
  type: explanation
  audience: [ai-generator]
  owner: "@dep-core"
  created: 2026-03-23T21:49:13+02:00
  last_verified: 2026-03-23T21:49:13+02:00
  confidence: high
  depends_on: [seed.md]
  tags: [domain, generalization, universality]
  links:
    - target: ../../seed.md
      rel: REQUIRES
---

# Domain Generalization

## The Abstraction

DEP is domain-agnostic. The five document types map to universal cognitive operations, not software-specific artifacts. Here is the mapping across domains:

| Mental Operation | Software | Medicine | Law | Hardware | Organization |
|-----------------|----------|----------|-----|----------|-------------|
| **Construct** (Tutorial) | "Build your first API endpoint" | "Perform your first patient intake" | "File your first motion" | "Assemble the base unit" | "Complete your first sprint as a new hire" |
| **Execute** (How-To) | "Deploy to production" | "Administer IV sedation" | "Submit a FOIA request" | "Replace the power supply" | "Submit an expense report" |
| **Lookup** (Reference) | "API endpoint parameters" | "Drug interaction table" | "Statute 42 USC § 1983" | "Component specifications" | "PTO policy details" |
| **Understand** (Explanation) | "Why we chose event sourcing" | "Why this drug targets TNF-α" | "Why strict scrutiny applies" | "Why aluminum over steel for this frame" | "Why we use OKRs instead of KPIs" |
| **Decide** (Decision Record) | "DR: Chose PostgreSQL over MongoDB" | "Protocol selection: chose immunotherapy over chemo" | "Precedent analysis: applied Sullivan test" | "Material choice: titanium for joint replacement" | "Strategy decision: entered MENA market first" |

The types are universal because the mental operations are universal. Every mind — regardless of domain — learns, does, looks up, seeks understanding, and makes decisions.

## AI Instruction

When applying DEP to a new domain:

1. Replace the examples and vocabulary — not the structure.
2. The five types remain the same. The six relationships remain the same. The five layers remain the same.
3. Only the audience personas, vocabulary levels, review cadences, and directory names change.
4. If a domain seems to need a "new" type, it is almost always a subtype of one of the five. Model it as a variant with additional required patterns, not as a sixth type.
