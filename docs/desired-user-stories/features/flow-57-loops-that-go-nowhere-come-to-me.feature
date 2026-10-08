@flow-57 @human-author @heartbeat @should
Feature: FLOW-57 Loops that go nowhere come to me
  """
  As the person the owners work for,
  I want a loop that has been followed up enough, or an exchange between owners that
  is going round in circles, to stop and come to me — and not at night unless it is urgent —
  and each owner to ask only whom their role allows,
  so that the owners never nag, never talk among themselves forever, and never wake me for nothing.
  """
  # Design: docs/desired-user-stories/liveness-design.md#the-clocks
  # Source: cli/src/heart/actions.ts

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: After the last follow-up, the loop comes to me
    Given a document of mine waiting past its follow-up time, already followed up as often as it allows
    When my heart beats and I act on what I am told
    Then no one is asked again
    And I am told the loop needs me, and which document it is
    And the document says it is escalated

  @happy-path
  Scenario: A loop that came to me does not wake its owner again
    Given a document of mine waiting past its follow-up time, already followed up as often as it allows
    And my heart has beaten and escalated it
    When my heart beats again an hour later
    Then I am not woken

  @happy-path
  Scenario: Two owners answering each other stop at the limit
    Given one owner has asked another a question
    When both answer whatever they are sent, beat after beat
    Then the exchange stops after the limit of messages between them
    And I am told the exchange needs me

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: An owner may only ask whom their role allows
    Given my role says I may ask only the testers
    And someone wrote to me
    And I would ask the finance owner about it
    When my heart beats and I act on what I am told
    Then the action is refused and recorded as refused
    And I am told whom my role allows me to ask

  @edge-case
  Scenario: Whatever my role says, I can always bring a loop to the person
    Given my role says I may ask no one
    And a document of mine waiting past its follow-up time, already followed up as often as it allows
    When my heart beats and I act on what I am told
    Then I am told the loop needs me, and which document it is

  @edge-case
  Scenario: At night, what comes to me waits until morning
    Given my quiet hours are from 22:00 to 08:00
    And it is 23:00
    And a document of mine waiting past its follow-up time, already followed up as often as it allows
    When my heart beats and I act on what I am told
    Then nothing has reached me yet
    And it reaches me at 08:00

  @edge-case
  Scenario: What is urgent reaches me even at night
    Given my quiet hours are from 22:00 to 08:00
    And it is 23:00
    And someone wrote to me
    And I would bring it to the person as urgent
    When my heart beats and I act on what I am told
    Then it has reached me already

  # ─────────────────────────────────────────────
  # Error
  # ─────────────────────────────────────────────

  @error
  Scenario: A role that does not make sense is reported by validation
    Given a role that may ask "everyone"
    When the documentation set is validated
    Then the role document fails validation
    And I am told what is wrong with the role
