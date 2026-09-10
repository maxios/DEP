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
