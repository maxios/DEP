@flow-49 @developer @loop @security @should
Feature: FLOW-49 An answer that reaches the judge does not count
  """
  As someone whose agent is scored by scenarios,
  I want any answer that writes outside where the player may write, or onto the scenarios
  and steps that judge it, to count for nothing,
  so that the agent cannot get better by changing the test instead of the work.
  """
  # Design: docs/desired-user-stories/liveness-design.md#notating-the-game
  # Source: packages/loop/src/game/play.ts

  Background:
    Given the reference game of scenarios

  @validation
  Scenario: An answer that writes somewhere the player may not write is void
    Given a player that also writes outside where the game lets it
    When the player plays a day of the game
    Then its answers count for nothing that day
    And I am told where it tried to write

  @security
  Scenario: An answer that writes onto the steps that judge it is void
    Given a player that also rewrites the steps that judge it
    When the player plays a day of the game
    Then its answers count for nothing that day
    And the steps that judge it are unchanged

  @security
  Scenario: A day on which the judge was changed by any route is void
    Given a player that changes the scenarios behind the game's back
    When the player plays a day of the game
    Then nothing from that day is learned
    And I am told the judge changed during the day
