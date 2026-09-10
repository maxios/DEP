@flow-29 @developer @api @mvp
Feature: FLOW-29 Embed the retriever in my own program
  """
  As a developer building an assistant of my own,
  I want to call DEP's retrieval directly from my program and receive values back,
  so that I can govern my assistant's context without shelling out to a command
  and parsing what it printed.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: cli/src/commands/search.ts
  # Source: cli/src/index.ts

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @mvp
  Scenario: Ask for context from inside my own program
    Given I have added DEP to my project as a dependency
    When I ask for context from my own code
    Then I receive the bundle as a value I can work with
    And no separate process is started on my behalf

  @happy-path @mvp
  Scenario: Open a documentation set once and ask many questions
    Given I have opened a documentation set
    When I ask twenty questions against it in one run
    Then every answer reflects the same documentation set
    And the set is not re-read from disk for each question

  @happy-path
  Scenario: The command and the code give the same answer
    Given the same project, question, budget and restrictions
    When I ask for context through the command and through my own code
    Then both produce the same passages in the same order

  # ─────────────────────────────────────────────
  # Data-Driven
  # ─────────────────────────────────────────────

  @data-driven
  Scenario Outline: Capabilities available to a program, not only to a command
    When I request "<capability>" from my own code
    Then I receive the result as a value
    And nothing is written to my program's output stream

    Examples:
      | capability                     |
      | a budgeted context bundle      |
      | a search over the set          |
      | the documentation graph        |
      | a validation verdict           |
      | a document's metadata          |

  # ─────────────────────────────────────────────
  # Errors & Isolation
  # ─────────────────────────────────────────────

  @error @mvp
  Scenario: A bad request never ends my program
    When I ask for context with a budget my program computed wrongly
    Then I am handed a failure I can catch and recover from
    And my program keeps running
    And nothing is written to my program's output stream

  @error
  Scenario: A missing documentation set is reported, not printed
    Given I point at a directory that holds no DEP configuration
    When I open it from my own code
    Then I am handed a failure naming the missing configuration
    And my program keeps running

  @validation
  Scenario: Reject opening something that is not a documentation set
    When I open a location that is not a directory
    Then I am handed a failure naming the location
    And my program keeps running

  @edge-case
  Scenario: Two documentation sets open at the same time
    Given I have opened two different documentation sets in one program
    When I ask a question against each of them
    Then each answer draws only on its own set
    And neither set's configuration affects the other

  @security @mvp
  Scenario: Nothing leaves the machine unless I choose it
    Given I have chosen the retrieval method that runs on my own machine
    When I ask for context
    Then no request leaves the machine
    And my question is not sent to any external service

  @security
  Scenario: An external retrieval method is used only with my credentials
    Given I have chosen a retrieval method provided by an external service
    And I have not supplied credentials for it
    When I ask for context
    Then the request is refused
    And I am told which credential is missing
