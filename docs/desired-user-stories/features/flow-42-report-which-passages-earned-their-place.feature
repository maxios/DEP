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
