@flow-58 @ai-agent @loop @should
Feature: FLOW-58 A model plays the game
  """
  As the person whose agent is learning,
  I want a real model to answer the game's levels — shown the situation, the options,
  and what the agent has learned, and nothing about how it will be judged —
  so that the store and the documents it writes are learned from a real agent's play,
  under the same judge and the same guards as before.
  """
  # Design: docs/desired-user-stories/liveness-design.md#build-order
  # Source: packages/loop/src/players/claude.ts

  Background:
    Given the reference game of scenarios
    And a model player

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: The model answers each level with one of the game's options
    When the model plays a day of the game
    Then every level it played was judged by running its scenario
    And each answer is one of the game's options

  @happy-path
  Scenario: What the agent has learned is put in front of the model
    Given the agent holds advice about a situation
    When the model answers a level in that situation
    Then the advice is in what the model was shown

  @happy-path
  Scenario: The model's play is learned from like any other player's
    When the model plays a day of the game
    Then what passed is remembered as advice, and nothing that failed is

  # ─────────────────────────────────────────────
  # Security
  # ─────────────────────────────────────────────

  @security
  Scenario: The model is never shown how its answer will be judged
    When the model plays a day of the game
    Then nothing it was shown contains a step of the scenario it answered
    And nothing it was shown names the outcome its scenario expects

  @security
  Scenario: The model is never shown how strongly a claim is held
    Given the agent holds advice about a situation
    When the model answers a level in that situation
    Then nothing it was shown carries the strength a claim is held at

  # ─────────────────────────────────────────────
  # Error
  # ─────────────────────────────────────────────

  @error
  Scenario: An answer that is not one of the options is not played
    Given a model that answers one level with a choice the game does not offer
    When the model plays a day of the game
    Then that level is void, with the reason
    And nothing is learned from it

  @error
  Scenario: A model that cannot be reached leaves the day unplayed
    Given a model that cannot be reached
    When the model plays a day of the game
    Then I am told the model could not be reached
    And the agent's memory is unchanged
