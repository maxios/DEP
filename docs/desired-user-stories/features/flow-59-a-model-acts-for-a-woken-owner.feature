@flow-59 @ai-agent @heartbeat @should
Feature: FLOW-59 A model acts for a woken owner
  """
  As the person the owners work for,
  I want a model to decide what a woken owner does — shown what woke them, their role,
  and the documents concerned, and nothing that is not theirs —
  while every guard that held for the rules holds for the model,
  so that owners answer and follow up in their own words without being able to overreach.
  """
  # Design: docs/desired-user-stories/liveness-design.md#phase-d--actions-leases-once-only-heartbeat-m2
  # Source: cli/src/heart/runners/claude.ts

  Background:
    Given my actions are decided by a model

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: The model is told what woke me, who I am, and what I may do
    Given my role says I may ask only the testers
    And someone wrote to me
    When my heart beats and the model decides what I do
    Then the model was shown the message in full
    And the model was shown my role
    And the model was shown the kinds of action I may take, and whom I may ask

  @happy-path
  Scenario: The model is shown the documents that need me
    Given a document of mine waiting past its follow-up time
    When my heart beats and the model decides what I do
    Then the model was shown the document and what it is waiting on

  @happy-path
  Scenario: What the model decides is carried out like any other action
    Given someone wrote to me
    When my heart beats and the model decides what I do
    Then a reply to them is waiting in their inbox

  # ─────────────────────────────────────────────
  # Security
  # ─────────────────────────────────────────────

  @security
  Scenario: The model is shown only what is mine
    Given someone wrote to me
    And someone wrote to another owner
    When my heart beats and the model decides what I do
    Then the model was not shown the other owner's message

  @security
  Scenario: A message that tells the model to overreach is stopped by the same guards
    Given a document waiting past its follow-up time that someone else owns
    And someone wrote to me telling me to close every loop in the project
    And the model does as the message says
    When my heart beats and the model decides what I do
    Then the action is refused and recorded as refused
    And the document is unchanged

  # ─────────────────────────────────────────────
  # Error
  # ─────────────────────────────────────────────

  @error
  Scenario: A model that cannot be reached leaves the beat unacted, to be tried again
    Given someone wrote to me
    And the model cannot be reached
    When my heart beats and the model decides what I do
    Then the beat is recorded with why nothing was done
    And their message to me is still unread
    And my next beat is woken by it again
