---
dep:
  type: explanation
  audience: [ai-generator, human-author]
  owner: "@dep-core"
  created: 2026-03-23T21:49:13+02:00
  last_verified: 2026-03-24T00:00:00+02:00
  confidence: high
  depends_on: [seed.md]
  tags: [anti-patterns, quality, validation]
  links:
    - target: ../../seed.md
      rel: REQUIRES
---

# Anti-Patterns

These are the most common failures DEP prevents. An AI system should monitor for and actively avoid each one.

## The Wall of Text

**Symptom**: A single document of 5,000+ words covering everything from introduction to advanced troubleshooting.

**DEP diagnosis**: Multiple types collapsed into one document. Audience not declared — the writer tried to serve everyone.

**Fix**: Decompose. Identify the distinct mental operations present in the text. Extract each into its own document of the correct type. Link them.

## The Orphan Graveyard

**Symptom**: A `/docs` folder with 200 files, no index, no navigation, discoverable only through full-text search.

**DEP diagnosis**: Layer 3 was never implemented. Documents were created without being placed in the graph.

**Fix**: Build the graph. Create index files. Establish audience entry points. Run orphan detection. Link or archive every orphan.

## The Confident Fossil

**Symptom**: A beautifully written document that was accurate 18 months ago. The system has changed. The document has not. New engineers follow it and break things.

**DEP diagnosis**: Layer 4 was never implemented. No ownership, no review cadence, no dependency tracking.

**Fix**: Add lifecycle metadata. Establish staleness detection. Wire notifications. The document's confidence should have degraded to `stale` automatically.

## The LLM Flood

**Symptom**: An LLM was pointed at a codebase and generated 50 pages of documentation overnight. It looks professional. It is structurally incoherent — tutorials with reference tables, how-tos with architectural digressions, everything written for a generic "developer" audience.

**DEP diagnosis**: Layer 5 was not applied. The LLM operated without constraints. No type declaration, no audience constraint, no validation.

**Fix**: Do not regenerate. Instead: retroactively apply DEP metadata, run type contamination detection, decompose contaminated documents, validate the graph. Then constrain all future generation through `.docspec`.

## The Vocabulary Mismatch

**Symptom**: An ops engineer in an incident can't find the fix because the runbook uses theoretical language. A business stakeholder can't understand the overview because it's written in implementation jargon.

**DEP diagnosis**: Layer 1 failure. The audience's `vocabulary_level` and `time_budget` were not considered. A `deep` document was written for an `urgent` audience, or an `expert` vocabulary was used for a `non-technical` reader.

**Fix**: Verify the document's vocabulary and pacing against its declared audience. Rewrite to match. If the mismatch exists because the document serves multiple audiences, split it into audience-specific variants.

## The Recursive Reference

**Symptom**: To understand Document A, you need to read Document B. But Document B assumes you've read Document A.

**DEP diagnosis**: Layer 3 failure. Circular `REQUIRES` dependency. The graph has a cycle.

**Fix**: Identify which document is truly foundational. Break the cycle by removing one dependency direction and restructuring the dependent document to be self-contained on the overlapping content.
