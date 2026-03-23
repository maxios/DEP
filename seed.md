---
dep:
  type: explanation
  audience: [ai-generator]
  owner: "@dep-core"
  created: 2026-03-22T23:36:54+02:00
  last_verified: 2026-03-24T00:00:00+02:00
  confidence: high
  depends_on: []
  tags: [meta, seed, protocol, bootstrap]
  links:
    - target: docs/decision-records/dr-001-five-types-not-four.md
      rel: NEXT
    - target: docs/decision-records/dr-002-atomic-files-over-long-documents.md
      rel: NEXT
    - target: docs/reference/dep-metadata-schema.md
      rel: NEXT
    - target: docs/reference/document-type-signatures.md
      rel: NEXT
    - target: docs/reference/docspec-schema.md
      rel: NEXT
    - target: docs/decision-records/dr-003-standard-frontmatter-and-explicit-links.md
      rel: NEXT
    - target: docs/decision-records/dr-004-timestamp-precision-for-lifecycle-fields.md
      rel: NEXT
    - target: docs/explanation/docspec-file.md
      rel: NEXT
    - target: docs/explanation/domain-generalization.md
      rel: NEXT
    - target: docs/explanation/anti-patterns.md
      rel: NEXT
    - target: docs/explanation/bootstrap-sequence.md
      rel: NEXT
    - target: docs/explanation/extension-points.md
      rel: NEXT
---

# Documentation Engineering Protocol — Seed Document

## Purpose of This Document

This is the **seed document** of the Documentation Engineering Protocol (DEP). It is written for AI systems that will use it as the foundational input for generating, structuring, and governing documentation across any domain. Everything an AI needs to understand and execute DEP is contained here.

This document is self-referential: it follows the protocol it describes. Its metadata block above is a valid DEP header. Its structure conforms to the `explanation` type. Its audience is declared. It practices what it prescribes.

---

## 1 — The Core Abstraction

All documentation, in any domain, exists to bridge a gap between **a system** and **a mind** that needs to interact with that system.

- **System**: anything that has structure, behavior, and boundaries. A codebase, a hospital protocol, a legal framework, a machine, an organization, a philosophy.
- **Mind**: any agent — human or artificial — that must understand, operate, evaluate, or maintain the system.
- **Gap**: the delta between what the mind currently knows and what it needs to know to accomplish a specific goal with the system.

Documentation fails when it addresses the system without modeling the mind, or when it models a generic mind instead of a specific one. DEP eliminates this by requiring every document to declare both what it covers (type) and who it serves (audience).

**Foundational equation:**

```
Document = f(SystemScope, MindState, Goal)
```

A document is a function of what part of the system it covers, what the reader's current knowledge state is, and what the reader is trying to accomplish. Change any of those three inputs, and you need a different document — even if the subject matter is identical.

---

## 2 — The Five Layers

DEP is a layered architecture. Each layer answers one question. The layers are ordered by dependency — each layer requires the one below it to be defined first.

```
Layer    Question                         Artifact
─────    ────────                         ────────
L1       Who is reading?                  Audience Graph
L2       What kind of document is this?   Content Taxonomy
L3       How do documents connect?        Information Architecture
L4       How do documents stay alive?     Lifecycle & Governance
L5       How are documents produced?      Generation & Validation Rules
```

### Why This Order

L1 comes first because every subsequent decision depends on knowing the reader. You cannot choose a document type (L2) without knowing whether the reader is learning, doing, looking up, or understanding. You cannot design navigation (L3) without knowing the entry points per audience. You cannot set review cadence (L4) without knowing which audiences depend on freshness. You cannot constrain generation (L5) without knowing what vocabulary level and depth to target.

**An AI generating documentation MUST resolve layers in order: L1 → L2 → L3 → L4 → L5.**

---

## 3 — Layer 1: Audience Graph

### The Abstraction

An audience is not a job title. An audience is a **mind-state + goal** pair. The same human can be two different audiences at different moments:

- An engineer *learning* the system (mind-state: beginner, goal: build mental model) is a different audience than the same engineer *debugging* the system at 3 AM (mind-state: expert-under-pressure, goal: find root cause fast).

### The Schema

Every audience persona is defined by six properties:

