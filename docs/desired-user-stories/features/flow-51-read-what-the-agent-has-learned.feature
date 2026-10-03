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
