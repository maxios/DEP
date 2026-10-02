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
