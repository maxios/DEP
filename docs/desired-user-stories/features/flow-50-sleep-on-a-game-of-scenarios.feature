@flow-50 @developer @loop @should
Feature: FLOW-50 Sleep on a game of scenarios
  """
  As someone whose agent plays a game judged by scenarios,
  I want its nights to work as they do on the maze — trying what they learned on levels
  no day played, and undoing anything that makes the player worse —
  and to rerun the scenarios only when the answer or the judge has changed,
  so that a night costs what it has to and no more, without trusting a stale verdict.
  """
  # Design: docs/desired-user-stories/liveness-design.md#build-order
  # Source: packages/loop/src/game

  Background:
    Given the reference game of scenarios

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: A good run of days at the game is slept on
    Given several days of the game that were going well
    When the night comes after the last of them
    Then the player wakes with a new version of its instincts

  @happy-path
  Scenario: The night tries its work on levels no day played
    Given several days of the game that were going well
    When the night comes after the last of them
    Then every level the night judged on is one no day played

  @happy-path
  Scenario: An answer judged once is not judged again when the game says levels stand alone
    Given a game whose levels each read only their own answer
    When the same answers are judged twice
    Then the scenarios are run once

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @validation
  Scenario: Without that promise, every judging runs the scenarios
    Given a game that does not say its levels stand alone
    When the same answers are judged twice
    Then the scenarios are run twice

  @security
  Scenario: Nothing judged before the judge changed is trusted after
    Given a game whose levels each read only their own answer
    And the same answers were judged once
    When the steps that judge them change
    And the same answers are judged again
    Then the scenarios are run again

  @error
  Scenario: A night that would make the player worse at the game is undone
    Given several days of the game that were going well
    And a trainer that teaches only one answer for everything
    When the night comes after the last of them
    Then the player wakes with the instincts it went to sleep with
    And I am told the night was undone because its instincts, on their own, did worse
