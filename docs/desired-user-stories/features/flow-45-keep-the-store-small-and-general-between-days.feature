@flow-45 @developer @loop @should
Feature: FLOW-45 Keep the store small and general between days
  """
  As someone whose agent learns a little from every episode,
  I want the end of each day to fade what went unused, put away what has long stopped
  helping, and fold claims that say the same thing about similar situations into one rule,
  so that the store stays small enough to read and general enough to carry to new situations.
  """
  # Design: docs/desired-user-stories/liveness-design.md#build-order
  # Source: packages/loop/src

  Background:
    Given the reference maze, pinned to the core it was proven on

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: Claims nobody read today fade
    Given the store holds a claim that was read today and one that was not
    When the day ends
    Then the claim nobody read is held a little less strongly than before
    And the claim that was read is held exactly as strongly as the day left it

  @happy-path
  Scenario: A claim that has long stopped helping is put away, not destroyed
    Given a claim that has faded below use and is older than faded claims are kept
    When the day ends
    Then the player is no longer shown it
    And it is still in the store, with its history

  @happy-path
  Scenario: The same advice about situations that look alike becomes one rule
    Given the store holds the same advice about situations that differ only in which way the player came in
    When the day ends
    Then the store holds one rule in their place
    And the rule says which claims it came from
    And the rule is about only what those situations had in common
    And the claims it came from are put away

  @happy-path
  Scenario: The end of a day is part of the record
    Given several days have been played
    When I rebuild the store from its record of changes
    Then the rebuilt store has the same fingerprint as the one the day left behind

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @validation
  Scenario: Different advice is never folded together
    Given the store holds different advice about situations that differ only in which way the player came in
    When the day ends
    Then each piece of advice is still held on its own

  @edge-case
  Scenario: A claim too new to judge is not put away
    Given a claim that has faded below use but is younger than faded claims are kept
    When the day ends
    Then the player can still be shown it
