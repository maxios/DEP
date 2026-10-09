@flow-54 @human-author @loop @should
Feature: FLOW-54 Teach the agent by editing what it learned
  """
  As the person whose agent is learning,
  I want my changes to the document of what it learned to change what it knows —
  advice I strike out is no longer given, advice I add is given and tested,
  and what I write in my own words is kept —
  so that its memory comes to match the way I work, not only what the scenarios reward.
  """
  # Design: docs/desired-user-stories/liveness-design.md#the-claim
  # Source: packages/loop/src/judgement.ts

  Background:
    Given a game the agent has played for several days
    And what it learned has landed as a document

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: Advice I strike out is no longer given
    Given I struck out a piece of its advice
    When the agent reads my changes
    Then that advice is not given in the situation it was about

  @happy-path
  Scenario: A habit I strike out is dropped
    Given I struck out one of its habits
    When the agent reads my changes
    Then it no longer acts on that habit without being told

  @happy-path
  Scenario: Advice I add is given
    Given I added advice of my own in the same form as its own
    When the agent reads my changes
    Then my advice is given in the situation I named

  @happy-path
  Scenario: Advice I add is tested like any other
    Given I added advice of my own in the same form as its own
    And the agent has read my changes
    When it plays another day
    And it writes out what it learned again
    Then my advice is listed as what I told it
    And it says how often my advice was acted on and how often that passed

  @happy-path
  Scenario: What I write in my own words is kept
    Given I wrote a note of my own in the document
    When the agent reads my changes
    And it writes out what it learned again
    Then my note is still in the document

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: Once it has read my changes it can propose again
    Given I struck out a piece of its advice
    When the agent reads my changes
    And it writes out what it learned again
    Then it is no longer refused as changed by hand

  @edge-case
  Scenario: Reading the same changes twice changes nothing more
    Given I struck out a piece of its advice
    When the agent reads my changes twice
    Then its memory is the same as after the first reading

  @edge-case
  Scenario: What I told it is never folded into a rule of its own
    Given I told it advice alike to proven advice of its own
    When the day ends
    Then my advice is still held in my own words

  @error
  Scenario: Advice naming a choice the game does not have is kept as a note
    Given I added advice that names a choice the game does not offer
    When the agent reads my changes
    Then that advice is not given anywhere
    And it is kept as my note
    And I am told it was not understood as advice
