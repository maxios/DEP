@flow-63 @project-lead @should
Feature: FLOW-63 Choosing which parts of the loop run
  """
  As the person who runs a project with the loop on,
  I want to choose which parts of it run — recording, usage, the heartbeat, how owners act,
  whether a model is ever asked and how often —
  so that I turn on only what I trust, and can see at a glance what is running and why.
  """
  # Design: docs/desired-user-stories/liveness-design.md#configuring-the-loop
  # Source: cli/src/loop-config.ts

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: Turning the loop on records requests
    Given a project whose configuration turns the loop on
    When I ask the documentation set a question
    Then the request is recorded

  @happy-path
  Scenario: Recording off, usage on
    Given a project whose configuration turns the loop on, but not recording
    And a question I asked earlier
    When I report which passages I used
    Then the report is recorded
    And no request was recorded

  @happy-path
  Scenario: With the loop on, owners are woken but nothing acts until I choose how
    Given a project whose configuration turns the loop on
    And a document waiting on someone past its follow-up time
    And someone has supplied a way to act
    When the owner's heart beats
    Then the owner is woken
    And nothing was asked to act, and the beat says why

  @happy-path
  Scenario: I can see which parts are running, and why
    Given a project whose configuration turns the loop on, but not recording
    When I ask which parts of the loop are running
    Then I am told recording is off because the configuration says so
    And I am told the heartbeat is on, but acts on nothing
    And I am told models are off by default

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: With models off, a model is never asked; rules still act
    Given a project whose configuration lets owners act, but not with a model
    And a document waiting on someone past its follow-up time
    And a model has been supplied to act
    When the owner's heart beats
    Then the model was not asked, and the beat says why
    But with the rules supplied instead, the owner follows up

  @edge-case
  Scenario: Owners may act by model, but with models off none is asked
    Given a project whose configuration lets owners act by model, but turns models off
    And a document waiting on someone past its follow-up time
    And a model has been supplied to act
    When the owner's heart beats
    Then the model was not asked, because no model may be asked here

  @edge-case
  Scenario: The day's model budget stops model calls when it is used
    Given a project whose configuration lets a model act, at most twice a day
    And a model has been supplied to act
    When an owner with something to do beats three times in a day
    Then the model was asked twice
    And the third beat says the day's model budget is used

  # ─────────────────────────────────────────────
  # Error
  # ─────────────────────────────────────────────

  @error
  Scenario: A loop configuration that does not make sense fails validation
    Given a project whose loop configuration says owners act "sometimes"
    When the documentation set is validated
    Then the configuration fails validation
    And I am told what is wrong with it
