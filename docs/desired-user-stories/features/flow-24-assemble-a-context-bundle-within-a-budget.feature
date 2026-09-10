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
