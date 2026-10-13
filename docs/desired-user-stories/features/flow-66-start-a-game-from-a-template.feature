@flow-66 @project-lead @human-author @loop @games @should
Feature: FLOW-66 Start a game from a template
  """
  As the person whose agents are learning,
  I want to start a game for the kind of agent I run (a tester, a React component author,
  a code reviewer, an API author) from a template whose policy I can read and change,
  so that each agent learns the way my team works without my writing a game from nothing.
  """
  # Design: designs/dep-console-game.pen (Games, New game)
  # Source: packages/loop/src/game/templates/

  Background:
    Given a project whose configuration turns the loop on, with Cucumber installed

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: The templates are listed with what each teaches
    When I list the game templates
    Then I see templates for a tester, a React component author, a code reviewer and an API author
    And each says what it teaches, its options, and how many levels it has

  @happy-path
  Scenario Outline: A game started from a template can be played straight away
    When I start a game from the "<template>" template
    Then the project has the game's document, its scenarios and its judge
    And the game passes every check and can be played
    And the game document states the policy its judge holds

    Examples:
      | template        |
      | tester          |
      | react-component |
      | code-reviewer   |
      | api-change      |

  @happy-path
  Scenario Outline: The judge holds exactly the policy the game document states
    Given a game started from the "<template>" template
    When every level is answered the way the stated policy says
    Then every level passes
    And answering every level with the same option does not

    Examples:
      | template        |
      | tester          |
      | react-component |
      | code-reviewer   |
      | api-change      |

  @happy-path
  Scenario: The console starts a game from a template too
    When I ask the console for the game templates
    And I start a game from the "tester" template from the console
    Then the console lists the new game, and it can be played

  # ─────────────────────────────────────────────
  # Edge Cases / Error
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: A game that already exists is not overwritten
    Given a game started from the "tester" template
    And its policy has been changed by hand
    When I start a game from the "tester" template again
    Then I am told the game already exists
    And the changed policy is kept

  @error
  Scenario: An unknown template is refused, naming the ones there are
    When I start a game from the "poet" template
    Then I am told there is no such template, with the list of templates
    And no game is written

  @error
  Scenario: Without Cucumber in the project, the game says how to get it
    Given a project whose configuration turns the loop on, without Cucumber installed
    When I start a game from the "tester" template
    Then the game cannot be played, because its judge cannot be run
    And I am told how to install what the judge needs

  # ─────────────────────────────────────────────
  # Security
  # ─────────────────────────────────────────────

  @security
  Scenario: A page from another site cannot start a game
    When a page from another site tries to start a game from the "tester" template
    Then the change is refused
    And no game is written
