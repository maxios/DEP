@flow-52 @human-author @loop @should
Feature: FLOW-52 What the agent learned reads as rules
  """
  As the person whose agent is learning,
  I want what it learned in many alike situations said once, as a rule,
  without the details that never mattered,
  so that the document of what it learned is short enough to read and argue with.
  """
  # Design: docs/desired-user-stories/liveness-design.md#phase-c--what-it-learned-written-out
  # Source: packages/loop/src/clock.ts

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: Advice that holds whatever the area is, is written without the area
    Given a game the agent has played for several days
    When I write out what the agent has learned
    Then some of its advice does not mention the area at all

  @happy-path
  Scenario: Alike claims are kept long enough to become a rule
    Given the agent holds advice about one situation
    When the same advice proves itself in a situation that differs in one detail
    Then both are kept until the end of the day

  @happy-path
  Scenario: A rule grows more general a day at a time
    Given the agent holds a rule and proven advice that differs from it in one more detail
    When the day ends
    Then the two become one rule that leaves out that detail too

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: A rule never covers an exception the agent knows of
    Given the agent holds alike advice that would fold into a rule
    And proven advice to do something else in a situation that rule would cover
    When the day ends
    Then no rule covers the exception
    And the exception is still held

  @edge-case
  Scenario: A rule is only given where its conditions hold
    Given the agent holds a rule about large requests from new customers
    When it meets a large request from a gold customer
    Then the rule is not given
    But a large request from a new customer is given the rule

  @edge-case
  Scenario: Only advice that has proved itself becomes a rule
    Given the agent holds alike advice that has hardly been acted on
    When the day ends
    Then no rule is made from it

  @edge-case
  Scenario: A rule keeps the evidence of what it was made from
    Given the agent holds alike advice that would fold into a rule
    When the day ends
    Then the rule has been acted on as often as all of them together
    And has passed as often as all of them together