| Property | Purpose | Effect on Documentation |
|----------|---------|------------------------|
| `id` | Machine-readable identifier | Used in document metadata to declare target audience |
| `goal` | What the reader is trying to accomplish | Determines document scope — everything included must serve this goal |
| `context` | What the reader already knows | Determines vocabulary level, prerequisite assumptions, starting point |
| `entry_point` | Where this reader begins | The first document they encounter; must route to everything they need |
| `time_budget` | How much attention they can give | `deep` = learning mode, `scanning` = evaluating, `urgent` = firefighting |
| `success_criteria` | How we know the doc worked | The measurable outcome of successful documentation |

### AI Instruction

When generating documentation for a domain you have not seen before, your FIRST action is to identify the distinct mind-state + goal pairs that interact with the system. Ask:

1. Who interacts with this system for the **first time**? (Onboarding audience)
2. Who interacts with this system **under pressure**? (Operational audience)
3. Who **evaluates** this system from outside? (Evaluation audience)
4. Who **decides** things about this system? (Governance audience)
5. Who **maintains** this system over time? (Maintenance audience)

Not every domain has all five. But every domain has at least two. If you can only identify one, you have not modeled deeply enough.

---

## 4 — Layer 2: Content Taxonomy

### The Abstraction

Every document does exactly one of five things to the reader's mind. These five operations are universal — they apply whether you are documenting a REST API, a surgical procedure, a legal statute, or a philosophical framework.

| Type | Mental Operation | Reader's Question | Reader's State |
|------|-----------------|-------------------|----------------|
| **Tutorial** | Construct a new mental model through guided experience | "Teach me" | Does not yet know what questions to ask |
| **How-To** | Enable execution of a known task | "Help me do X" | Knows what they want, needs the steps |
| **Reference** | Provide precise lookup of specific facts | "What is the exact value of X?" | Knows what they're looking for |
| **Explanation** | Reshape or deepen an existing mental model | "Why is it this way?" | Has experience, seeks understanding |
| **Decision Record** | Preserve the reasoning behind a choice | "Why was X chosen over Y?" | Needs to understand or revisit a past decision |

### The Separation Principle

**A document MUST perform exactly one mental operation.** This is DEP's most important structural rule.

When a single document tries to perform multiple operations, it fails at all of them:

- A tutorial that includes a reference table forces the learner to process information they cannot yet contextualize.
- A reference entry that includes narrative explanation slows down the expert who needs a quick lookup.
- A how-to guide that includes architectural justification distracts the reader from their immediate task.
- An explanation that includes procedural steps confuses the reader about whether they should be doing or thinking.

**Contamination** is when a document contains patterns belonging to a different type. When contamination is detected, the solution is always **extraction**: move the contaminating content to a new document of the correct type, and replace it with a link.

### Type Signatures

Each type has structural patterns that define it and violation patterns that indicate contamination:

**Tutorial:**
- MUST contain: sequential steps, prerequisites, expected outputs after each step, a "what you built" summary.
- MUST NOT contain: exhaustive parameter lists, alternative approaches, architectural justification.

**How-To:**
- MUST contain: goal statement, action steps, verification step.
- MUST NOT contain: teaching asides ("let's understand why..."), exhaustive reference tables, historical context.

**Reference:**
- MUST contain: consistent entry structure, complete listings (parameters, fields, endpoints, properties), type information, defaults, constraints.
- MUST NOT contain: narrative paragraphs, step-by-step procedures, opinions.

**Explanation:**
- MUST contain: context-setting, conceptual narrative, tradeoffs or alternatives.
- MUST NOT contain: procedural steps, parameter tables, sequential instructions.

**Decision Record:**
- MUST contain: context, decision statement, alternatives considered with reasons for rejection, consequences, review trigger.
- MUST NOT contain: implementation procedures, API references, tutorials.

### AI Instruction

When generating a document, FIRST declare its type. Then use ONLY the patterns permitted for that type. If you find yourself wanting to include content that belongs to a different type, generate a separate document of that type and insert a cross-reference link instead.

The test for type purity: **can the reader predict the structure of the document from its type alone?** If yes, the type is pure. If the reader encounters unexpected structural shifts, the document is contaminated.

---

## 5 — Layer 3: Information Architecture

### The Abstraction

Documents do not exist in isolation. They exist in a **graph** where nodes are documents and edges are typed relationships. The graph must satisfy structural invariants — rules that hold true across the entire documentation set.

### Relationship Types

Six canonical relationships connect documents:

