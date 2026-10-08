# DEP — Desired User Stories (BDD)

Black-box acceptance criteria for a capability that **does not exist yet**: using DEP as an
embedded context engine — a governed retrieval layer that assembles a budgeted, explainable,
freshness-aware context bundle for whoever is about to consume it.

These stories continue the numbering of the shipped stories in
[`../user-stories/dep.feature.md`](../user-stories/dep.feature.md) (FLOW-01 … FLOW-23), so a flow
tag means the same thing across the whole product. Everything here is desired behaviour: the
`# Design:` comments point at [`context-engine-design.md`](context-engine-design.md), and
`# Source:` comments point at the shipped code a flow extends or corrects.

Every step below is either an **input** an actor provides or an **observable output** the product
returns. Nothing describes internals — no scenario names a scoring formula, a storage engine or a
traversal algorithm, only what the actor can observe.

Assumptions and deliberate design decisions are tagged `@wip @later` inline and listed under
[Open questions](#open-questions) at the end of this file.

```gherkin
@flow-24 @ai-agent @context @mvp
Feature: FLOW-24 Assemble a context bundle within a budget
  """
  As an AI agent about to answer a question against a governed documentation set,
  I want to ask for the most useful context that fits a size budget I declare,
  so that I spend my context window on knowledge that earns its place instead of on
  whatever a similarity search happened to return.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#pipeline
  # Design: docs/desired-user-stories/context-engine-design.md#budget
  # Source: cli/src/commands/search.ts

  Background:
    Given a project configured for DEP
    And its documents have been indexed for meaning-based retrieval

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @mvp
  Scenario: Ask a question and receive context that fits
    # Design: docs/desired-user-stories/context-engine-design.md#budget
    Given I declare a budget of 8000 tokens
    When I ask for context for "how is a document's freshness decided"
    Then I receive a bundle of passages
    And the bundle's total size is at or below the budget I declared
    And I am told how much of the budget the bundle consumed
    And each passage names the document it came from

  @happy-path @mvp
  Scenario: The most useful context comes first
    Given I declare a budget
    When I ask for context for a question
    Then the passages are ordered by how much they contribute to answering it
    And a consumer that reads only the beginning of the bundle loses the least useful part

  @happy-path
  Scenario: A smaller bundle than the budget allows is a valid answer
    Given only two passages in the set are relevant to my question
    And I declare a budget large enough for twenty
    When I ask for context
    Then I receive only those two passages
    And I am told the budget was not exhausted
    And no weakly-related passage is added to consume the remaining budget

  @happy-path
  Scenario: Ask for the answer in a form a program can consume
    When I ask for context and request a machine-readable answer
    Then I receive the bundle as structured data
    And each passage carries its source, its size, its freshness and why it was chosen

  # ─────────────────────────────────────────────
  # Data-Driven
  # ─────────────────────────────────────────────

  @data-driven @mvp
  Scenario Outline: A declared budget is a ceiling, never a target
    Given I declare a budget of "<budget>"
    When I ask for context for a question the set covers well
    Then the bundle's total size is at or below "<budget>"
    And I am told the size of what I received

    Examples:
      | budget |
      | 500    |
      | 2000   |
      | 8000   |
      | 32000  |

  # ─────────────────────────────────────────────
  # Validation
  # ─────────────────────────────────────────────

  @validation
  Scenario Outline: Reject a budget that cannot be honoured
    When I ask for context with a budget of "<budget>"
    Then the request is refused
    And I am told "<message>"
    And no bundle is produced

    Examples:
      | budget | message                              |
      | 0      | budget must be a positive number     |
      | -100   | budget must be a positive number     |
      | many   | budget must be a positive number     |

  @validation
  Scenario: Passages below the relevance floor are left out
    Given I declare a relevance floor
    And several passages match my question only faintly
    When I ask for context
    Then those passages are absent from the bundle
    And they are absent even though the budget could have held them

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: The budget is too small for even the best passage
    Given the single most relevant passage is larger than the budget I declared
    When I ask for context
    Then I am told that no passage fits the declared budget
    And I am told the smallest budget that would return something
    And I do not receive a truncated passage presented as whole

  @edge-case
  Scenario: Nothing in the set is about the question
    When I ask for context for a subject the set does not cover
    Then I receive an empty bundle
    And I am told plainly that nothing matched
    And this is reported as an answer, not as a failure

  @edge-case @wip @later
  Scenario: Retrieval without a meaning-based index
    # Design: docs/desired-user-stories/context-engine-design.md#pipeline
    Given the set has never been indexed for meaning
    When I ask for context
    Then I still receive a bundle ranked by wording alone
    And I am told the bundle was assembled without meaning-based ranking
    And I am told how to build the index

  @error
  Scenario: The project is not configured for DEP
    Given a project that holds no DEP configuration
    When I ask for context
    Then I am told which configuration file is missing
    And no bundle is produced

# ═══════════════════════════════════════════════════════════════

@flow-25 @ai-agent @lifecycle @mvp
Feature: FLOW-25 Keep expired knowledge out of the bundle
  """
  As an AI agent that will state what it retrieves as fact,
  I want knowledge that is past its review date withheld or clearly marked,
  so that I never present expired truth with the same confidence as verified truth.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#freshness
  # Source: cli/src/graph.ts

  Background:
    Given a project whose documents declare when they were last verified
    And whose configuration declares a review cadence per document type

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @mvp
  Scenario: Expired knowledge is withheld by default
    Given a document that is past its review cadence matches my question
    When I ask for context
    Then its passages are absent from the bundle
    And I am told a matching document was withheld for being past its review date

  @happy-path @mvp
  Scenario: Ageing knowledge is served but marked
    Given a document approaching its review cadence matches my question
    When I ask for context
    Then its passages are present in the bundle
    And each carries the date it was last verified
    And each is marked as approaching its review date

  @happy-path
  Scenario: Ask for expired knowledge deliberately
    Given expired documents match my question
    When I ask for context and declare that expired knowledge is acceptable
    Then their passages are present in the bundle
    And each is marked as past its review date
    And each carries the date it was last verified

  # ─────────────────────────────────────────────
  # Data-Driven
  # ─────────────────────────────────────────────

  @data-driven
  Scenario Outline: How each freshness state reaches the bundle
    Given a matching document whose freshness is "<state>"
    When I ask for context without declaring a freshness preference
    Then it is "<treatment>"

    Examples:
      | state  | treatment                            |
      | fresh  | served without a freshness remark    |
      | ageing | served and marked as ageing          |
      | stale  | withheld and reported as withheld    |

  @data-driven
  Scenario Outline: A document's declared confidence reaches the consumer
    Given a matching document that declares confidence "<confidence>"
    When I ask for context
    Then its passages carry the declared confidence "<confidence>"

    Examples:
      | confidence |
      | high       |
      | medium     |
      | low        |
      | stale      |

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case @mvp
  Scenario: An expired document that a served passage depends on
    # Design: docs/desired-user-stories/context-engine-design.md#freshness
    Given a fresh passage is selected for the bundle
    And a document it requires is past its review date
    When I ask for context
    Then the required document is present in the bundle
    And it is marked as past its review date
    And I am told it was included because a served passage requires it

  @edge-case
  Scenario: Everything that matches has expired
    Given every document matching my question is past its review date
    When I ask for context without declaring that expired knowledge is acceptable
    Then I receive an empty bundle
    And I am told matches exist but all of them have expired
    And I am told the most recent verification date among them

  @edge-case
  Scenario: A document claims it was verified in the future
    Given a document declares a verification date later than today
    When I ask for context
    Then it is treated as verified now
    And I am told its verification date is later than today

  @error
  Scenario: No review cadence is declared for a document's type
    Given the project's configuration declares no review cadence for a matched document's type
    When I ask for context
    Then its passages are present in the bundle
    And each is marked as having unknown freshness
    And I am told which cadence the configuration is missing

  @validation
  Scenario: Reject an unknown freshness preference
    When I ask for context declaring a freshness preference the product does not define
    Then the request is refused
    And I am told which freshness preferences are accepted

# ═══════════════════════════════════════════════════════════════

@flow-26 @ai-agent @context @should
Feature: FLOW-26 Scope a bundle to the consumer it is for
  """
  As an AI agent retrieving on behalf of a particular reader or task,
  I want to narrow a bundle to the audience, type, subject or part of the set that applies,
  so that the budget is spent on knowledge written for this consumer rather than on
  everything the set happens to say about the subject.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#pipeline
  # Source: cli/src/commands/search.ts
  # Source: cli/src/commands/query.ts

  Background:
    Given a project whose configuration declares its audiences
    And whose documents declare the audiences they are written for

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @should
  Scenario: Retrieve only what is written for one audience
    Given documents in the set are written for different audiences
    When I ask for context and declare the audience I am retrieving for
    Then every passage in the bundle comes from a document written for that audience
    And documents written only for other audiences are absent

  @happy-path
  Scenario: Retrieve only from part of the set
    When I ask for context and confine the request to one part of the documentation set
    Then every passage comes from that part
    And I am told how many documents were considered

  @happy-path
  Scenario: Combine several restrictions
    When I ask for context restricted by audience and by subject tag at once
    Then every passage satisfies both restrictions
    And a passage satisfying only one of them is absent

  # ─────────────────────────────────────────────
  # Data-Driven
  # ─────────────────────────────────────────────

  @data-driven
  Scenario Outline: Restrict a bundle to one kind of mental operation
    When I ask for context restricted to documents of type "<type>"
    Then every passage comes from a document of type "<type>"

    Examples:
      | type            |
      | tutorial        |
      | how-to          |
      | reference       |
      | explanation     |
      | decision-record |

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case @mvp
  Scenario: A restriction never hides a document that would have qualified
    # Source: cli/src/commands/search.ts
    Given a document that satisfies my restriction is a weaker match than many documents that do not
    When I ask for context with that restriction
    Then that document is still considered for the bundle
    And it is present if it is relevant enough to earn its place
    And the restriction is applied before the field is narrowed, not after

  @edge-case
  Scenario: A restriction that excludes everything
    When I ask for context with a restriction no document satisfies
    Then I receive an empty bundle
    And I am told the restriction excluded every candidate
    And this is reported as an answer, not as a failure

  @error
  Scenario: The project declares no audiences at all
    Given a project whose configuration declares no audiences
    When I ask for context restricted to an audience
    Then the request is refused
    And I am told the project declares no audiences to restrict by
    And I am told an unrestricted request would still succeed

  @validation
  Scenario: Reject an audience the project does not declare
    When I ask for context declaring an audience absent from the project's configuration
    Then the request is refused
    And I am told which audiences the project declares

  @validation
  Scenario: Reject a document type outside the five canonical types
    When I ask for context restricted to a type the protocol does not define
    Then the request is refused
    And I am told the five accepted types

# ═══════════════════════════════════════════════════════════════

@flow-27 @ai-agent @graph @mvp
Feature: FLOW-27 Pull in what the answer assumes I already know
  """
  As an AI agent given a passage that answers my question,
  I want the knowledge that passage assumes pulled in with it, in reading order,
  so that I understand the answer rather than merely holding it.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#pipeline
  # Source: cli/src/commands/prereqs.ts
  # Source: cli/src/commands/neighbors.ts

  Background:
    Given a project whose documents declare typed relationships to each other

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @mvp
  Scenario: Prerequisites arrive with the passage that needs them
    Given the passage answering my question comes from a document that requires another document
    When I ask for context
    Then the required document is present in the bundle
    And it appears before the passage that requires it

  @happy-path @mvp
  Scenario: Widely-depended-upon knowledge outranks an isolated match
    Given two documents match my question equally well
    And many other documents in the set require the first one
    And nothing requires the second
    When I ask for context
    Then the first appears before the second in the bundle
    And if only one of them fits the budget, it is the first

  @happy-path
  Scenario: Limit how far the expansion reaches
    When I ask for context and declare how many relationships deep the expansion may reach
    Then no passage in the bundle is further from a matched passage than the depth I declared
    And I am told how many passages were reached by expansion rather than by matching

  # ─────────────────────────────────────────────
  # Data-Driven
  # ─────────────────────────────────────────────

  @data-driven
  Scenario Outline: How each kind of relationship pulls knowledge in
    Given a matched document relates to a neighbouring document as "<relationship>"
    When I ask for context with a budget that can hold only some of the candidates
    Then the neighbour's chance of being pulled in is "<influence>"

    Examples:
      | relationship | influence |
      | REQUIRES     | strongest |
      | TEACHES      | strong    |
      | EXPLAINS     | strong    |
      | USES         | moderate  |
      | NEXT         | weak      |
      | INLINE       | weakest   |

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case @mvp
  Scenario: Expansion can never overflow the budget
    Given a matched passage requires more knowledge than the budget can hold
    When I ask for context
    Then the bundle's total size is still at or below the budget
    And I am told the prerequisite chain did not fit
    And I am given the ordered list of what was left out

  @edge-case
  Scenario: Documents that require each other in a circle
    Given two documents each require the other
    And one of them matches my question
    When I ask for context
    Then the bundle is still produced
    And each document appears at most once
    And I am told the requirement chain closes on itself

  @error
  Scenario: A prerequisite that no longer exists
    Given a matched document requires a document that is absent from the set
    When I ask for context
    Then the bundle is still produced
    And I am told which required document could not be found

  @validation
  Scenario Outline: Reject an expansion depth that cannot be honoured
    When I ask for context declaring an expansion depth of "<depth>"
    Then the request is refused
    And I am told "<message>"

    Examples:
      | depth | message                                  |
      | -1    | expansion depth must not be negative     |
      | deep  | expansion depth must be a whole number   |

  @edge-case
  Scenario: Expansion is skipped when it is not wanted
    When I ask for context and decline expansion along relationships
    Then every passage in the bundle is there because it matched my question
    And no passage is present solely because another passage requires it

# ═══════════════════════════════════════════════════════════════

@flow-28 @ai-agent @provenance @should
Feature: FLOW-28 Explain why every piece of context was chosen
  """
  As an AI agent that will be held to what it says,
  I want every passage to carry where it came from, how fresh it is and why it is here,
  so that I can cite it, weigh it, and tell the difference between an answer and
  the background that surrounds it.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#provenance

  Background:
    Given a project configured for DEP and indexed for retrieval

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @should
  Scenario: Every passage says where it came from
    When I ask for context
    Then each passage names its source document and the section within it
    And each passage carries the size it contributed to the budget

  @happy-path @should
  Scenario: Every passage says why it is in the bundle
    # Design: docs/desired-user-stories/context-engine-design.md#provenance
    When I ask for context
    Then each passage declares whether it matched my question directly, was required by another passage, or was reached by expanding from one
    And a passage present only as background is not presented as an answer

  @happy-path
  Scenario: Cite the bundle back to a person
    Given I have answered a question from a bundle
    When I am asked where the answer came from
    Then I can name the document and section behind each part of it
    And I can state when each was last verified

  @happy-path
  Scenario: The same request produces the same bundle
    Given the documentation set and the index have not changed
    When I ask the same question with the same budget and restrictions twice
    Then I receive the same passages in the same order both times

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: A source document changed after it was indexed
    Given a document was edited after the index was last built
    When a passage from that document is selected for a bundle
    Then that passage is marked as possibly out of step with its document
    And I am told how to bring the index up to date

  @edge-case
  Scenario: Knowing which index the bundle was built against
    When I ask for context
    Then I am told when the index it was drawn from was last built

  @edge-case
  Scenario: A passage whose document declares no owner
    Given a matched document declares no owner
    When I ask for context
    Then the passage names the project's fallback owner
    And it is marked as inheriting that owner rather than declaring one

  @validation
  Scenario: Provenance cannot be turned off
    When I ask for context and request the passages without their provenance
    Then the request is refused
    And I am told provenance is part of every bundle
    And a bundle is never produced with passages that cannot be traced

  @error
  Scenario: A passage whose source document has been deleted
    Given the index still holds passages from a document that no longer exists
    When I ask for context
    Then those passages are absent from the bundle
    And I am told the index is behind the documentation set

# ═══════════════════════════════════════════════════════════════

@flow-29 @developer @api @mvp
Feature: FLOW-29 Embed the retriever in my own program
  """
  As a developer building an assistant of my own,
  I want to call DEP's retrieval directly from my program and receive values back,
  so that I can govern my assistant's context without shelling out to a command
  and parsing what it printed.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: cli/src/commands/search.ts
  # Source: cli/src/index.ts

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @mvp
  Scenario: Ask for context from inside my own program
    Given I have added DEP to my project as a dependency
    When I ask for context from my own code
    Then I receive the bundle as a value I can work with
    And no separate process is started on my behalf

  @happy-path @mvp
  Scenario: Open a documentation set once and ask many questions
    Given I have opened a documentation set
    When I ask twenty questions against it in one run
    Then every answer reflects the same documentation set
    And the set is not re-read from disk for each question

  @happy-path
  Scenario: The command and the code give the same answer
    Given the same project, question, budget and restrictions
    When I ask for context through the command and through my own code
    Then both produce the same passages in the same order

  # ─────────────────────────────────────────────
  # Data-Driven
  # ─────────────────────────────────────────────

  @data-driven
  Scenario Outline: Capabilities available to a program, not only to a command
    When I request "<capability>" from my own code
    Then I receive the result as a value
    And nothing is written to my program's output stream

    Examples:
      | capability                     |
      | a budgeted context bundle      |
      | a search over the set          |
      | the documentation graph        |
      | a validation verdict           |
      | a document's metadata          |

  # ─────────────────────────────────────────────
  # Errors & Isolation
  # ─────────────────────────────────────────────

  @error @mvp
  Scenario: A bad request never ends my program
    When I ask for context with a budget my program computed wrongly
    Then I am handed a failure I can catch and recover from
    And my program keeps running
    And nothing is written to my program's output stream

  @error
  Scenario: A missing documentation set is reported, not printed
    Given I point at a directory that holds no DEP configuration
    When I open it from my own code
    Then I am handed a failure naming the missing configuration
    And my program keeps running

  @validation
  Scenario: Reject opening something that is not a documentation set
    When I open a location that is not a directory
    Then I am handed a failure naming the location
    And my program keeps running

  @edge-case
  Scenario: Two documentation sets open at the same time
    Given I have opened two different documentation sets in one program
    When I ask a question against each of them
    Then each answer draws only on its own set
    And neither set's configuration affects the other

  @security @mvp
  Scenario: Nothing leaves the machine unless I choose it
    Given I have chosen the retrieval method that runs on my own machine
    When I ask for context
    Then no request leaves the machine
    And my question is not sent to any external service

  @security
  Scenario: An external retrieval method is used only with my credentials
    Given I have chosen a retrieval method provided by an external service
    And I have not supplied credentials for it
    When I ask for context
    Then the request is refused
    And I am told which credential is missing

# ═══════════════════════════════════════════════════════════════

@flow-30 @developer @indexing @should
Feature: FLOW-30 Keep retrieval current as the documents change
  """
  As a developer whose documentation changes every day,
  I want the retrievable knowledge to follow the documents without a full rebuild,
  so that what my assistant retrieves is what the set actually says right now.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#pipeline
  # Source: cli/src/commands/vectorize.ts

  Background:
    Given a project whose documents have already been indexed for retrieval

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @should
  Scenario: Only what changed is processed again
    Given I have edited three documents out of two hundred
    When I bring the index up to date
    Then I am told three documents were processed again
    And I am told the rest were reused unchanged

  @happy-path @should
  Scenario: A change is retrievable straight away
    Given I have added a paragraph answering a question the set could not answer before
    When I bring the index up to date
    And I ask for context for that question
    Then the new paragraph is present in the bundle

  @happy-path
  Scenario: Bringing the index up to date after each commit
    Given the project brings its index up to date whenever a commit lands
    When a commit changes two documents
    Then the index is brought up to date without my asking
    And I am told which documents were processed again

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: A deleted document stops being retrievable
    Given I have deleted a document
    When I bring the index up to date
    And I ask a question that document used to answer
    Then none of its passages are present in the bundle

  @edge-case
  Scenario: A moved document keeps its knowledge and loses its old address
    Given I have moved a document to a different part of the set
    When I bring the index up to date
    And I ask a question that document answers
    Then its passages are present and name its new location
    And no passage names its previous location

  @edge-case
  Scenario: The retrieval method has changed since the index was built
    Given the index was built with a different retrieval method than the one now configured
    When I bring the index up to date
    Then I am told the index cannot be mixed with a different retrieval method
    And I am told to rebuild it in full
    And the existing index is left as it was

  @validation
  Scenario: Reject an update confined to a document outside the set
    When I confine the update to a document that is not part of the documentation set
    Then the request is refused
    And I am told the document is outside the set
    And the existing index is left as it was

  @error
  Scenario: Bringing the index up to date is interrupted
    Given I interrupt the update partway through
    When I ask for context afterwards
    Then I still receive a bundle from the knowledge indexed before the interruption
    And I am told the index is incomplete
    And running the update again resumes from where it stopped

  @error
  Scenario: A document that cannot be read
    Given one document in the set cannot be read
    When I bring the index up to date
    Then the remaining documents are still processed
    And I am told which document could not be read

  @scheduled @clock @could
  Scenario: Freshness moves on without anyone editing anything
    Given a document has passed its review cadence overnight
    When I ask for context the next day
    Then it is treated as past its review date
    And no re-indexing was needed for that to happen

# ═══════════════════════════════════════════════════════════════

@flow-31 @ai-agent @dap @could
Feature: FLOW-31 Carry a budget through a procedure
  """
  As an AI agent following a project's own decision procedure,
  I want each step handed to me with the supporting knowledge it needs and a budget kept
  across the whole procedure,
  so that a long procedure does not consume the context window it was meant to protect.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#budget
  # Source: cli/src/dap/commands/node.ts

  Background:
    Given a project that declares decision procedures
    And a documentation set indexed for retrieval

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @could
  Scenario: A step arrives with the knowledge it needs
    When I ask for one step of a procedure and declare a budget for its supporting knowledge
    Then I receive the step in full
    And I receive supporting passages that fit within the declared budget
    And each supporting passage says which part of the step it supports

  @happy-path @could
  Scenario: A budget held across the whole procedure
    Given I declare a budget for the whole procedure rather than for one step
    When I walk from step to step
    Then the knowledge accumulated across the steps stays within that budget
    And I am told how much of it remains as I go

  @happy-path
  Scenario: Knowledge already carried is not handed to me twice
    Given a passage was supplied at an earlier step
    When a later step would draw on the same passage
    Then it is not supplied again
    And I am told it was already supplied

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case @could
  Scenario: A step larger than the budget is still delivered whole
    Given the step's own content is larger than the budget I declared
    When I ask for that step
    Then I receive the step in full
    And I receive no supporting passages
    And I am told the step alone exceeded the declared budget

  @edge-case
  Scenario: The budget runs out partway through a procedure
    Given the procedure's budget is exhausted
    When I ask for the next step
    Then I still receive the step in full
    And I am told no further supporting knowledge can be supplied
    And I can continue the procedure

  @edge-case
  Scenario: A procedure hands off to another procedure
    Given a step hands control to a different procedure
    When I follow the handoff
    Then the remaining budget carries into the procedure I was handed to
    And knowledge already supplied is not supplied again on the other side

  @error
  Scenario: Supporting knowledge cannot be retrieved
    Given the documentation set cannot be retrieved from
    When I ask for a step of a procedure
    Then I still receive the step in full
    And I am told no supporting knowledge could be retrieved, and why
    And I can continue the procedure

  @validation
  Scenario: Reject a procedure step that does not exist
    When I ask for a step that the named procedure does not declare
    Then the request is refused
    And I am told which steps the procedure declares

# ═══════════════════════════════════════════════════════════════

@flow-32 @developer @telemetry @could
Feature: FLOW-32 Learn from what the context was actually used for
  """
  As a developer running an assistant against my documentation set,
  I want to record which retrieved knowledge actually got used and which never does,
  so that retrieval improves with use and I can see which documents are dead weight.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#feedback

  Background:
    Given a project whose retrieval keeps a record of how bundles were used

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @could
  Scenario: Report back which passages were used
    Given I received a bundle for a question
    When I report which of its passages I actually used
    Then the report is recorded against that question
    And I am told it was recorded

  @happy-path @could
  Scenario: Knowledge that keeps proving useful is offered sooner
    Given passages from one document have been reported as used for a kind of question many times
    When I ask a question of that kind again
    Then those passages appear earlier in the bundle than they did before
    And the change is attributed to previous use

  @happy-path
  Scenario: See what is retrieved constantly and never used
    Given the record holds enough history
    When I ask which knowledge is retrieved often and used rarely
    Then I am given those documents ordered by how often they are passed over
    And each is offered as a candidate for rewriting or retiring

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case @could
  Scenario: Retrieval works exactly as before without any record
    Given nothing has ever been reported as used
    When I ask for context
    Then the bundle is the same as it would be with no record kept at all

  @edge-case
  Scenario: Clear the record
    When I clear the record of how bundles were used
    Then later bundles are assembled as though nothing had ever been reported
    And I am told the record was cleared

  @edge-case
  Scenario: The record survives the index being rebuilt
    Given knowledge has been reported as used
    When the index is rebuilt in full
    Then the record still applies to the rebuilt knowledge

  @validation
  Scenario: Reject a report about a passage that was never offered
    When I report use of a passage that was not in any bundle I received
    Then the report is refused
    And I am told the passage cannot be matched to a bundle

  @error
  Scenario: The record cannot be written
    Given the project cannot be written to
    When I report which passages I used
    Then I am told the report could not be recorded, and why
    And later requests for context still succeed
    And I am not told again on every later report

  @security @could
  Scenario: The record never leaves the machine
    Given I have reported which passages I used
    When the record is written
    Then it is written only within the project
    And neither my questions nor the record are sent to any external service
# ═══════════════════════════════════════════════════════════════

@flow-33 @ai-agent @install @mvp
Feature: FLOW-33 Keep the CLI up to date
  """
  As an AI agent whose skills depend on capabilities the CLI only recently gained,
  I want to learn which version is installed and bring it up to the latest release in one step,
  so that a skill never fails on a machine that installed the CLI before the capability existed.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: install.sh
  # Source: .github/workflows/release.yml

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @mvp
  Scenario: Find out which version is installed
    Given the CLI is installed
    When I ask for its version
    Then I am told a version number
    And it is the version the CLI was built from

  @happy-path @mvp
  Scenario: Upgrade to the latest release
    Given the CLI is installed
    And a newer release is published
    When I ask the CLI to upgrade itself
    Then I am told the installed version and the version being installed
    And the installed CLI is replaced with the newer release
    And asking the CLI for its version afterwards reports the newer version

  @happy-path
  Scenario: Check for a newer release without changing anything
    Given the CLI is installed
    And a newer release is published
    When I ask whether a newer release exists
    Then I am told the installed version, the latest version, and that an upgrade is available
    And the installed CLI is left as it was

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case @mvp
  Scenario: Already on the latest release
    Given the CLI is installed
    And the latest published release is the installed version
    When I ask the CLI to upgrade itself
    Then I am told it is already up to date
    And the installed CLI is left as it was

  @edge-case
  Scenario: Running from source rather than an installed binary
    Given the CLI is running from its source tree
    When I ask the CLI to upgrade itself
    Then the request is refused
    And I am told to update the source tree instead

  @edge-case @security @mvp
  Scenario: A downloaded release that does not run is never installed
    Given the CLI is installed
    And the newest published release is corrupt
    When I ask the CLI to upgrade itself
    Then I am told the downloaded release could not be verified
    And the installed CLI is left as it was

  # ─────────────────────────────────────────────
  # Errors
  # ─────────────────────────────────────────────

  @error @external-dependency
  Scenario: The release service cannot be reached
    Given the CLI is installed
    And the release service is unreachable
    When I ask the CLI to upgrade itself
    Then I am told the release service could not be reached
    And the installed CLI is left as it was

  @error @external-dependency
  Scenario: The download fails partway
    Given the CLI is installed
    And a newer release is published
    But its download fails
    When I ask the CLI to upgrade itself
    Then I am told the download failed
    And the installed CLI is left as it was

  @validation
  Scenario: Reject a release that was never published
    Given the CLI is installed
    When I ask the CLI to install a release that does not exist
    Then the request is refused
    And I am told that release is not published

# ═══════════════════════════════════════════════════════════════

@flow-34 @ai-agent @mcp @mvp
Feature: FLOW-34 Use DEP from an MCP client
  """
  As an AI agent hosted in a desktop application that speaks the Model Context Protocol,
  I want DEP's knowledge and DAP's procedures offered to me as tools over that protocol,
  so that I can retrieve governed context and follow procedures without a shell.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: cli/src/lib.ts

  Background:
    Given a project configured for DEP and indexed for retrieval
    And the DEP MCP server is started for that project

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @mvp
  Scenario: Connect and learn what the server offers
    When I open a session with the server
    Then I am told the server's name and version
    And I am told it offers tools

  @happy-path @mvp
  Scenario: Discover the tools
    Given I have opened a session with the server
    When I ask which tools are offered
    Then each of these tools is offered, with a description and an input schema:
      | tool         |
      | dep_context  |
      | dep_search   |
      | dep_validate |
      | dep_graph    |
      | dep_query    |
      | dep_metadata |
      | dep_index    |
      | dap_resolve  |
      | dap_node     |
      | dap_trace    |
      | dep_version  |

  @happy-path @mvp
  Scenario: Retrieve a context bundle through a tool
    Given I have opened a session with the server
    When I call "dep_context" with a question and a budget
    Then I receive a bundle whose passages fit the budget
    And the result is structured, not only prose

  @happy-path
  Scenario: Follow a procedure through tools
    Given the project declares decision procedures
    And I have opened a session with the server
    When I call "dap_resolve" with a request in my own words
    Then I am told the matching procedure and its entry step
    When I call "dap_node" with that procedure and step
    Then I receive that one step and nothing more

  @happy-path
  Scenario: Work on a different project per call
    Given a second project configured for DEP
    And I have opened a session with the server
    When I call "dep_graph" naming the second project's root
    Then the result draws only on the second project

  # ─────────────────────────────────────────────
  # Validation, Edge Cases, Errors
  # ─────────────────────────────────────────────

  @validation
  Scenario: A tool call with a bad argument is refused, not fatal
    Given I have opened a session with the server
    When I call "dep_context" with a budget of "many"
    Then the call is reported as an error that says "budget must be a positive number"
    And the session is still usable

  @edge-case
  Scenario: A tool that does not exist
    Given I have opened a session with the server
    When I call a tool the server does not offer
    Then I am told the tool is unknown
    And the session is still usable

  @error
  Scenario: A project that is not configured for DEP
    Given I have opened a session with the server
    When I call "dep_validate" naming a root that holds no DEP configuration
    Then the call is reported as an error that says ".docspec"

  @happy-path @mvp
  Scenario: Configure a desktop client without any other runtime
    When I ask the CLI for the desktop client configuration for the project
    Then I am given configuration whose command is the CLI itself and whose arguments name the project's root
    And the configuration depends on no other runtime

  @edge-case
  Scenario: The server looks for a newer release when it starts
    When I open a session with the server
    Then I am told whether a release check ran, and why not if it did not

  @edge-case
  Scenario: Notifications get no reply and pings get an empty one
    Given I have opened a session with the server
    When I send the initialised notification
    Then nothing is sent back for it
    When I send a ping
    Then I receive an empty result

# ═══════════════════════════════════════════════════════════════

@flow-35 @project-lead @install @mvp
Feature: FLOW-35 Set up the MCP server on any machine
  """
  As a project lead adding DEP to a desktop assistant,
  I want one launcher that puts the CLI in a known place on macOS, Linux or Windows, keeps it current, and starts the server,
  so that every machine on the team gets the same setup from one line of configuration.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: packages/dep-mcp/index.mjs
  # Source: install.sh

  @data-driven @mvp
  Scenario Outline: The CLI lives in the same place on every operating system
    Given the launcher runs on "<os>"
    When I ask the launcher where it keeps the CLI
    Then it names "<location>"

    Examples:
      | os      | location           |
      | darwin  | ~/.dep/bin/dep     |
      | linux   | ~/.dep/bin/dep     |
      | windows | ~/.dep/bin/dep.exe |

  @happy-path @mvp
  Scenario: First run on a machine without the CLI
    Given no CLI is installed on this machine
    And a release is published
    When the launcher starts
    Then the CLI is placed at the launcher's location and is executable
    And I am told which version was installed
    And the server answers a session

  @happy-path @mvp
  Scenario: Later runs reuse the installed CLI
    Given the CLI is installed at the launcher's location
    And the launcher checked for releases earlier today
    When the launcher starts
    Then the release service is not asked
    And the server answers a session

  @happy-path
  Scenario: A newer release is installed before the server starts
    Given the CLI is installed at the launcher's location
    And a newer release is published
    When the launcher starts
    Then the CLI is replaced with the newer release
    And the previous CLI is kept beside it
    And the server answers a session

  @edge-case
  Scenario: The location can be moved
    Given the home location is declared as a different directory
    When I ask the launcher where it keeps the CLI
    Then it names a path inside that directory

  @edge-case
  Scenario: Upgrades can be turned off
    Given the CLI is installed at the launcher's location
    And a newer release is published
    And upgrades are declared off
    When the launcher starts
    Then the release service is not asked
    And the installed CLI is left as it was

  @error @external-dependency
  Scenario: The release service is unreachable but the CLI is installed
    Given the CLI is installed at the launcher's location
    And the release service is unreachable
    When the launcher starts
    Then I am warned the release service could not be reached
    And the server answers a session

  @error @external-dependency
  Scenario: The release service is unreachable and no CLI is installed
    Given no CLI is installed on this machine
    And the release service is unreachable
    When the launcher starts
    Then the launcher stops with a message naming the release service
    And nothing is placed at the launcher's location

  @security @mvp
  Scenario: A download that does not run is never installed
    Given no CLI is installed on this machine
    And the newest published release is corrupt
    When the launcher starts
    Then the launcher stops with a message saying the download could not be verified
    And nothing is placed at the launcher's location

# ═══════════════════════════════════════════════════════════════

@flow-36 @project-lead @install @mvp
Feature: FLOW-36 Check an installation and report what is wrong
  """
  As a project lead — or the agent installing on their behalf — on a machine that just received the CLI,
  I want the CLI to prove it works end to end and hand me a report I can file when it does not,
  so that a broken installation is diagnosed in one step instead of discovered in the middle of a task.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: prompts/install-dep.md
  # Source: install.sh

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @mvp
  Scenario: A healthy installation passes every check
    Given the CLI is installed and can write to its home location
    When I ask the CLI to check itself
    Then every check passes
    And I am told the version and the platform it was built for
    And the verdict is that the installation works

  @happy-path @mvp
  Scenario: The checks are available as data
    Given the CLI is installed and can write to its home location
    When I ask the CLI to check itself and request a machine-readable answer
    Then I receive each check by name with its outcome and a detail
    And I receive the version, the platform and a report ready to file

  @happy-path
  Scenario: The report is ready to file
    Given the CLI is installed and can write to its home location
    When I ask the CLI where to file its report
    Then I am given a link that opens a new issue on the project's repository
    And the link carries the report

  @data-driven @mvp
  Scenario Outline: What a check covers
    Given the CLI is installed and can write to its home location
    When I ask the CLI to check itself and request a machine-readable answer
    Then the check "<check>" passes

    Examples:
      | check    |
      | version  |
      | home     |
      | validate |
      | index    |
      | context  |
      | mcp      |

  # ─────────────────────────────────────────────
  # Errors & Security
  # ─────────────────────────────────────────────

  @error @mvp
  Scenario: The home location cannot be written
    Given the CLI is installed but its home location cannot be written
    When I ask the CLI to check itself
    Then the check "home" fails
    And the verdict is that the installation does not work
    And the report names the home location

  @security @mvp
  Scenario: Secrets never enter the report
    Given the CLI is installed and can write to its home location
    And a credential is present in the environment
    When I ask the CLI to check itself and request a machine-readable answer
    Then the report does not contain the credential
    And the report shows the home location relative to the user's home, not the full path

  @edge-case @later
  Scenario: The full check also exercises the local embedding model
    Given the CLI is installed and can write to its home location
    When I ask the CLI to check itself in full
    Then the check "local-embeddings" passes
    And I am told how long the model took to load

# ═══════════════════════════════════════════════════════════════

@flow-37 @project-lead @install @mvp
Feature: FLOW-37 Install from a downloaded file, with no shell at all
  """
  As a project lead on a machine where scripts are blocked,
  I want the downloaded CLI to install itself, register with the desktop client and prove it works,
  so that one file and one run is the whole setup on Windows, macOS or Linux.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: prompts/install-dep.md
  # Source: cli/src/commands/setup.ts

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @mvp
  Scenario: Set up for a project
    Given a project configured for DEP
    When I run setup for that project with a home location and a desktop configuration file
    Then the desktop configuration names the CLI as the server for that project
    And I am told where the CLI lives, that the desktop client was configured, and that the checks pass
    And I am told to restart the desktop client

  @happy-path @mvp
  Scenario: An existing desktop configuration is merged, not replaced
    Given a project configured for DEP
    And a desktop configuration that already names another server
    When I run setup for that project with a home location and a desktop configuration file
    Then the desktop configuration still names the other server
    And it names the CLI as the "dep" server
    And the previous configuration is kept beside it

  @happy-path
  Scenario: Running setup again changes nothing
    Given a project configured for DEP
    And setup has already been run for that project
    When I run setup for that project with a home location and a desktop configuration file
    Then the desktop configuration names the CLI as the server for that project
    And the desktop configuration names exactly one "dep" server

  @happy-path
  Scenario: The outcome is available as data
    Given a project configured for DEP
    When I run setup for that project and request a machine-readable answer
    Then I receive each step by name with its outcome
    And I receive the paths that were written

  # ─────────────────────────────────────────────
  # Edge Cases & Errors
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: Setup without naming a project
    When I run setup without naming a project, from a place that is not a project
    Then the desktop client is not configured
    And I am told to name a project

  @edge-case
  Scenario: Only the desktop client, not the search path
    Given a project configured for DEP
    When I run setup for that project and decline changes to the search path
    Then the search path step reports that it was skipped

  @error @mvp
  Scenario: The home location cannot be written
    Given a project configured for DEP
    And a home location that cannot be written
    When I run setup for that project with that home location
    Then the install step fails and names the location
    And the verdict is that setup did not complete

# ═══════════════════════════════════════════════════════════════

@flow-38 @project-lead @install @should
Feature: FLOW-38 Install into the desktop client with one file
  """
  As a project lead who does not want a terminal,
  I want a bundle the desktop client installs by itself — the CLI inside, the project asked for on install,
  so that no terminal, script, runtime or configuration file is ever involved.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: cli/scripts/bundle.ts
  # Source: https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md

  @happy-path @should
  Scenario: A bundle is produced for a platform
    Given a built CLI for "windows-x64"
    When I build the desktop bundle for it
    Then I receive one bundle file for "windows-x64"
    And it holds a manifest and the CLI under the server directory

  @data-driven @should
  Scenario Outline: The manifest tells the desktop client what it needs
    Given a built CLI for "<platform>"
    When I build the desktop bundle for it
    Then the manifest declares a binary server whose command is the bundled CLI
    And the manifest asks the person for the project root when installing
    And the manifest names the platform "<desktop-platform>"
    And the manifest carries the CLI's version

    Examples:
      | platform     | desktop-platform |
      | windows-x64  | win32            |
      | darwin-arm64 | darwin           |
      | linux-x64    | linux            |

  @validation
  Scenario: Reject a platform with no built CLI
    When I build the desktop bundle for a platform that was not built
    Then the request is refused
    And I am told which platforms are built

# ═══════════════════════════════════════════════════════════════

@flow-39 @developer @telemetry @should
Feature: FLOW-39 Watch how an agent moved through the documentation
  """
  As a developer running agents against my documentation set,
  I want every request the set answered kept in order, with what it offered and what came back used,
  so that I can watch how an agent moved through the docs instead of inferring it from the answer.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#trace
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: cli/src/lib.ts
  # Source: cli/src/context/usage.ts

  Background:
    Given a project whose retrieval keeps a record of the requests it answers

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: Every request is kept, in the order it was answered
    When I ask three questions one after another
    Then the record holds all three in the order I asked them
    And each entry carries the moment it was answered

  @happy-path
  Scenario: A request keeps what it offered and why
    When I ask for context
    Then the record of that request names the passages it offered me
    And the record says why each passage was included
    And the record says how much of my declared budget it filled

  @happy-path
  Scenario: Use reported afterwards is attached to the request it came from
    Given I received a bundle for a question
    When I report which of its passages I actually used
    Then the record of that request separates what I used from what I passed over

  @happy-path
  Scenario: Each request says who asked for it
    Given two consumers that identify themselves differently
    When each of them asks a question
    Then the record attributes each request to the consumer that made it
    And I can read back the requests of one consumer alone

  @happy-path
  Scenario: Requests answered in separate runs land in one record
    Given a consumer asked a question in one run
    And another consumer asked a question in a later run
    When I read the record
    Then it holds both, in the order they were answered

  @happy-path @data-driven
  Scenario Outline: Every kind of request is kept
    When I <request>
    Then the record holds one entry for it
    And the entry says which kind of request it was

    Examples:
      | request                         |
      | ask for context                 |
      | search                          |
      | take a step through a procedure |
      | validate the documentation set  |

  @happy-path
  Scenario: Read the record while requests are still being answered
    Given a consumer is asking questions continuously
    When I read the record without interrupting it
    Then I am given the requests answered so far
    And the consumer's later requests still succeed

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: Keeping no record changes nothing but the record
    Given a project that keeps no record of the requests it answers
    When I ask for context
    Then the bundle is the same as it would be with the record kept
    And nothing about the request is kept

  @edge-case
  Scenario: The record does not grow without bound
    Given more requests have been answered than the record keeps
    When I read the record
    Then I am given the most recent ones
    And I am told that older ones were dropped

  @edge-case
  Scenario: Clear the record
    When I clear the record of requests
    Then reading the record returns nothing
    And I am told the record was cleared

  @edge-case
  Scenario: A request that was refused is kept too
    When I ask for context in a way that is refused
    Then the record holds the refused request
    And the entry says it was refused, and why

  @validation
  Scenario: Ask for the requests of a consumer that never asked anything
    Given requests have been recorded
    When I read back the requests of a consumer that never asked anything
    Then I am given nothing, and told so
    And the record is left as it was

  @error
  Scenario: The record cannot be written
    Given the record cannot be written
    When I ask for context
    Then I still receive the bundle
    And I am told the request could not be recorded, and why
    And I am not told again on every later request

  @security
  Scenario: The record never leaves the machine
    Given requests have been recorded
    When I read the record
    Then the record is kept only inside the project
    And neither my questions nor the record are sent to any external service

# ═══════════════════════════════════════════════════════════════

@flow-40 @ai-agent @telemetry @should
Feature: FLOW-40 Tell which consumer a request came from
  """
  As a developer watching agents work against my documentation set,
  I want every request to name the consumer that made it without my configuring anything,
  so that one project's record can be read per client instead of as one undifferentiated stream.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#trace
  # Source: cli/src/mcp/tools.ts
  # Source: cli/src/commands/context.ts

  Background:
    Given a project configured for DEP and indexed for retrieval

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: A client that names itself is recorded under that name
    Given an agent client that calls itself "desktop-client"
    When it asks for context
    Then the record attributes the request to "desktop-client"

  @happy-path
  Scenario: Two clients working on one project are told apart
    Given an agent client that calls itself "desktop-client"
    And another agent client that calls itself "review-bot"
    When each of them asks for context
    Then I can read back what "desktop-client" asked for on its own
    And nothing "review-bot" asked for is among it

  @happy-path
  Scenario: A request made from the command line says so
    When I ask for context from the command line
    Then the record attributes the request to the command line
    And it is told apart from what an agent client asked for

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: A client that never says who it is still has its requests recorded
    Given an agent client that does not name itself
    When it asks for context
    Then the request is in the record
    And it is attributed to an unnamed consumer

  @validation
  Scenario: A client name that could break the record does not
    Given an agent client whose name contains a newline and a quote
    When it asks for context
    Then the record still reads back as one request
    And the name is kept exactly as the client gave it

# ═══════════════════════════════════════════════════════════════

@flow-41 @project-lead @console @should
Feature: FLOW-41 Serve a documentation set to a console
  """
  As someone responsible for a documentation set,
  I want a local console I can open that shows the set as a graph and shows what the
  agents have been asking it for,
  so that I can see the shape of the documentation and how it is actually being used
  without reading 35 files or a log.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#trace
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: cli/src/lib.ts

  Background:
    Given a project configured for DEP and indexed for retrieval

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: Open a console on a project
    When I start a console for the project
    Then I am told where to open it
    And opening it gives me the console

  @happy-path
  Scenario: The console shows the set as a graph
    Given a running console
    When I ask it for the graph
    Then I am given every document in the set
    And each one carries its type, its lifecycle and its links

  @happy-path
  Scenario: The console shows how healthy the set is
    Given a running console
    When I ask it how the set validates
    Then I am given a verdict for every document and for the set as a whole

  @happy-path
  Scenario: The console shows one document on its own
    Given a running console
    When I ask it for a document in the set
    Then I am given that document's metadata, its freshness and what links to it

  @happy-path
  Scenario: The console shows what the agents have been asking for
    Given an agent has asked the set a question
    And a running console
    When I ask it for the record of requests
    Then I am given that request, with what it offered and who asked for it

  @happy-path
  Scenario: The console keeps up with the documents
    Given a running console
    When a document is added to the project
    Then the console serves the new document without being restarted

  @happy-path
  Scenario: The console shows the decision procedures
    Given the project declares decision procedures
    And a running console
    When I ask it for the procedures
    Then I am given each procedure, its steps and where it hands off to

  @happy-path
  Scenario: The console does not fill the record it is showing
    Given an agent has asked the set a question
    And a running console
    When I leave the console running and watch the record
    Then it still holds only what the agents asked for
    And nothing the console itself asked for is in it

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: Let the console pick a port when I do not care which
    When I start a console without naming a port
    Then I am told which port it took

  @edge-case
  Scenario: Two consoles cannot hold one port
    Given a running console
    When I start another console on the same port
    Then I am told that port is already taken
    And the console that was already running still answers

  @validation
  Scenario: Ask for a document the set does not have
    Given a running console
    When I ask it for a document that is not in the set
    Then I am told it is not a document in the set

  @security
  Scenario: The console is reachable only from this machine
    Given a running console
    Then it accepts connections only from this machine

  @security
  Scenario: The console will not serve what is outside the project
    Given a running console
    When I ask it for a file outside the project
    Then the console refuses it
    And the file is not served

# ═══════════════════════════════════════════════════════════════

@flow-42 @ai-agent @telemetry @should
Feature: FLOW-42 Report which passages earned their place
  """
  As an agent that was handed more context than it ended up needing,
  I want to say which of it I actually used, from wherever I am connected,
  so that the set learns what earns its place instead of only what was offered.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#feedback
  # Design: docs/desired-user-stories/context-engine-design.md#trace
  # Source: cli/src/mcp/tools.ts
  # Source: cli/src/context/set.ts

  Background:
    Given a project configured for DEP and indexed for retrieval

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: An agent reports what it used
    Given an agent client that calls itself "desktop-client"
    When it asks for context and reports which passages it used
    Then the record shows those passages as used
    And the passages it passed over are not shown as used

  @happy-path
  Scenario: Report about a request from an earlier run
    When I ask for context from the command line
    And I report from the command line which passages that answer's context was used for
    Then the record shows those passages as used

  @happy-path
  Scenario: A report says how much of what was offered earned its place
    Given an agent client that calls itself "desktop-client"
    When it asks for context and reports which passages it used
    Then I am told how many of the offered passages were used

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @validation
  Scenario: Report about a request the set never answered
    Given an agent client that calls itself "desktop-client"
    When it reports use against a request the set never answered
    Then the report is turned down
    And I am told the request cannot be matched

  @validation
  Scenario: Report a passage that request was never offered
    Given an agent client that calls itself "desktop-client"
    When it asks for context and reports a passage that was not in the answer
    Then the report is turned down
    And I am told the passage cannot be matched

  @edge-case
  Scenario: Saying nothing was used is still a report
    Given an agent client that calls itself "desktop-client"
    When it asks for context and reports that it used none of it
    Then the record shows the request with nothing used
    And the request itself is still in the record

# ═══════════════════════════════════════════════════════════════

@flow-43 @human-author @console @should
Feature: FLOW-43 Fix a document from the console
  """
  As someone looking at a document the console has just told me is stale or mis-tagged,
  I want to correct its metadata where I am looking at it,
  so that acting on what the console shows does not mean finding the file and editing
  frontmatter by hand.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: cli/src/writer.ts
  # Source: cli/src/console/server.ts

  Background:
    Given a project configured for DEP and indexed for retrieval
    And a running console

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: Mark a document reviewed
    Given a document that is past its review date
    When I mark it reviewed from the console
    Then the console counts it as fresh again
    And the document's own file records the new review date

  @happy-path
  Scenario: Change how far a document is trusted
    When I set a document's confidence to "low" from the console
    Then the console reports that confidence
    And the document's own file records it

  @happy-path
  Scenario: Add a tag and take one away
    When I add the tag "reviewed" to a document from the console
    And I take the tag "lifecycle" off the same document from the console
    Then the document carries only the tags I left on it

  @happy-path
  Scenario: Link one document to another
    When I link a document to another as REQUIRES from the console
    Then the graph holds that link
    And the document it points at counts it as incoming

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @validation
  Scenario: Refuse a value the schema does not allow
    When I set a document's confidence to "quite sure" from the console
    Then the change is refused
    And I am told which values are allowed
    And the document is left as it was

  @validation
  Scenario: Refuse a link to a document the set does not have
    When I link a document to one that is not in the set from the console
    Then the change is refused
    And the document is left as it was

  @validation
  Scenario: Refuse to change a file outside the set
    When I try to change a file outside the project from the console
    Then the change is refused
    And the file outside the project is untouched

  @security
  Scenario: A page on another site cannot make the console write
    When another site asks the console to change a document
    Then the change is refused
    And the document is left as it was

  @security
  Scenario: A request addressed to somewhere else is refused
    When a request arrives addressed to a host that is not this machine
    Then the change is refused
    And the document is left as it was

# ═══════════════════════════════════════════════════════════════

@flow-44 @developer @loop @should
Feature: FLOW-44 Learn a maze from a store of claims
  """
  As someone building an agent that should get better at a task with experience,
  I want a store of claims keyed by situation that only honest outcomes can strengthen,
  so that the agent's context improves with what happened, not with what it says about itself.
  """
  # Design: docs/desired-user-stories/liveness-design.md#build-order
  # Design: docs/desired-user-stories/liveness-design.md#the-contradiction
  # Source: packages/loop/src

  Background:
    Given the reference maze, pinned to the core it was proven on

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: An empty store changes nothing
    When the player plays a day of fresh mazes, starting with an empty store
    Then its first maze is played exactly as it would be with no store at all
    And the store holds claims about situations, never about particular places

  @happy-path
  Scenario: Playing with the store beats playing without it
    When the player plays the same days of mazes with a store and without one
    Then with the store it falls short less often
    And with the store its runs score better

  @happy-path
  Scenario: The same seed plays the same day
    When I play a day twice from the same seed
    Then both days end with the same fingerprint

  @happy-path
  Scenario: The store can be rebuilt from what it recorded
    Given a day has been played
    When I rebuild the store from its record of changes
    Then the rebuilt store has the same fingerprint as the one the day left behind

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @validation
  Scenario: The player cannot award itself
    Given a player that reports every episode as a triumph
    When it plays a day of fresh mazes with a store of claims
    Then the store is exactly what an honest player making the same moves would have left

  @edge-case
  Scenario: The player is shown claims, never how much they are trusted
    When the player is shown what the store knows about a situation
    Then it receives the claims best first
    And nothing it receives says how strongly any of them is held

  @edge-case
  Scenario: Only the claims the player followed are credited
    Given the store holds two claims about one situation that recommend different moves
    When the player follows one of them and the episode goes well
    Then the claim it followed is held more strongly
    And the claim it passed over is held exactly as strongly as before

  @error
  Scenario: Refuse a maze core that is not the one the engine was proven on
    Given the vendored maze core no longer matches its pin
    When I start a day
    Then I am told the core does not match its pin
    And no day is played

# ═══════════════════════════════════════════════════════════════

@flow-45 @developer @loop @should
Feature: FLOW-45 Keep the store small and general between days
  """
  As someone whose agent learns a little from every episode,
  I want the end of each day to fade what went unused, put away what has long stopped
  helping, and fold claims that say the same thing about similar situations into one rule,
  so that the store stays small enough to read and general enough to carry to new situations.
  """
  # Design: docs/desired-user-stories/liveness-design.md#build-order
  # Source: packages/loop/src

  Background:
    Given the reference maze, pinned to the core it was proven on

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: Claims nobody read today fade
    Given the store holds a claim that was read today and one that was not
    When the day ends
    Then the claim nobody read is held a little less strongly than before
    And the claim that was read is held exactly as strongly as the day left it

  @happy-path
  Scenario: A claim that has long stopped helping is put away, not destroyed
    Given a claim that has faded below use and is older than faded claims are kept
    When the day ends
    Then the player is no longer shown it
    And it is still in the store, with its history

  @happy-path
  Scenario: The same advice about situations that look alike becomes one rule
    Given the store holds the same advice about situations that differ only in which way the player came in
    When the day ends
    Then the store holds one rule in their place
    And the rule says which claims it came from
    And the rule is about only what those situations had in common
    And the claims it came from are put away

  @happy-path
  Scenario: The end of a day is part of the record
    Given several days have been played
    When I rebuild the store from its record of changes
    Then the rebuilt store has the same fingerprint as the one the day left behind

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @validation
  Scenario: Different advice is never folded together
    Given the store holds different advice about situations that differ only in which way the player came in
    When the day ends
    Then each piece of advice is still held on its own

  @edge-case
  Scenario: A claim too new to judge is not put away
    Given a claim that has faded below use but is younger than faded claims are kept
    When the day ends
    Then the player can still be shown it

# ═══════════════════════════════════════════════════════════════

@flow-46 @developer @loop @should
Feature: FLOW-46 Sleep on what the day proved
  """
  As someone whose agent's context fills with claims that keep proving right,
  I want a night that moves those claims out of context and into the agent's instincts,
  only after a day that was going well and only when the move does not make it worse,
  so that context holds what is still being learned rather than what is already known.
  """
  # Design: docs/desired-user-stories/liveness-design.md#build-order
  # Source: packages/loop/src

  Background:
    Given the reference maze, pinned to the core it was proven on

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: A day that was going well is slept on
    Given a day of play that was settling down
    When the night comes
    Then the player wakes with a new version of its instincts
    And the new version was taught only claims that had proved themselves

  @happy-path
  Scenario: The night teaches without showing the claim it teaches
    Given a day of play that was settling down
    When the night comes
    Then nothing the night was taught from contains a claim from the store

  @happy-path
  Scenario: A claim the instincts now carry is let go
    Given a day of play that was settling down
    When the night comes and the following days pass
    Then a claim the new instincts carry is no longer offered as advice
    And it is still in the store, marked as absorbed

  @happy-path
  Scenario: Every night is part of the record
    Given several days and nights have passed
    When I rebuild the store from its record of changes
    Then the rebuilt store has the same fingerprint as the one the day left behind

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @validation
  Scenario: A day that was thrashing is not slept on
    Given a day of play that was getting worse
    When the night comes
    Then the player wakes with the instincts it went to sleep with
    And I am told the day was not slept on, and why
    And no claim is marked as absorbed

  @validation
  Scenario: A day that failed throughout is not slept on
    Given a day of play that failed from start to finish
    When the night comes
    Then the player wakes with the instincts it went to sleep with
    And I am told the day was not slept on, and why
    And no claim is marked as absorbed

  @edge-case
  Scenario: A claim the instincts did not take in stays in context
    Given a day of play that was settling down
    And a trainer that leaves one proven claim out
    When the night comes
    Then that claim is still offered as advice
    And it is not marked as absorbed
    And the rest of what the night learned is kept

  @edge-case
  Scenario: A claim the context still needs is held back without losing the night
    Given a day of play after which letting every proven claim go would leave the player worse
    When the night comes
    Then the rest of what the night learned is kept
    And not every claim it was taught was let go
    And a claim it held back is still offered as advice

  @error
  Scenario: A night that taught the opposite of its claims is undone
    Given a day of play that was settling down
    And a trainer that teaches the opposite of what the claims say
    When the night comes
    Then the player wakes with the instincts it went to sleep with
    And I am told the night was undone because it taught against its own claims
    And no claim is marked as absorbed

  @error
  Scenario: A night that would make the player worse is undone
    Given a day of play that was settling down
    And a trainer that teaches only a habit leading away from the goal everywhere
    When the night comes
    Then the player wakes with the instincts it went to sleep with
    And I am told the night was undone because its instincts, on their own, did worse
    And no claim is marked as absorbed

# ═══════════════════════════════════════════════════════════════

@flow-47 @developer @loop @should
Feature: FLOW-47 Describe a game in a document
  """
  As someone setting an agent a task it should get better at,
  I want to write the rules of the game in a documentation file — which scenarios are the
  levels, what makes two situations the same, where the player may write, and who keeps score —
  so that the game is reviewed and kept current like any other documentation, and so the
  player can never be given a way to judge itself.
  """
  # Design: docs/desired-user-stories/liveness-design.md#notating-the-game
  # Source: packages/loop/src/game

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: Read a game from its document
    Given a game document that names an arena of scenarios and which of them are in play
    When I read the game
    Then every scenario in play is a level
    And no scenario outside the selection is a level

  @happy-path
  Scenario: Each level is a situation the store can recognise
    Given a game whose situations are described by a scenario's tags and its example row
    When I read the game
    Then each level's situation carries the features the game names
    And two rows of the same outline are different situations that share their tags

  @happy-path
  Scenario: A game document is documentation like any other
    Given a game document in the project's documentation
    When the documentation set is validated
    Then the game document is checked like any other reference

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @validation
  Scenario: Refuse a game the player could score
    Given a game document that lets something other than the scenarios keep score
    When I read the game
    Then I am told the scenarios must be the only judge

  @validation
  Scenario: Refuse a game that lets the player write where it is judged
    Given a game document whose writable paths reach the scenarios' own steps
    When I read the game
    Then I am told the player may not write where it is judged

  @validation
  Scenario: Refuse a game whose arena is missing
    Given a game document that names an arena that does not exist
    When I read the game
    Then I am told the arena cannot be found

  @error
  Scenario: Refuse a situation the engine cannot read
    Given a game document that describes situations by something its scenarios do not have
    When I read the game
    Then I am told which part of the situation cannot be read

# ═══════════════════════════════════════════════════════════════

@flow-48 @developer @loop @should
Feature: FLOW-48 Play a game of scenarios with a store of claims
  """
  As someone building an agent that should get better at a task judged by scenarios,
  I want the same store that learned the maze to learn a game whose levels are Gherkin
  scenarios and whose only judge is running them,
  so that what the agent remembers is shaped by what passes, not by what it believes.
  """
  # Design: docs/desired-user-stories/liveness-design.md#notating-the-game
  # Source: packages/loop/src/game

  Background:
    Given the reference game of scenarios

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: The scenarios keep score
    When the player plays a day of the game
    Then every level it played was judged by running its scenario
    And each level scores what the game document says passing and failing are worth

  @happy-path
  Scenario: Playing with the store beats playing without it
    When the player plays the same days of the game with a store and without one
    Then by the last day it passes more levels with the store

  @happy-path
  Scenario: The same seed plays the same day
    When I play a day of the game twice from the same seed
    Then both days end with the same fingerprint

  @happy-path
  Scenario: What is learned in one product area is offered in another
    Given the store learned a claim on a level in one product area
    When the player meets a level in another area that is otherwise the same situation
    Then that claim is offered

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: Breaking a level that used to pass costs more than failing it
    Given a level the player passed on an earlier day
    When the player fails it on a later day
    Then that failure scores as breaking what worked, below an ordinary failure

# ═══════════════════════════════════════════════════════════════

@flow-49 @developer @loop @security @should
Feature: FLOW-49 An answer that reaches the judge does not count
  """
  As someone whose agent is scored by scenarios,
  I want any answer that writes outside where the player may write, or onto the scenarios
  and steps that judge it, to count for nothing,
  so that the agent cannot get better by changing the test instead of the work.
  """
  # Design: docs/desired-user-stories/liveness-design.md#notating-the-game
  # Source: packages/loop/src/game/play.ts

  Background:
    Given the reference game of scenarios

  @validation
  Scenario: An answer that writes somewhere the player may not write is void
    Given a player that also writes outside where the game lets it
    When the player plays a day of the game
    Then its answers count for nothing that day
    And I am told where it tried to write

  @security
  Scenario: An answer that writes onto the steps that judge it is void
    Given a player that also rewrites the steps that judge it
    When the player plays a day of the game
    Then its answers count for nothing that day
    And the steps that judge it are unchanged

  @security
  Scenario: A day on which the judge was changed by any route is void
    Given a player that changes the scenarios behind the game's back
    When the player plays a day of the game
    Then nothing from that day is learned
    And I am told the judge changed during the day

# ═══════════════════════════════════════════════════════════════

@flow-50 @developer @loop @should
Feature: FLOW-50 Sleep on a game of scenarios
  """
  As someone whose agent plays a game judged by scenarios,
  I want its nights to work as they do on the maze — trying what they learned on levels
  no day played, and undoing anything that makes the player worse —
  and to rerun the scenarios only when the answer or the judge has changed,
  so that a night costs what it has to and no more, without trusting a stale verdict.
  """
  # Design: docs/desired-user-stories/liveness-design.md#build-order
  # Source: packages/loop/src/game

  Background:
    Given the reference game of scenarios

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: A good run of days at the game is slept on
    Given several days of the game that were going well
    When the night comes after the last of them
    Then the player wakes with a new version of its instincts

  @happy-path
  Scenario: The night tries its work on levels no day played
    Given several days of the game that were going well
    When the night comes after the last of them
    Then every level the night judged on is one no day played

  @happy-path
  Scenario: An answer judged once is not judged again when the game says levels stand alone
    Given a game whose levels each read only their own answer
    When the same answers are judged twice
    Then the scenarios are run once

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @validation
  Scenario: Without that promise, every judging runs the scenarios
    Given a game that does not say its levels stand alone
    When the same answers are judged twice
    Then the scenarios are run twice

  @security
  Scenario: Nothing judged before the judge changed is trusted after
    Given a game whose levels each read only their own answer
    And the same answers were judged once
    When the steps that judge them change
    And the same answers are judged again
    Then the scenarios are run again

  @error
  Scenario: A night that would make the player worse at the game is undone
    Given several days of the game that were going well
    And a trainer that teaches only one answer for everything
    When the night comes after the last of them
    Then the player wakes with the instincts it went to sleep with
    And I am told the night was undone because its instincts, on their own, did worse

# ═══════════════════════════════════════════════════════════════

@flow-51 @human-author @loop @should
Feature: FLOW-51 Read what the agent has learned
  """
  As the person whose agent is learning,
  I want what it has learned written out as a document I can read — the advice it relies on,
  the habits it has formed, and the evidence behind each —
  so that its memory is something I can inspect and argue with, not a number inside it.
  """
  # Design: docs/desired-user-stories/liveness-design.md#the-claim
  # Source: packages/loop/src/riverbed.ts

  Background:
    Given a game the agent has played for several days

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: What the agent relies on is written out as sentences
    When I write out what the agent has learned
    Then each piece of advice it relies on reads as a sentence about a situation
    And each says how often it was acted on and how often that passed

  @happy-path
  Scenario: Habits are told apart from advice
    Given some of what it learned has become habit
    When I write out what the agent has learned
    Then the habits are listed apart from the advice it still needs to be told

  @happy-path
  Scenario: The learned document is documentation like any other
    When I write out what the agent has learned
    And the documentation set is validated
    Then the learned document is checked like any other reference
    And it names the game it was learned from

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: Only what has proved itself is written
    When I write out what the agent has learned
    Then nothing weak, untested or put away is in it

  @edge-case
  Scenario: The same memory is written the same way
    When I write out what the agent has learned twice
    Then both documents say the same thing

  @security
  Scenario: Nothing in it says how strongly a claim is held
    When I write out what the agent has learned
    Then no line carries the strength a claim is held at

  @error
  Scenario: A document I changed is not overwritten
    Given I have written out what the agent has learned
    And I have changed the document by hand
    When I write out what the agent has learned again
    Then my changes are still there
    And I am told the document was changed by hand since it was written

# ═══════════════════════════════════════════════════════════════

@flow-52 @human-author @loop @should
Feature: FLOW-52 What the agent learned reads as rules
  """
  As the person whose agent is learning,
  I want what it learned in many alike situations said once, as a rule,
  without the details that never mattered,
  so that the document of what it learned is short enough to read and argue with.
  """
  # Design: docs/desired-user-stories/liveness-design.md#phase-c--what-it-learned-written-out
  # Source: packages/loop/src/clock.ts

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: Advice that holds whatever the area is, is written without the area
    Given a game the agent has played for several days
    When I write out what the agent has learned
    Then some of its advice does not mention the area at all

  @happy-path
  Scenario: Alike claims are kept long enough to become a rule
    Given the agent holds advice about one situation
    When the same advice proves itself in a situation that differs in one detail
    Then both are kept until the end of the day

  @happy-path
  Scenario: A rule grows more general a day at a time
    Given the agent holds a rule and proven advice that differs from it in one more detail
    When the day ends
    Then the two become one rule that leaves out that detail too

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: A rule never covers an exception the agent knows of
    Given the agent holds alike advice that would fold into a rule
    And proven advice to do something else in a situation that rule would cover
    When the day ends
    Then no rule covers the exception
    And the exception is still held

  @edge-case
  Scenario: A rule is only given where its conditions hold
    Given the agent holds a rule about large requests from new customers
    When it meets a large request from a gold customer
    Then the rule is not given
    But a large request from a new customer is given the rule

  @edge-case
  Scenario: Only advice that has proved itself becomes a rule
    Given the agent holds alike advice that has hardly been acted on
    When the day ends
    Then no rule is made from it

  @edge-case
  Scenario: A rule keeps the evidence of what it was made from
    Given the agent holds alike advice that would fold into a rule
    When the day ends
    Then the rule has been acted on as often as all of them together
    And has passed as often as all of them together

# ═══════════════════════════════════════════════════════════════

@flow-53 @human-author @console @loop @should
Feature: FLOW-53 Review what the agent learned before it lands
  """
  As the person whose agent is learning,
  I want what it learned to wait for my review before it becomes documentation,
  so that nothing it tells itself reaches the agent as context until I have read it.
  """
  # Design: docs/desired-user-stories/liveness-design.md#open-tensions
  # Source: cli/src/context/proposals.ts

  Background:
    Given the agent has proposed what it learned

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: What it learned waits for review
    Then the documentation set does not contain it yet
    And it is waiting for review, with who proposed it

  @happy-path
  Scenario: I can compare what is with what would be
    When I ask the console what is waiting for review
    Then I see the document as it is now and as it would be

  @happy-path
  Scenario: Accepting it lands it
    When I accept the proposal from the console
    Then the documentation set contains what it learned
    And the learned document is checked like any other reference
    And nothing is waiting for review

  @happy-path
  Scenario: Rejecting it discards it
    When I reject the proposal from the console
    Then nothing is waiting for review
    And the documentation set does not contain it yet

  # ─────────────────────────────────────────────
  # Error / Security
  # ─────────────────────────────────────────────

  @error
  Scenario: A proposal does not land over a document changed since it was proposed
    Given the document it would replace was changed after it was proposed
    When I accept the proposal from the console
    Then I am told the document changed since it was proposed
    And the changed document is still there
    And the proposal is still waiting for review

  @security
  Scenario: Nothing can be proposed for a document outside the project
    When something proposes a document outside the project
    Then the proposal is refused
    And nothing outside the project was written

  @security
  Scenario: A page from another site cannot accept a proposal
    When a page from another site tries to accept the proposal
    Then the change is refused
    And the proposal is still waiting for review

# ═══════════════════════════════════════════════════════════════

@flow-54 @human-author @loop @should
Feature: FLOW-54 Teach the agent by editing what it learned
  """
  As the person whose agent is learning,
  I want my changes to the document of what it learned to change what it knows —
  advice I strike out is no longer given, advice I add is given and tested,
  and what I write in my own words is kept —
  so that its memory comes to match the way I work, not only what the scenarios reward.
  """
  # Design: docs/desired-user-stories/liveness-design.md#the-claim
  # Source: packages/loop/src/judgement.ts

  Background:
    Given a game the agent has played for several days
    And what it learned has landed as a document

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: Advice I strike out is no longer given
    Given I struck out a piece of its advice
    When the agent reads my changes
    Then that advice is not given in the situation it was about

  @happy-path
  Scenario: A habit I strike out is dropped
    Given I struck out one of its habits
    When the agent reads my changes
    Then it no longer acts on that habit without being told

  @happy-path
  Scenario: Advice I add is given
    Given I added advice of my own in the same form as its own
    When the agent reads my changes
    Then my advice is given in the situation I named

  @happy-path
  Scenario: Advice I add is tested like any other
    Given I added advice of my own in the same form as its own
    And the agent has read my changes
    When it plays another day
    And it writes out what it learned again
    Then my advice is listed as what I told it
    And it says how often my advice was acted on and how often that passed

  @happy-path
  Scenario: What I write in my own words is kept
    Given I wrote a note of my own in the document
    When the agent reads my changes
    And it writes out what it learned again
    Then my note is still in the document

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: Once it has read my changes it can propose again
    Given I struck out a piece of its advice
    When the agent reads my changes
    And it writes out what it learned again
    Then it is no longer refused as changed by hand

  @edge-case
  Scenario: Reading the same changes twice changes nothing more
    Given I struck out a piece of its advice
    When the agent reads my changes twice
    Then its memory is the same as after the first reading

  @edge-case
  Scenario: What I told it is never folded into a rule of its own
    Given I told it advice alike to proven advice of its own
    When the day ends
    Then my advice is still held in my own words

  @error
  Scenario: Advice naming a choice the game does not have is kept as a note
    Given I added advice that names a choice the game does not offer
    When the agent reads my changes
    Then that advice is not given anywhere
    And it is kept as my note
    And I am told it was not understood as advice

```

## Open questions

Behaviours below were assumed or deliberately decided while writing these stories. Each is tagged
`@wip @later` in the scenario that depends on it, or is listed here because it is a design decision
someone should confirm before implementation starts.

1. **Retrieval without a meaning-based index** (FLOW-24) — the stories assume an un-indexed set
   still returns a bundle ranked by wording, with a notice, rather than refusing. The alternative
   is to refuse and demand `dep vectorize` first. Which is the better default for an agent that
   cannot install anything itself? Source: `cli/src/commands/vectorize.ts`.
2. **Budget unit** (FLOW-24, FLOW-31) — budgets are expressed in tokens throughout. Tokens differ
   per model, so a token budget is only meaningful against a declared tokeniser. Should the budget
   be declared in characters, in tokens against a named tokeniser, or in both?
3. **Restrictions applied before the field is narrowed** (FLOW-26) — this is a deliberate
   correction of shipped behaviour, where `dep search --semantic` retrieves the closest passages
   first and filters those, so a qualifying document ranked below the cut is never returned. It is
   open question 2 of the shipped stories; these stories assume it is fixed rather than inherited.
   Source: `cli/src/commands/search.ts`.
4. **Relationship influence is ordinal, not numeric** (FLOW-27) — the stories assert the *order* of
   influence across the six relationship types, never a weight. The actual weights are an
   implementation choice, but the ordering is a contract someone should confirm: is `TEACHES`
   really as strong as `EXPLAINS` for pulling knowledge in?
5. **Expansion depth default** (FLOW-27) — the stories require a declarable depth but assert no
   default. One hop keeps bundles tight; two hops covers most prerequisite chains in this set.
6. **Passage identity across rebuilds** (FLOW-32) — the record of what was used must survive a full
   rebuild, which means a passage needs an identity independent of its position in a document.
   What survives an edit that shifts a section: the document plus heading, or a content digest?
7. **Feedback and reproducibility interact** (FLOW-28, FLOW-32) — FLOW-28 requires the same request
   to produce the same bundle, and FLOW-32 requires bundles to change with use. Both hold only if
   the record is treated as part of the request's inputs. Should a bundle report the version of the
   record it was assembled against?
8. **Upgrades trust the release service** (FLOW-33) — the CLI verifies a downloaded release by
   running it and checking it reports a version before swapping it in; it does not verify a
   signature. Should releases carry a checksum or signature the CLI checks first?
9. **The local embedding provider on Windows** (FLOW-35) — the Windows binary is built and the
   launcher installs it, but the onnxruntime libraries the `local` provider needs are only embedded
   for macOS and Linux. On Windows, `hash` and `openai` work; `local` is untested. Should the
   Windows build embed onnxruntime too, or should `.docspec` default to `hash` there?
10. **The full self-check downloads a model** (FLOW-36) — `--full` exercises the local embedding
    provider, which fetches the model on first use; the scenario is parked as `@later` because the
    acceptance suite must stay offline. Should the full check be the default when a network is
    available?
11. **Unsigned downloads** (FLOW-37, FLOW-38) — Windows SmartScreen warns once on any unsigned file,
    installer or bundle alike. Code signing (or Azure Trusted Signing) removes the warning; nothing in
    the install path can. Worth a certificate?
12. **The bundle install itself is not observed** (FLOW-38) — the stories check what the bundle
    contains; what Claude Desktop does with it can only be tried by hand.
13. **Behaviours deliberately left out** — no scenarios were written for output with no observable
   verdict: how a bundle is laid out for reading, the progress counter shown while indexing, or the
   wording used to separate passages from one another.
14. **How much of the record to keep** (FLOW-39) — the record is bounded so it cannot grow without
    limit, but the stories assert only that the most recent survive and that the drop is reported.
    Is the bound a number of requests, an age, or a size on disk?
15. **Who the consumer says it is** (FLOW-39) — a request is attributed to the consumer that made
    it, which means a consumer declares its own identity when it opens the set, and nothing
    verifies it. Is a self-declared caller enough for a local record, or should the record also
    keep what can be observed without being told?
16. **Two records or one** (FLOW-32, FLOW-39) — the usage record aggregates what proved useful; the
    traversal record keeps each request in order. They overlap: both know which passages were
    offered and which came back used. Should the aggregate be derived from the traversal record
    instead of kept beside it?
