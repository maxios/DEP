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
