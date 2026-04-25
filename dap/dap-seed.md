---
dap:
  id: dap-seed
  version: 1
  trigger: "AI agent needs to understand the Decision Action Protocol"
  audience: [ai-agent, ai-generator]
  owner: "@dap-core"
  created: 2026-04-25T12:00:00+02:00
  last_verified: 2026-04-25T12:00:00+02:00
  confidence: high
  depends_on: []
  tags: [meta, seed, protocol, bootstrap]
  entry_node: understand-dap
---

# Decision Action Protocol -- Seed Document

## Purpose of This Document

This is the **seed document** of the Decision Action Protocol (DAP). It is written for AI systems that will use it as the foundational input for creating, navigating, and executing decision trees that govern action upon documented systems.

This document is self-referential: it follows the protocol it describes. Its metadata block above is a valid DAP header. It practices what it prescribes.

DAP is a **companion protocol** to DEP (Documentation Engineering Protocol). DEP structures knowledge. DAP structures decisions.

---

## 1 -- The Core Problem

DEP solves `System -> [Documentation] -> Understanding`. After an AI agent navigates DEP documentation, it understands the system. But understanding is not action. What happens next is improvisation -- the agent applies general reasoning to decide what to do, with no structured protocol for decision-making.

The gap: `Understanding -> [???] -> Action`

This gap is a context engineering problem. LLM agents have limited context windows. DEP solves this for knowledge by making documentation navigable -- the agent loads only what's relevant via CLI commands. The same constraint applies to decision logic: you cannot dump an entire decision playbook into context. It must be **navigable** -- the agent loads one decision node at a time, evaluates it, follows a branch, loads the next node.

**DAP fills this gap.**

```
DEP:  System -> [navigable docs] -> Understanding
DAP:  Understanding -> [navigable decisions] -> Action
```

---

## 2 -- The Core Abstraction

### The Decision Tree

A DAP artifact is a **decision tree** -- a directed acyclic graph of nodes that routes from a **trigger** (a situation or intent) through **observations** (context evaluation) and **decisions** (branching logic) to **actions** (what to do).

**Foundational equation:**

```
Route = f(Trigger, Context, KnowledgeGraph)
```

A route is a function of what initiated the decision process, what the current state of the world is, and what the agent knows (via DEP or otherwise). The same trigger with different context produces different actions.

### Why Decision Trees

| Abstraction | Strength | Weakness |
| --- | --- | --- |
| Routing table | Fast lookup | No conditional logic |
| State machine | Models ongoing processes | Over-engineered for single decisions; conflates decision with state |
| Decision tree | Models conditional reasoning; each path is auditable | Cannot model loops |

Decision trees are the right abstraction because:

1. **Acyclic by construction** -- a decision process must terminate.
2. **Auditable** -- every path from root to leaf is an explicit reasoning chain.
3. **Composable** -- one tree can delegate to another.
4. **AI-native** -- LLMs think in decision trees implicitly; DAP makes them explicit.
5. **Context-efficient** -- trees can be traversed node-by-node, loading minimal context.

---

## 3 -- The Four Node Types

Every node in a DAP tree performs exactly one of four operations:

| Type | Symbol | Operation | Analogy |
| --- | --- | --- | --- |
| **observe** | `[?]` | Gather information about the current context | Sensor |
| **decide** | `[>]` | Branch based on observed values | Router |
| **act** | `[!]` | Execute a leaf action | Effector |
| **delegate** | `[@]` | Transfer control to another DAP tree | Subroutine |

### Why These Four

- **observe** separates "looking" from "choosing." An agent must determine the state of the world before branching. Making observation explicit prevents decisions without checking preconditions.
- **decide** is pure branching logic. It has no side effects. It evaluates conditions against observed values and routes to the next node.
- **act** is the leaf. It produces side effects. Separating it from decide ensures branching never accidentally triggers actions.
- **delegate** enables composability without inlining entire trees. It is the "function call" of DAP.

### Node Schemas

#### Observe Node `[?]`

```markdown
## check-status [?]

Description of what to observe.

- **method**: tool_call | prompt | eval | dep_lookup
- **tool**: <tool_name>          # if method is tool_call
- **args**: { ... }              # if method is tool_call
- **prompt**: "question"         # if method is prompt
- **expr**: "expression"         # if method is eval
- **outputs**: var1, var2        # variables added to context
- **next**: <node-id>
```

Observation methods:

| Method | Description |
| --- | --- |
| `tool_call` | Invoke a tool to gather data |
| `prompt` | Ask the user for input |
| `eval` | Evaluate an expression against existing context |
| `dep_lookup` | Query the DEP graph for document status or content |

#### Decide Node `[>]`

```markdown
## route-by-status [>]

Description of the branching logic.

| condition | next |
| --- | --- |
| `status == "healthy"` | proceed-node |
| `status == "degraded"` | fallback-node |
| `_otherwise` | escalate-node |
```

