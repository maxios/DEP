@flow-64 @human-author @console @heartbeat @loop @should
Feature: FLOW-64 See the loop in the console
  """
  As the person the owners work for,
  I want the console to show the loop at a glance — which parts run, each owner's heartbeat,
  what woke them and what they did, what is waiting for me, how follow-ups were scored,
  and what the agent has learned — and to let me answer what was brought to me,
  so that I can watch the loop work and step in without leaving the console.
  """
  # Design: designs/dep-console-loop.pen
  # Source: cli/src/console/server.ts

  Background:
    Given a project whose configuration lets owners act

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: Each owner's heartbeat is shown
    Given an owner whose heart has beaten with a loop due
    When I ask the console for the heartbeat
    Then I see each owner, when they last beat and when they beat next
    And I see whether they were woken, and for what
    And I see how many beats there were today and how many woke someone

  @happy-path
  Scenario: What the owners did is shown, refusals with their reasons
    Given an owner whose heart has beaten and was refused an action
    When I ask the console for the heartbeat
    Then I see the actions that were done and the one that was refused, with why

  @happy-path
  Scenario: What was brought to me is shown, and I can answer it
    Given a loop that has been brought to me
    When I ask the console for the heartbeat
    Then I see what is waiting for me
    When I reply to it from the console
    Then my reply is in the owner's inbox, from me
    And it is no longer waiting for me

  @happy-path
  Scenario: How follow-ups were scored is shown
    Given follow-ups that were answered in time, late and never
    When I ask the console for the heartbeat
    Then I see how many follow-ups were answered in time, late and never

  @happy-path
  Scenario: What the agent has learned is shown from the loop's summary
    Given the loop has written a summary of what the agent learned
    When I ask the console what the agent has learned
    Then I see the pass rate by day, for each run
    And I see the advice it relies on, with how often it was acted on and passed
    And nothing I see says how strongly a claim is held

  # ─────────────────────────────────────────────
  # Edge Cases / Security
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: With the heartbeat off, the console shows none of it
    Given the project turns the heartbeat off
    When I ask the console for the heartbeat
    Then the console says it does not serve it

  @security
  Scenario: A page from another site cannot reply for me
    Given a loop that has been brought to me
    When a page from another site tries to reply to it
    Then the change is refused
    And nothing is in the owner's inbox from me
