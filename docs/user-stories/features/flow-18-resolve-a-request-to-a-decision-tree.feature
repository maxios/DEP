@flow-18 @ai-agent @dap @mvp
Feature: FLOW-18 Resolve a request to a decision tree
  """
  As an AI agent receiving a request in the user's own words,
  I want to find out whether a decision tree already covers that request and how strong the match is,
  so that I follow the project's own procedure instead of improvising one.
  """
  # Source: cli/src/dap/commands/resolve.ts
  # Spec: dap/dap-seed.md

  @happy-path @mvp
  Scenario: Match a request to the tree that covers it
    Given the project declares a tree triggered by "validate DEP documentation and fix issues"
    When I ask which tree covers "validate DEP documentation and fix issues"
    Then that tree is returned as the strongest match
    And I am shown its identifier, its trigger, the node to start at and where the tree lives

  @happy-path
  Scenario Outline: The strength of a match reflects how it was recognised
    # Source: cli/src/dap/commands/resolve.ts
    Given a tree triggered by "validate DEP documentation and fix issues"
    And that tree also declares the phrase "validate documentation" and the intent "validate_docs"
    When I ask which tree covers "<request>"
    Then the match is reported with a strength of "<strength>"

    Examples:
      | request                                  | strength |
      | validate DEP documentation and fix issues | 100      |
      | validate_docs                            | 95       |
      | validate documentation                   | 90       |
      | validate DEP documentation               | 80       |

  @happy-path
  Scenario: Match on a partial phrasing of my own
    Given a tree triggered by "documentation may be out of date"
    When I ask which tree covers "my documentation is out of date"
    Then that tree is returned with a strength reflecting how much of my request it recognised

  @happy-path
  Scenario: Several trees can match, strongest first
    Given more than one tree recognises part of my request
    When I ask which tree covers it
    Then every matching tree is returned
    And they are ordered from strongest to weakest match

  @edge-case
  Scenario: Wording is matched regardless of case
    When I ask which tree covers "VALIDATE DOCUMENTATION"
    Then the tree triggered by that phrase is returned

  @edge-case
  Scenario: No tree covers the request
    Given no tree recognises anything in my request
    When I ask which tree covers "book me a flight"
    Then I am told no trees match that request

  @happy-path
  Scenario: Take the matches as data
    When I ask which tree covers a request, in machine-readable form
    Then I receive my request and each match with its identifier, trigger, starting node, strength and location

  @edge-case @wip @later
  Scenario: A tree that declares no subjects is still matchable
    # Note: assumed behaviour — subject matching currently assumes every tree declares subjects.
    #       See Open questions.
    Given a tree that declares a trigger but no subjects
    When I ask which tree covers that trigger
    Then that tree is returned as a match