Every decide node MUST have an `_otherwise` row as its last condition. This prevents unhandled cases.

#### Act Node `[!]`

```markdown
## deploy-app [!]

Description of the action.

- **action_type**: tool_call | document | intent
- **tool**: <tool_name>                    # if tool_call
- **args**: { ... }                        # if tool_call
- **ref**: dep://path/to/doc.md            # if document
- **intent**: <intent_id>                  # if intent
- **params**: { ... }                      # if intent
- **summary**: "brief description"         # for document actions
- **on_success**: <node-id>                # optional continuation
- **on_failure**: <node-id>                # optional error path
- **terminal**: true | false               # true if this ends the tree
```

#### Delegate Node `[@]`

```markdown
## handle-rollback [@]

Description of the delegation.

- **delegate_to**: dap://tree-id.md
- **pass_context**: { key: "{{ value }}" }
- **on_return**: <node-id>                 # optional continuation
- **terminal**: true | false
```

---

## 4 -- The Three Action Types

Act nodes support three action types, ordered by specificity:

### tool_call

Direct invocation of a tool or API. Most concrete.

```yaml
- action_type: tool_call
- tool: deploy_application
- args: { "env": "production", "version": "{{ version }}" }
```

### document

Delegates execution to a DEP document (typically a how-to). The agent reads and follows the referenced document's steps.

```yaml
- action_type: document
- ref: dep://docs/how-to/run-migrations.md
- summary: "Follow the migration how-to, then continue"
```

This bridges DAP back to DEP. The `summary` field provides a fallback if the DEP document is unavailable.

### intent

An abstract action resolved by the agent based on its capabilities. Most flexible.

```yaml
- action_type: intent
- intent: notify_oncall
- params: { "severity": "warning", "message": "Deployment blocked" }
```

Intents are capability-agnostic. The intent `notify_oncall` does not specify how to notify -- that depends on the agent's available tools (Slack, PagerDuty, email, etc.).

### Resolution Priority

When multiple action types could apply, prefer in this order:
1. `tool_call` -- most specific, least ambiguous
2. `document` -- grounded in documented procedures
3. `intent` -- most flexible, requires runtime resolution

---

## 5 -- Context Engineering: Progressive Loading

DAP's defining characteristic is **progressive context loading**. The agent never loads an entire decision tree into context. Instead, it traverses node-by-node via CLI:

```
Agent encounters trigger
  -> dap resolve "user reports error"       -> returns tree-id + entry node
  -> dap node triage-issue gather-symptoms  -> returns just that node
  -> Agent evaluates, picks branch
  -> dap node triage-issue classify-issue   -> returns next node
  -> Branch references dep://error-codes.md
  -> dep search "error-codes"               -> loads just that DEP doc
  -> Agent acts
```

Each step: one small, targeted context load. The agent's context at any moment holds only the current node plus any relevant DEP document. Not the whole tree, not all the docs.

This is the same pattern DEP uses for knowledge navigation, applied to decisions.

---

## 6 -- File Format

### Frontmatter

DAP trees use YAML frontmatter under a `dap:` key, mirroring DEP's `dep:` key:

```yaml
---
dap:
  id: tree-identifier
  version: 1
  trigger: "natural language description of when this tree applies"
  trigger_patterns:              # optional: machine-matchable patterns
    - "deploy * to production"
    - intent: deploy_production
  audience: [ai-agent]           # DEP audience IDs
  owner: "@team"
  created: ISO-8601
  last_verified: ISO-8601
  confidence: high | medium | low | stale
  depends_on: []                 # DEP docs or other DAP trees
  tags: [...]
  entry_node: first-node-id
---
```

### Body

The tree body uses structured markdown. Each node is an H2 heading with the format:

```
## node-id [symbol]
```

Where `symbol` is one of `[?]`, `[>]`, `[!]`, `[@]`.

Node properties are expressed as markdown list items with bold keys:

```markdown
- **key**: value
```

Decision tables use standard markdown tables.

### File Granularity

- **Small trees**: single `.md` file containing all nodes. The CLI extracts specific nodes on demand.
- **Large trees**: can split nodes into separate files linked via metadata. Each node file uses the same frontmatter but adds a `node_of: tree-id` field.
- The author decides based on complexity.

---

## 7 -- Integration with DEP

DAP is a **consumer** of DEP, not an extension. The relationship is asymmetric:

- **DEP has zero knowledge of DAP.** DEP documents, tools, and validation are unaffected.
- **DAP optionally references DEP.** Via `dep://` URIs in document actions and `depends_on` fields.
- **Shared audience IDs.** DAP trees declare audiences using IDs from DEP's `.docspec`.

### dep:// URIs

DAP references DEP documents using `dep://` path URIs:

```
dep://docs/how-to/deploy-to-production.md
dep://docs/reference/error-codes.md
```

