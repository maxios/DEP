@flow-56 @ai-agent @heartbeat @should
Feature: FLOW-56 A woken owner acts, and only once
  """
  As an owner woken by my heart,
  I want to act through a small set of typed actions — reply, ask, wait, take up, close —
  that change my documents and send messages in the project, never twice, and never
  on a document someone else is acting on,
  so that a beat that is retried or interrupted leaves the project as if it had run once.
  """
  # Design: docs/desired-user-stories/liveness-design.md#the-policy-is-already-a-dep-artifact
  # Source: cli/src/heart/actions.ts

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: A message to me is answered within one beat
    Given someone wrote to me
    When my heart beats and I act on what I am told
    Then a reply to them is waiting in their inbox
    And their message to me is marked read
    And my next beat is not woken by it

  @happy-path
  Scenario: A follow-up that is due is followed up
    Given a document of mine waiting past its follow-up time
    When my heart beats and I act on what I am told
    Then the one it waits on is asked again about the document
    And the document says it has been followed up once more, from now

  @happy-path
  Scenario: Open work I own is taken up
    Given a document of mine that is open work
    When my heart beats and I act on what I am told
    Then the document is active

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: A document another beat is acting on is left alone
    Given a document of mine waiting past its follow-up time
    And another beat holds the document
    When my heart beats and I act on what I am told
    Then nothing is done to the document
    And no one is asked again

  @edge-case
  Scenario: A hold that has run out is taken over
    Given a document of mine waiting past its follow-up time
    And another beat held the document but its hold has run out
    When my heart beats and I act on what I am told
    Then the one it waits on is asked again about the document

  @error
  Scenario: A beat stopped partway is run again without doing anything twice
    Given a document of mine waiting past its follow-up time
    And my beat stopped after sending the follow-up but before the document recorded it
    When the same beat is run again
    Then each action has been done exactly once

  @error
  Scenario: The same action asked for twice in one beat is done once
    Given a document of mine waiting past its follow-up time
    And I would ask for every follow-up twice
    When my heart beats and I act on what I am told
    Then the one it waits on is asked again about the document
    And the document says it has been followed up once more, from now

  # ─────────────────────────────────────────────
  # Security
  # ─────────────────────────────────────────────

  @security
  Scenario: An action on a document I do not own is refused
    Given a document waiting past its follow-up time that someone else owns
    And I would act on it if I could
    When my heart beats and I act on what I am told
    Then the action is refused and recorded as refused
    And I am told I do not own the document
    And the document is unchanged

  @security
  Scenario: An action that is not one of the allowed kinds is refused
    Given a document of mine that is open work
    And I would answer with an action of my own invention
    When my heart beats and I act on what I am told
    Then the action is refused and recorded as refused
    And nothing is written

  @security
  Scenario: With the kill switch on, nothing acts
    Given someone wrote to me
    And the kill switch is on
    When my heart beats and I act on what I am told
    Then nothing was asked to act
    And nothing is written
