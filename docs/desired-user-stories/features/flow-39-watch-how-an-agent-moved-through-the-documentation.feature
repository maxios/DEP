@flow-39 @developer @telemetry @should
Feature: FLOW-39 Watch how an agent moved through the documentation
  """
  As a developer running agents against my documentation set,
  I want every request the set answered kept in order, with what it offered and what came back used,
  so that I can watch how an agent moved through the docs instead of inferring it from the answer.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#trace
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: cli/src/lib.ts
  # Source: cli/src/context/usage.ts

  Background:
    Given a project whose retrieval keeps a record of the requests it answers

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: Every request is kept, in the order it was answered
    When I ask three questions one after another
    Then the record holds all three in the order I asked them
    And each entry carries the moment it was answered

  @happy-path
  Scenario: A request keeps what it offered and why
    When I ask for context
    Then the record of that request names the passages it offered me
    And the record says why each passage was included
    And the record says how much of my declared budget it filled

  @happy-path
  Scenario: Use reported afterwards is attached to the request it came from
    Given I received a bundle for a question
    When I report which of its passages I actually used
    Then the record of that request separates what I used from what I passed over

  @happy-path
  Scenario: Each request says who asked for it
    Given two consumers that identify themselves differently
    When each of them asks a question
    Then the record attributes each request to the consumer that made it
    And I can read back the requests of one consumer alone

  @happy-path
  Scenario: Requests answered in separate runs land in one record
    Given a consumer asked a question in one run
    And another consumer asked a question in a later run
    When I read the record
    Then it holds both, in the order they were answered

  @happy-path @data-driven
  Scenario Outline: Every kind of request is kept
    When I <request>
    Then the record holds one entry for it
    And the entry says which kind of request it was

    Examples:
      | request                         |
      | ask for context                 |
      | search                          |
      | take a step through a procedure |
      | validate the documentation set  |

  @happy-path
  Scenario: Read the record while requests are still being answered
    Given a consumer is asking questions continuously
    When I read the record without interrupting it
    Then I am given the requests answered so far
    And the consumer's later requests still succeed

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: Keeping no record changes nothing but the record
    Given a project that keeps no record of the requests it answers
    When I ask for context
    Then the bundle is the same as it would be with the record kept
    And nothing about the request is kept

  @edge-case
  Scenario: The record does not grow without bound
    Given more requests have been answered than the record keeps
    When I read the record
    Then I am given the most recent ones
    And I am told that older ones were dropped

  @edge-case
  Scenario: Clear the record
    When I clear the record of requests
    Then reading the record returns nothing
    And I am told the record was cleared

  @edge-case
  Scenario: A request that was refused is kept too
    When I ask for context in a way that is refused
    Then the record holds the refused request
    And the entry says it was refused, and why

  @validation
  Scenario: Ask for the requests of a consumer that never asked anything
    Given requests have been recorded
    When I read back the requests of a consumer that never asked anything
    Then I am given nothing, and told so
    And the record is left as it was

  @error
  Scenario: The record cannot be written
    Given the record cannot be written
    When I ask for context
    Then I still receive the bundle
    And I am told the request could not be recorded, and why
    And I am not told again on every later request

  @security
  Scenario: The record never leaves the machine
    Given requests have been recorded
    When I read the record
    Then the record is kept only inside the project
    And neither my questions nor the record are sent to any external service
