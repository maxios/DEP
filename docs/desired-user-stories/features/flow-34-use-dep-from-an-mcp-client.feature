@flow-34 @ai-agent @mcp @mvp
Feature: FLOW-34 Use DEP from an MCP client
  """
  As an AI agent hosted in a desktop application that speaks the Model Context Protocol,
  I want DEP's knowledge and DAP's procedures offered to me as tools over that protocol,
  so that I can retrieve governed context and follow procedures without a shell.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: cli/src/lib.ts

  Background:
    Given a project configured for DEP and indexed for retrieval
    And the DEP MCP server is started for that project

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @mvp
  Scenario: Connect and learn what the server offers
    When I open a session with the server
    Then I am told the server's name and version
    And I am told it offers tools

  @happy-path @mvp
  Scenario: Discover the tools
    Given I have opened a session with the server
    When I ask which tools are offered
    Then each of these tools is offered, with a description and an input schema:
      | tool         |
      | dep_context  |
      | dep_search   |
      | dep_validate |
      | dep_graph    |
      | dep_query    |
      | dep_metadata |
      | dep_index    |
      | dap_resolve  |
      | dap_node     |
      | dap_trace    |
      | dep_version  |

  @happy-path @mvp
  Scenario: Retrieve a context bundle through a tool
    Given I have opened a session with the server
    When I call "dep_context" with a question and a budget
    Then I receive a bundle whose passages fit the budget
    And the result is structured, not only prose

  @happy-path
  Scenario: Follow a procedure through tools
    Given the project declares decision procedures
    And I have opened a session with the server
    When I call "dap_resolve" with a request in my own words
    Then I am told the matching procedure and its entry step
    When I call "dap_node" with that procedure and step
    Then I receive that one step and nothing more

  @happy-path
  Scenario: Work on a different project per call
    Given a second project configured for DEP
    And I have opened a session with the server
    When I call "dep_graph" naming the second project's root
    Then the result draws only on the second project

  # ─────────────────────────────────────────────
  # Validation, Edge Cases, Errors
  # ─────────────────────────────────────────────

  @validation
  Scenario: A tool call with a bad argument is refused, not fatal
    Given I have opened a session with the server
    When I call "dep_context" with a budget of "many"
    Then the call is reported as an error that says "budget must be a positive number"
    And the session is still usable

  @edge-case
  Scenario: A tool that does not exist
    Given I have opened a session with the server
    When I call a tool the server does not offer
    Then I am told the tool is unknown
    And the session is still usable

  @error
  Scenario: A project that is not configured for DEP
    Given I have opened a session with the server
    When I call "dep_validate" naming a root that holds no DEP configuration
    Then the call is reported as an error that says ".docspec"

  @happy-path @mvp
  Scenario: Configure a desktop client without any other runtime
    When I ask the CLI for the desktop client configuration for the project
    Then I am given configuration whose command is the CLI itself and whose arguments name the project's root
    And the configuration depends on no other runtime

  @edge-case
  Scenario: The server looks for a newer release when it starts
    When I open a session with the server
    Then I am told whether a release check ran, and why not if it did not

  @edge-case
  Scenario: Notifications get no reply and pings get an empty one
    Given I have opened a session with the server
    When I send the initialised notification
    Then nothing is sent back for it
    When I send a ping
    Then I receive an empty result
