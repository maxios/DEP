---
dep:
  type: explanation
  audience:
    - ai-agent
    - human-author
    - project-lead
  owner: "@dep-core"
  created: 2026-09-10T18:30:00+03:00
  last_verified: 2026-09-10T18:30:00+03:00
  confidence: high
  depends_on:
    - docs/desired-user-stories/context-engine-design.md
    - cli/src/context/retrieve.ts
  tags:
    - context
    - retrieval
    - rationale
  links:
    - target: ../reference/context-bundle-schema.md
      rel: EXPLAINS
    - target: ../../seed.md
      rel: REQUIRES
---

# Why Budgeted Context

Retrieval-augmented context is usually a flat list ranked by similarity. That answers one question — *what is about this?* — and leaves three unanswered: *is it still true*, *is it meant for this reader*, and *what does it assume I already know*. A DEP set already carries the metadata that answers all three. `dep context` exists to turn that metadata into ranking, packing and reporting instead of leaving it as governance decoration.

## The budget is a ceiling, not a target

An agent's context window is the scarcest thing it has. A retrieval layer that returns "the top 20" spends that window on whatever similarity happened to rank, including near-duplicates and weak matches. A declared budget makes the trade explicit: the bundle fills it with the passages that earn their place, stops early when nothing else does, and reports when even the best passage would not fit rather than truncating it silently. Padding a bundle to consume a budget is treated as a defect, not a feature.

## Freshness is a retrieval signal, not a report

Every DEP document declares when it was last verified, and every type has a review cadence. Most systems use that to print warnings. Here it decides what is served: expired knowledge is withheld by default and *listed*, ageing knowledge is served and *marked*, and the one exception — a stale document that a served passage requires — is served with a note, because an answer whose prerequisite is missing is worse than an answer whose prerequisite is old. The consuming agent sees the verdict and can state its confidence honestly.

## The graph says what the answer assumes

A passage that answers the question may require a concept the reader has not met. The typed relationships in the set (`REQUIRES` above all) let the bundle pull that concept in and place it *before* the passage that needs it. The same relationships rank widely-depended-upon documents above equally-relevant isolated ones: what many things require is more likely to be foundational.

## Provenance is what makes it citable

Every passage says where it came from, how fresh it is, and why it is in the bundle — matched, required by another passage, or reached by expansion. That is the part no embedding store offers, and the reason a request without provenance is refused: a passage that cannot be traced cannot be trusted, cited or corrected.

## What this does not claim

The engine only works on a governed set — documents with a `dep:` block. It does not retrieve from arbitrary text, by design: the metadata is exactly what makes it better than similarity alone. Token budgets are estimated (characters ÷ 4), not tokenised against a model. And the local `hash` provider is lexical: it makes retrieval reproducible and offline, but only the model-backed providers understand meaning.
