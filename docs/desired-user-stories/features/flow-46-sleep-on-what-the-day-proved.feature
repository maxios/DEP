@flow-46 @developer @loop @should
Feature: FLOW-46 Sleep on what the day proved
  """
  As someone whose agent's context fills with claims that keep proving right,
  I want a night that moves those claims out of context and into the agent's instincts,
  only after a day that was going well and only when the move does not make it worse,
  so that context holds what is still being learned rather than what is already known.
  """
  # Design: docs/desired-user-stories/liveness-design.md#build-order
  # Source: packages/loop/src

  Background:
    Given the reference maze, pinned to the core it was proven on

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: A day that was going well is slept on
    Given a day of play that was settling down
    When the night comes
    Then the player wakes with a new version of its instincts
    And the new version was taught only claims that had proved themselves

  @happy-path
  Scenario: The night teaches without showing the claim it teaches
    Given a day of play that was settling down
    When the night comes
    Then nothing the night was taught from contains a claim from the store

  @happy-path
  Scenario: A claim the instincts now carry is let go
    Given a day of play that was settling down
    When the night comes and the following days pass
    Then a claim the new instincts carry is no longer offered as advice
    And it is still in the store, marked as absorbed

  @happy-path
  Scenario: Every night is part of the record
    Given several days and nights have passed
    When I rebuild the store from its record of changes
    Then the rebuilt store has the same fingerprint as the one the day left behind

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @validation
  Scenario: A day that was thrashing is not slept on
    Given a day of play that was getting worse
    When the night comes
    Then the player wakes with the instincts it went to sleep with
    And I am told the day was not slept on, and why
    And no claim is marked as absorbed

  @validation
  Scenario: A day that failed throughout is not slept on
    Given a day of play that failed from start to finish
    When the night comes
    Then the player wakes with the instincts it went to sleep with
    And I am told the day was not slept on, and why
    And no claim is marked as absorbed

  @edge-case
  Scenario: A claim the instincts did not take in stays in context
    Given a day of play that was settling down
    And a trainer that leaves one proven claim out
    When the night comes
    Then that claim is still offered as advice
    And it is not marked as absorbed
    And the rest of what the night learned is kept

  @edge-case
  Scenario: A claim the context still needs is held back without losing the night
    Given a day of play after which letting every proven claim go would leave the player worse
    When the night comes
    Then the rest of what the night learned is kept
    And not every claim it was taught was let go
    And a claim it held back is still offered as advice

  @error
  Scenario: A night that taught the opposite of its claims is undone
    Given a day of play that was settling down
    And a trainer that teaches the opposite of what the claims say
    When the night comes
    Then the player wakes with the instincts it went to sleep with
    And I am told the night was undone because it taught against its own claims
    And no claim is marked as absorbed

  @error
  Scenario: A night that would make the player worse is undone
    Given a day of play that was settling down
    And a trainer that teaches only a habit leading away from the goal everywhere
    When the night comes
    Then the player wakes with the instincts it went to sleep with
    And I am told the night was undone because its instincts, on their own, did worse
    And no claim is marked as absorbed
