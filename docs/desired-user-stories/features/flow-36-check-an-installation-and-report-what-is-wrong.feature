@flow-36 @project-lead @install @mvp
Feature: FLOW-36 Check an installation and report what is wrong
  """
  As a project lead — or the agent installing on their behalf — on a machine that just received the CLI,
  I want the CLI to prove it works end to end and hand me a report I can file when it does not,
  so that a broken installation is diagnosed in one step instead of discovered in the middle of a task.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: prompts/install-dep.md
  # Source: install.sh

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @mvp
  Scenario: A healthy installation passes every check
    Given the CLI is installed and can write to its home location
    When I ask the CLI to check itself
    Then every check passes
    And I am told the version and the platform it was built for
    And the verdict is that the installation works

  @happy-path @mvp
  Scenario: The checks are available as data
    Given the CLI is installed and can write to its home location
    When I ask the CLI to check itself and request a machine-readable answer
    Then I receive each check by name with its outcome and a detail
    And I receive the version, the platform and a report ready to file

  @happy-path
  Scenario: The report is ready to file
    Given the CLI is installed and can write to its home location
    When I ask the CLI where to file its report
    Then I am given a link that opens a new issue on the project's repository
    And the link carries the report

  @data-driven @mvp
  Scenario Outline: What a check covers
    Given the CLI is installed and can write to its home location
    When I ask the CLI to check itself and request a machine-readable answer
    Then the check "<check>" passes

    Examples:
      | check    |
      | version  |
      | home     |
      | validate |
      | index    |
      | context  |
      | mcp      |

  # ─────────────────────────────────────────────
  # Errors & Security
  # ─────────────────────────────────────────────

  @error @mvp
  Scenario: The home location cannot be written
    Given the CLI is installed but its home location cannot be written
    When I ask the CLI to check itself
    Then the check "home" fails
    And the verdict is that the installation does not work
    And the report names the home location

  @security @mvp
  Scenario: Secrets never enter the report
    Given the CLI is installed and can write to its home location
    And a credential is present in the environment
    When I ask the CLI to check itself and request a machine-readable answer
    Then the report does not contain the credential
    And the report shows the home location relative to the user's home, not the full path

  @edge-case @later
  Scenario: The full check also exercises the local embedding model
    Given the CLI is installed and can write to its home location
    When I ask the CLI to check itself in full
    Then the check "local-embeddings" passes
    And I am told how long the model took to load