| Relationship | Meaning | Example |
|-------------|---------|---------|
| `TEACHES` | A tutorial introduces a concept that has a reference entry | Tutorial "Build Your First Widget" → Reference "Widget API" |
| `USES` | A how-to guide uses a component defined in a reference entry | How-To "Deploy to Production" → Reference "CLI Flags" |
| `EXPLAINS` | An explanation clarifies the rationale behind a reference entry | Explanation "Why Event Sourcing" → Reference "Event Store Schema" |
| `DECIDES` | A decision record justifies a design choice that affects a component | Decision "DR-003: Chose Postgres" → Reference "Database Configuration" |
| `REQUIRES` | A document requires another to be read first | Tutorial "Advanced Queries" → Tutorial "Basic Setup" |
| `NEXT` | A suggested follow-up after completing this document | Tutorial "Basic Setup" → Tutorial "Your First Feature" |

### The Atomicity Principle

**Prefer more files over more lines.** A document should cover one concept, one task, one entry, or one decision. When a document grows to cover multiple distinct items within the same type, split it.

The test for when to split: **if two sections of the same document could have different `owner`, `last_verified`, `confidence`, or `depends_on` values, they should be separate files.** This is the Lifecycle Independence Test — sections that age independently should live independently.

Atomic files enable:

- Precise lifecycle tracking — each file ages independently.
- Efficient AI consumption — agents load only the atoms they need.
- Clean git history — changes to one concept don't touch unrelated content.
- Clear ownership — no ambiguity about who owns what.
- Composability — documentation sets can be assembled from atoms for different audiences.

Navigation overhead from many files is mitigated by **index files** — one per directory — that provide grouped listings, brief descriptions, and suggested reading order where applicable.

See [DR-002: Atomic Files Over Long Documents](docs/decision-records/dr-002-atomic-files-over-long-documents.md) for the full rationale.

### Structural Invariants

These rules MUST hold across the entire graph:

1. **No Orphans**: Every document is reachable from at least one audience entry point through a chain of links.
2. **Reference Coverage**: Every concept introduced in a tutorial has a corresponding reference entry, and the tutorial links to it.
3. **Reciprocal Linking**: Every reference entry links back to at least one tutorial or how-to that uses it.
4. **Decision Traceability**: Every decision record links to the documents it affects, and those documents link back.
5. **Entry Point Completeness**: Every audience's entry point provides navigation to all documents tagged for that audience.
6. **Atomicity**: Every document passes the Lifecycle Independence Test — no document contains sections that should have independent lifecycle metadata.

### AI Instruction

When generating a documentation set, build the graph explicitly. After generating each document, verify:

- Does this document link to all concepts it introduces (for tutorials) or uses (for how-tos)?
- Does every link target actually exist?
- Is this document reachable from its declared audience's entry point?
- If this is a decision record, does it link to every component it affects?

Orphan documents are structural bugs. They indicate either a missing link or a document that shouldn't exist.

---

## 6 — Layer 4: Lifecycle & Governance

### The Abstraction

Documentation exists in time. Entropy is the default. Without active maintenance, every document drifts from accuracy toward harm — wrong instructions presented with the authority of official documentation.

DEP models document lifecycle as a state machine:

```
FRESH → AGING → STALE → ABANDONED
                  ↓
              DEPRECATED → ARCHIVED
```

| State | Condition | Action Required |
|-------|-----------|-----------------|
| `FRESH` | Last verified within review cadence; no dependency changes | None |
| `AGING` | Approaching review deadline (within 2× cadence) | Schedule review |
| `STALE` | Exceeds review cadence OR a dependency has changed | Owner must review within 48 hours |
| `ABANDONED` | Exceeds 3× cadence with no owner action | Escalate to fallback owner |
| `DEPRECATED` | Explicitly marked; superseded by another document | Maintain redirect; archive after one review cycle |
| `ARCHIVED` | Removed from active navigation; retained for history | No action; read-only |

### Staleness Triggers

A document transitions to `STALE` when any of these occur:

1. **Time-based**: `last_verified` exceeds the `review_cadence` for its type.
2. **Dependency-based**: Any document or artifact listed in `depends_on` has been modified since `last_verified`.
3. **Trigger-based**: A decision record's `review_trigger` condition is met (e.g., "if we exceed 10k users").

### Ownership

Every document has exactly one owner. Ownership is not authorship — the owner is responsible for accuracy, not necessarily for writing. When an owner departs, ownership transfers to the declared `fallback_owner`.

### The Deprecation Protocol

Documents are never silently deleted. The protocol is:

1. Mark the document `confidence: stale` with a deprecation notice.
2. Add a `superseded_by` link to the replacement.
3. Update all incoming links to point to the replacement.
4. After one full review cycle with no incoming references, move to archive.

