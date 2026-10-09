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
