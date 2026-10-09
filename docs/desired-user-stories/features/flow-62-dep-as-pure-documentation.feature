@flow-62 @human-author @project-lead @must
Feature: FLOW-62 DEP as pure documentation
  """
  As someone who wants DEP only for documentation,
  I want a project that says nothing about the loop to write nothing beside its documents —
  no record of requests, no usage, no heartbeat, no proposals —
  so that adopting DEP never means adopting the loop, and switching it off is one line.
  """
  # Design: docs/desired-user-stories/liveness-design.md#configuring-the-loop
  # Source: cli/src/loop-config.ts

  Background:
    Given a project that says nothing about the loop

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: Answering questions writes nothing beside the documents
    When I ask the documentation set a question, search it and validate it
    Then nothing has been written beside the documents

  @happy-path
  Scenario: Documents with hearts still validate, and wake no one
    Given a document waiting on someone past its follow-up time
    When the documentation set is validated
    Then the document passes validation
    And no owner can be woken

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: The heartbeat is refused, saying how to turn it on
    When I ask for an owner's heartbeat
    Then I am told the loop is off and which setting turns it on

  @edge-case
  Scenario: A usage report is refused, and not offered to agents
    Given a question I asked earlier
    When I report which passages I used
    Then the report is not recorded, and I am told why
    And an agent connected over MCP is not offered usage reports

  @edge-case
  Scenario: Proposals are refused, and the console has nothing to review
    When something proposes a new version of a document
    Then I am told the loop is off and which setting turns it on
    And the console offers no review

  @security
  Scenario: The environment can switch the loop off for a project that turned it on
    Given a project whose configuration turns the loop on
    And the environment says the loop is off
    When I ask the documentation set a question, search it and validate it
    Then nothing has been written beside the documents
