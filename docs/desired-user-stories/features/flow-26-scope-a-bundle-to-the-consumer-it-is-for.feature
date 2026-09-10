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
