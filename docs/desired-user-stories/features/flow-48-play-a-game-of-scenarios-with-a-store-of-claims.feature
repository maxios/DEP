@flow-48 @developer @loop @should
Feature: FLOW-48 Play a game of scenarios with a store of claims
  """
  As someone building an agent that should get better at a task judged by scenarios,
  I want the same store that learned the maze to learn a game whose levels are Gherkin
  scenarios and whose only judge is running them,
  so that what the agent remembers is shaped by what passes, not by what it believes.
  """
  # Design: docs/desired-user-stories/liveness-design.md#notating-the-game
  # Source: packages/loop/src/game

  Background:
    Given the reference game of scenarios

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: The scenarios keep score
    When the player plays a day of the game
    Then every level it played was judged by running its scenario
    And each level scores what the game document says passing and failing are worth

  @happy-path
  Scenario: Playing with the store beats playing without it
    When the player plays the same days of the game with a store and without one
    Then by the last day it passes more levels with the store

  @happy-path
  Scenario: The same seed plays the same day
    When I play a day of the game twice from the same seed
    Then both days end with the same fingerprint

  @happy-path
  Scenario: What is learned in one product area is offered in another
    Given the store learned a claim on a level in one product area
    When the player meets a level in another area that is otherwise the same situation
    Then that claim is offered

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: Breaking a level that used to pass costs more than failing it
    Given a level the player passed on an earlier day
    When the player fails it on a later day
    Then that failure scores as breaking what worked, below an ordinary failure