These resolve relative to DEP's project root. When DEP is present, the DAP CLI validates that references resolve. When DEP is absent, validation warns but does not fail.

### dap:// URIs

DAP trees reference other DAP trees using `dap://` URIs:

```
dap://rollback-procedure.md
```

These resolve relative to `.dapspec`'s `trees_root`.

---

## 8 -- Lifecycle

DAP trees have lifecycle management identical to DEP documents:

| State | Condition |
| --- | --- |
| FRESH | `last_verified` within `review_cadence` |
| AGING | Approaching cadence deadline |
| STALE | Exceeds cadence, or a dependency has changed |

Staleness triggers:
1. **Time-based**: Same as DEP.
2. **DEP dependency**: If a referenced DEP document changes, the DAP tree that references it may go STALE.
3. **Tree dependency**: If a delegated-to tree changes, the delegating tree may go STALE.

---

## 9 -- Validation Rules

### Tree-Level

1. **Frontmatter complete**: All required `dap:` fields present.
2. **Entry node exists**: `entry_node` references a defined node.
3. **All nodes reachable**: Every node reachable from `entry_node`.
4. **No orphan nodes**: No unreachable nodes.
5. **Acyclicity**: The node graph is a DAG.
6. **Terminal coverage**: Every path reaches a `terminal: true` node or a delegate.
7. **Type correctness**: Observe nodes have `method` + `outputs`, decide nodes have condition tables, act nodes have `action_type`, delegate nodes have `delegate_to`.
8. **Otherwise clause**: Every decide node has `_otherwise` as its last condition.

### Cross-Reference

9. **DEP URI resolution**: All `dep://` references point to existing DEP documents.
10. **DAP URI resolution**: All `dap://` references point to existing DAP trees.
11. **Audience consistency**: Tree audiences must be valid IDs from `.docspec` (when DEP is present).

### Graph-Level (across trees)

12. **No delegation cycles**: The delegation graph between trees is acyclic.
13. **Trigger uniqueness**: No two trees have identical triggers (warning-level).

---

## 10 -- The .dapspec Configuration

Project-level configuration lives in `.dapspec` at the DAP root:

```yaml
dap_version: "0.1.0"

project:
  name: "Project Name"
  trees_root: "./trees"
  description: "Decision trees for ..."

dep_integration:
  docspec_path: "../.docspec"    # optional path to DEP config
  resolve_dep_refs: true

intent_registry:
  - id: escalate
    description: "Escalate to human operator"
    required_params: [reason]
  - id: notify
    description: "Send notification"
    required_params: [severity, message]

governance:
  review_cadence: 60             # days, for all trees
  fallback_owner: "@team"
```

---

## 11 -- Design Principles

| Principle | Expression |
| --- | --- |
| One decision per tree | A tree solves one trigger. Split when triggers diverge. |
| Acyclicity | Trees are DAGs. Decisions must terminate. |
| Progressive loading | Traverse node-by-node. Never load the whole tree. |
| No runtime engine | DAP defines structure, not execution. Agent frameworks interpret DAP trees. |
| No state persistence | Trees are stateless logic. State lives in the agent framework. |
| No loops | Model retries as observe->decide->act chains with explicit limits. |
| Composability | Trees delegate to trees. Keep each tree focused. |
| Audience-first | Every tree declares who it serves. |

---

## 12 -- Variable Scoping

Variables flow through the tree via a **context object**:

1. **Tree inputs**: Passed when the tree is triggered (from user request or parent tree's `pass_context`).
2. **Observe outputs**: Each observe node appends its `outputs` to the context.
3. **Built-in variables**: `_tree_id`, `_current_node`, `_tree_context` (full context dump).
4. **Interpolation**: `{{ variable_name }}` syntax in args, params, and conditions.

Context is scoped to a single tree execution. When delegating, only `pass_context` fields are forwarded.

---

## 13 -- What DAP Does NOT Do

1. **No runtime engine**: DAP defines the structure of decisions, not the execution engine.
2. **No state persistence**: Trees are stateless logic. Multi-turn workflows are the agent framework's responsibility.
3. **No scheduling**: DAP does not model when trees should run. Triggers are matched, not scheduled.
4. **No permissions**: DAP does not model who can execute an action. That is the tool layer's responsibility.
5. **No loops**: Trees are DAGs. Retry logic is modeled as observe->decide->act chains with termination conditions.

---

## understand-dap [?]

This node is the entry point for understanding this document itself.

- **method**: eval
- **expr**: "reader has loaded this document"
- **outputs**: dap_understood
- **next**: ready-to-act

## ready-to-act [!]

The reader now understands DAP and can begin creating decision trees.

- **action_type**: intent
- **intent**: begin_authoring
- **params**: { "protocol": "DAP", "start_with": "identify triggers" }
- **terminal**: true
