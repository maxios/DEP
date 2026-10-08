@flow-61 @ai-agent @heartbeat @loop @should
Feature: FLOW-61 What the agent learned about following up is used, and judged
  """
  As the person whose owners follow things up,
  I want what the agent has learned about following up to be put in front of the owner
  when a loop falls due, and that advice to grow stronger when following it was answered
  and weaker when it was not,
  so that the owners' habits of following up are shaped by what actually worked.
  """
  # Design: docs/desired-user-stories/liveness-design.md#the-bridge--follow-up-outcomes-become-episodes-heartbeat-m5-first-half
  # Source: packages/loop/src/follow-ups.ts

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: What was learned about following up is shown when a loop falls due
    Given the agent has learned that following up with the testers gets answered
    And my actions are decided by a model
    And a document of mine waiting past its follow-up time
    When my heart beats and the model decides what I do
    Then the model was shown that advice for the document

  @happy-path
  Scenario: Advice followed and answered is held more strongly
    Given the agent has learned that following up with the testers gets answered
    And a document of mine waiting past its follow-up time
    When I follow it up as advised and the testers answer in time
    And the agent learns from what was scored
    Then the advice is held more strongly than before

  @happy-path
  Scenario: Advice followed and not answered is held less strongly
    Given the agent has learned that following up with the testers gets answered
    And a document of mine waiting past its follow-up time
    When I follow it up as advised and it goes unanswered until it comes to the person
    And the agent learns from what was scored
    Then the advice is held less strongly than before

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: Advice about someone else is not shown
    Given the agent has learned that following up with legal gets answered
    And my actions are decided by a model
    And a document of mine waiting past its follow-up time
    When my heart beats and the model decides what I do
    Then the model was shown no advice for the document

  @security
  Scenario: The advice shown carries no strength
    Given the agent has learned that following up with the testers gets answered
    And my actions are decided by a model
    And a document of mine waiting past its follow-up time
    When my heart beats and the model decides what I do
    Then nothing the model was shown carries the strength the advice is held at
