@flow-44 @developer @loop @should
Feature: FLOW-44 Learn a maze from a store of claims
  """
  As someone building an agent that should get better at a task with experience,
  I want a store of claims keyed by situation that only honest outcomes can strengthen,
  so that the agent's context improves with what happened, not with what it says about itself.
  """
  # Design: docs/desired-user-stories/liveness-design.md#build-order
  # Design: docs/desired-user-stories/liveness-design.md#the-contradiction
  # Source: packages/loop/src

  Background:
    Given the reference maze, pinned to the core it was proven on

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: An empty store changes nothing
    When the player plays a day of fresh mazes, starting with an empty store
    Then its first maze is played exactly as it would be with no store at all
    And the store holds claims about situations, never about particular places

  @happy-path
  Scenario: Playing with the store beats playing without it
    When the player plays the same days of mazes with a store and without one
    Then with the store it falls short less often
    And with the store its runs score better

  @happy-path
  Scenario: The same seed plays the same day
    When I play a day twice from the same seed
    Then both days end with the same fingerprint

  @happy-path
  Scenario: The store can be rebuilt from what it recorded
    Given a day has been played
    When I rebuild the store from its record of changes
    Then the rebuilt store has the same fingerprint as the one the day left behind

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @validation
  Scenario: The player cannot award itself
    Given a player that reports every episode as a triumph
    When it plays a day of fresh mazes with a store of claims
    Then the store is exactly what an honest player making the same moves would have left

  @edge-case
  Scenario: The player is shown claims, never how much they are trusted
    When the player is shown what the store knows about a situation
    Then it receives the claims best first
    And nothing it receives says how strongly any of them is held

  @edge-case
  Scenario: Only the claims the player followed are credited
    Given the store holds two claims about one situation that recommend different moves
    When the player follows one of them and the episode goes well
    Then the claim it followed is held more strongly
    And the claim it passed over is held exactly as strongly as before

  @error
  Scenario: Refuse a maze core that is not the one the engine was proven on
    Given the vendored maze core no longer matches its pin
    When I start a day
    Then I am told the core does not match its pin
    And no day is played