### AI Instruction

When generating documentation, always populate the lifecycle metadata:

- `owner`: who is accountable for this document's accuracy.
- `last_verified`: the datetime the content was confirmed accurate (ISO 8601 with timezone).
- `confidence`: your honest assessment — `high` if generated from verified source material, `medium` if inferred, `low` if speculative.
- `depends_on`: list every document or external artifact that, if changed, could invalidate this document.

When auditing existing documentation, flag every document that lacks this metadata as a governance gap.

---

## 7 — Layer 5: Generation & Validation

### The Abstraction

Documentation is produced by writers (human or AI) and verified by validators (automated rules). DEP separates these concerns and defines the interface between them.

### Generation Constraints

An AI generating documentation operates under constraints, not suggestions. The constraints are:

1. **Type constraint**: The document type is declared before generation begins. All content must conform to the type signature.
2. **Audience constraint**: The declared audience determines vocabulary level, assumed knowledge, and depth.
3. **Scope constraint**: The document covers exactly what is declared — no more, no less.
4. **Link constraint**: Every concept introduced or used must be cross-referenced to its canonical document.
5. **Metadata constraint**: The DEP metadata block must be complete and valid.

### Generation Inputs

Each document type requires specific inputs before generation can begin:

| Type | Required Inputs |
|------|----------------|
| Tutorial | Audience, learning objective, prerequisites, description of the final artifact the reader will produce |
| How-To | Audience, goal statement, prerequisites |
| Reference | Source artifact (schema, API spec, config, codebase), audience |
| Explanation | Audience, concept to explain, related decisions or constraints |
| Decision Record | Context, decision, alternatives considered, participants |

**If the required inputs are not available, do not generate. Request them.**

### Validation Rules

Validators check both individual documents and the graph as a whole.

**Document-level checks:**

- Metadata block is present and valid.
- Declared type is one of the five canonical types.
- Declared audience references a defined persona.
- Document structure matches the type signature (required patterns present, violation patterns absent).
- All internal links resolve.

**Graph-level checks:**

- No orphan documents.
- Reference coverage (tutorials link to reference entries for concepts introduced).
- Reciprocal linking (reference entries link back to tutorials/how-tos).
- Entry point completeness (all documents reachable from their audience's entry point).
- No circular dependency chains.

**Freshness checks:**

- No documents in `STALE` state without an open review task.
- No documents in `ABANDONED` state.
- No dependency changes since `last_verified`.

### AI Instruction

After generating any document, run all document-level validation checks against it before presenting it. If any check fails, fix the document before output. Specifically:

1. Verify the metadata block is complete.
2. Verify no type contamination exists (check for violation patterns).
3. Verify all internal links point to real documents.
4. Verify vocabulary matches declared audience level.

When generating a documentation set (multiple documents), additionally run graph-level checks after the full set is generated.

---

## Further Reading

The following topics have been extracted into dedicated documents for independent lifecycle management:

- [The `.docspec` File](docs/explanation/docspec-file.md) — The machine-readable root configuration abstraction
- [Domain Generalization](docs/explanation/domain-generalization.md) — How DEP applies across any domain
- [Anti-Patterns](docs/explanation/anti-patterns.md) — The six most common documentation failures DEP prevents
- [Bootstrap Sequence for AI](docs/explanation/bootstrap-sequence.md) — The operational protocol for generating DEP-compliant documentation
- [Extension Points](docs/explanation/extension-points.md) — Custom types, validators, and relationships

---

## 8 — Meta-Compliance

This document complies with its own protocol:

| Check | Status |
|-------|--------|
| Has valid DEP metadata block | ✓ |
| Declares exactly one type (`explanation`) | ✓ |
| Declares audience (`ai-generator`) | ✓ |
| Declares owner (`@dep-core`) | ✓ |
| Has `last_verified` date | ✓ |
| Has `confidence` level | ✓ |
| Contains no type contamination (no procedural steps, no reference tables, no tutorial sequences) | ✓ |
| Narrative structure with conceptual depth | ✓ |
| Tradeoffs and alternatives discussed | ✓ |

This document does not contain tutorials, reference tables, or how-to procedures. It *explains*. Sections covering the `.docspec` file, domain generalization, anti-patterns, bootstrap sequence, and extension points have been extracted into dedicated explanation documents (see Further Reading above) to respect the Lifecycle Independence Test.

---

*This seed document is the root node of the DEP knowledge graph. Everything grows from here.*
