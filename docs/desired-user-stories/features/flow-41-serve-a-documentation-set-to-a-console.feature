@flow-41 @project-lead @console @should
Feature: FLOW-41 Serve a documentation set to a console
  """
  As someone responsible for a documentation set,
  I want a local console I can open that shows the set as a graph and shows what the
  agents have been asking it for,
  so that I can see the shape of the documentation and how it is actually being used
  without reading 35 files or a log.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#trace
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: cli/src/lib.ts

  Background:
    Given a project configured for DEP and indexed for retrieval

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: Open a console on a project
    When I start a console for the project
    Then I am told where to open it
    And opening it gives me the console

  @happy-path
  Scenario: The console shows the set as a graph
    Given a running console
    When I ask it for the graph
    Then I am given every document in the set
    And each one carries its type, its lifecycle and its links

  @happy-path
  Scenario: The console shows how healthy the set is
    Given a running console
    When I ask it how the set validates
    Then I am given a verdict for every document and for the set as a whole

  @happy-path
  Scenario: The console shows one document on its own
    Given a running console
    When I ask it for a document in the set
    Then I am given that document's metadata, its freshness and what links to it

  @happy-path
  Scenario: The console shows a document's content, rendered
    Given a document with headings, a list, a table, code and a link to another document
    And a running console
    When I ask it for that document
    Then I am given its content rendered for reading, headings, lists, tables and code
    And its links to other documents in the set can be followed in the console

  @security
  Scenario: A document's content cannot run anything in the console
    Given a document whose content contains a script
    And a running console
    When I ask it for that document
    Then the script is shown as text, never as something that runs

  @happy-path
  Scenario: The console shows what the agents have been asking for
    Given an agent has asked the set a question
    And a running console
    When I ask it for the record of requests
    Then I am given that request, with what it offered and who asked for it

  @happy-path
  Scenario: The console shows what was kept from an agent, and why
    Given a document past its review date that answers the agent's question
    And an agent has asked the set a question
    And a running console
    When I ask it for the record of requests
    Then I am given what was kept from the agent, because it is past its review date

  @happy-path
  Scenario: The console keeps up with the documents
    Given a running console
    When a document is added to the project
    Then the console serves the new document without being restarted

  @happy-path
  Scenario: The console shows the decision procedures
    Given the project declares decision procedures
    And a running console
    When I ask it for the procedures
    Then I am given each procedure, its steps and where it hands off to

  @happy-path
  Scenario: The console does not fill the record it is showing
    Given an agent has asked the set a question
    And a running console
    When I leave the console running and watch the record
    Then it still holds only what the agents asked for
    And nothing the console itself asked for is in it

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: Let the console pick a port when I do not care which
    When I start a console without naming a port
    Then I am told which port it took

  @edge-case
  Scenario: Two consoles cannot hold one port
    Given a running console
    When I start another console on the same port
    Then I am told that port is already taken
    And the console that was already running still answers

  @validation
  Scenario: Ask for a document the set does not have
    Given a running console
    When I ask it for a document that is not in the set
    Then I am told it is not a document in the set

  @security
  Scenario: The console is reachable only from this machine
    Given a running console
    Then it accepts connections only from this machine

  @security
  Scenario: The console will not serve what is outside the project
    Given a running console
    When I ask it for a file outside the project
    Then the console refuses it
    And the file is not served
