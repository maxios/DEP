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
    Then each passage declares whether it matched my question directly,
      was required by another passage, or was reached by expanding from one
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
