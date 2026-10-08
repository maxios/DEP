@flow-60 @ai-agent @heartbeat @loop @should
Feature: FLOW-60 What happens after a follow-up is scored
  """
  As the person whose owners follow things up,
  I want what came of each ask — answered in time, answered late, or never answered —
  observed by the heartbeat and scored, and those scores to become what the agent
  learns from, never anything an owner says about itself,
  so that the agent learns when and whom to follow up from what actually happened.
  """
  # Design: docs/desired-user-stories/liveness-design.md#the-contradiction
  # Source: cli/src/heart/outcomes.ts

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: An answer within the follow-up time scores the ask well
    Given I followed up a document with the one it waits on
    And they answered within the follow-up time
    When my heart beats
    Then the ask is scored as answered in time

  @happy-path
  Scenario: An answer after the follow-up time scores less
    Given I followed up a document with the one it waits on
    And they answered only after the follow-up time had passed
    When my heart beats
    Then the ask is scored as answered late, below an answer in time

  @happy-path
  Scenario: A loop that had to come to the person scores its follow-ups as unanswered
    Given I followed up a document with the one it waits on
    And it was followed up as often as it allows without an answer
    When my heart beats and I act on what I am told
    Then the ask is scored as never answered, below zero

  @happy-path
  Scenario: Scored follow-ups become what the agent learns from
    Given asks that were answered in time and asks that went unanswered
    When the agent learns from what was scored
    Then following up is remembered as advice where it was answered
    And nothing is remembered as advice where it went unanswered

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: An answer from someone else does not close the ask
    Given I followed up a document with the one it waits on
    And someone else answered about the document
    When my heart beats
    Then the ask is not scored yet

  @edge-case
  Scenario: An ask is scored once
    Given I followed up a document with the one it waits on
    And they answered within the follow-up time
    When my heart beats twice
    Then the ask has been scored once

  # ─────────────────────────────────────────────
  # Security
  # ─────────────────────────────────────────────

  @security
  Scenario: Nothing an owner says about itself changes a score
    Given I followed up a document with the one it waits on
    And I would claim, in what I answer, that it went well
    And they answered only after the follow-up time had passed
    When my heart beats and I act on what I am told
    Then the ask is scored as answered late, below an answer in time
