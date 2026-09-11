@flow-37 @project-lead @install @mvp
Feature: FLOW-37 Install from a downloaded file, with no shell at all
  """
  As a project lead on a machine where scripts are blocked,
  I want the downloaded CLI to install itself, register with the desktop client and prove it works,
  so that one file and one run is the whole setup on Windows, macOS or Linux.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: prompts/install-dep.md
  # Source: cli/src/commands/setup.ts

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @mvp
  Scenario: Set up for a project
    Given a project configured for DEP
    When I run setup for that project with a home location and a desktop configuration file
    Then the desktop configuration names the CLI as the server for that project
    And I am told where the CLI lives, that the desktop client was configured, and that the checks pass
    And I am told to restart the desktop client

  @happy-path @mvp
  Scenario: An existing desktop configuration is merged, not replaced
    Given a project configured for DEP
    And a desktop configuration that already names another server
    When I run setup for that project with a home location and a desktop configuration file
    Then the desktop configuration still names the other server
    And it names the CLI as the "dep" server
    And the previous configuration is kept beside it

  @happy-path
  Scenario: Running setup again changes nothing
    Given a project configured for DEP
    And setup has already been run for that project
    When I run setup for that project with a home location and a desktop configuration file
    Then the desktop configuration names the CLI as the server for that project
    And the desktop configuration names exactly one "dep" server

  @happy-path
  Scenario: The outcome is available as data
    Given a project configured for DEP
    When I run setup for that project and request a machine-readable answer
    Then I receive each step by name with its outcome
    And I receive the paths that were written

  # ─────────────────────────────────────────────
  # Edge Cases & Errors
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: Setup without naming a project
    When I run setup without naming a project, from a place that is not a project
    Then the desktop client is not configured
    And I am told to name a project

  @edge-case
  Scenario: Only the desktop client, not the search path
    Given a project configured for DEP
    When I run setup for that project and decline changes to the search path
    Then the search path step reports that it was skipped

  @error @mvp
  Scenario: The home location cannot be written
    Given a project configured for DEP
    And a home location that cannot be written
    When I run setup for that project with that home location
    Then the install step fails and names the location
    And the verdict is that setup did not complete
