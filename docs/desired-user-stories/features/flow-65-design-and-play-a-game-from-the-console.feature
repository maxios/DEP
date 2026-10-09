@flow-65 @project-lead @console @loop @should
Feature: FLOW-65 Design and play a game from the console
  """
  As the person whose agent is learning,
  I want to see my project's games, what each level is and what it expects, whether a game
  can be played and why not, to change its rules safely, and to play a day and watch it learn,
  so that the agent learns my way of doing things from games I can shape without leaving the console.
  """
  # Design: designs/dep-console-game.pen
  # Source: packages/loop/src/game/room.ts

  Background:
    Given a project whose configuration turns the loop on, with the doc-maintenance game

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: The console lists the project's games, and whether each can be played
    When I ask the console for the games
    Then I see the doc-maintenance game with its levels, options and situation
    And I see it passes every check and can be played

  @happy-path
  Scenario: Each level is shown with its situation and what it expects
    When I ask the console for the doc-maintenance game's levels
    Then I see every level with the situation it is read as
    And I see what each level's scenario expects

  @happy-path
  Scenario: Playing a day judges every level and the agent learns
    When I play a day of the doc-maintenance game from the console
    Then every level it played was judged, and the day says how many passed
    And what the agent learned is written for the Loop tab

  @happy-path
  Scenario: Each day carries on from the last
    Given a day of the doc-maintenance game has been played from the console
    When I play another day from the console
    Then it is the second day, and the agent remembers the first

  @happy-path
  Scenario: Changing a game's rules is saved when the game still makes sense
    When I change the game's options from the console to ones it can learn
    Then the game document has the new options
    And the game still passes every check

  # ─────────────────────────────────────────────
  # Edge Cases / Error
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: A game without its judge is checked, and cannot be played
    Given a draft game whose judge has not been written
    When I ask the console for the games
    Then I see the draft cannot be played, because its judge is missing
    And playing a day of it is refused with that reason

  @error
  Scenario: A change that would break the game is not saved
    When I change the game's options from the console to ones it cannot learn
    Then I am told why the change was refused
    And the game document is unchanged

  # ─────────────────────────────────────────────
  # Security
  # ─────────────────────────────────────────────

  @security
  Scenario: A page from another site cannot play or change a game
    When a page from another site tries to play a day and change the rules
    Then both are refused
    And no day was played and the game document is unchanged

  @security
  Scenario: With the loop off, the console offers no games
    Given the project turns the loop off
    When I ask the console for the games
    Then the console says it does not serve them
