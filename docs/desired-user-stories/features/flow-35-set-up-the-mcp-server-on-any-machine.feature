@flow-35 @project-lead @install @mvp
Feature: FLOW-35 Set up the MCP server on any machine
  """
  As a project lead adding DEP to a desktop assistant,
  I want one launcher that puts the CLI in a known place on macOS, Linux or Windows, keeps it current, and starts the server,
  so that every machine on the team gets the same setup from one line of configuration.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: packages/dep-mcp/index.mjs
  # Source: install.sh

  @data-driven @mvp
  Scenario Outline: The CLI lives in the same place on every operating system
    Given the launcher runs on "<os>"
    When I ask the launcher where it keeps the CLI
    Then it names "<location>"

    Examples:
      | os      | location           |
      | darwin  | ~/.dep/bin/dep     |
      | linux   | ~/.dep/bin/dep     |
      | windows | ~/.dep/bin/dep.exe |

  @happy-path @mvp
  Scenario: First run on a machine without the CLI
    Given no CLI is installed on this machine
    And a release is published
    When the launcher starts
    Then the CLI is placed at the launcher's location and is executable
    And I am told which version was installed
    And the server answers a session

  @happy-path @mvp
  Scenario: Later runs reuse the installed CLI
    Given the CLI is installed at the launcher's location
    And the launcher checked for releases earlier today
    When the launcher starts
    Then the release service is not asked
    And the server answers a session

  @happy-path
  Scenario: A newer release is installed before the server starts
    Given the CLI is installed at the launcher's location
    And a newer release is published
    When the launcher starts
    Then the CLI is replaced with the newer release
    And the previous CLI is kept beside it
    And the server answers a session

  @edge-case
  Scenario: The location can be moved
    Given the home location is declared as a different directory
    When I ask the launcher where it keeps the CLI
    Then it names a path inside that directory

  @edge-case
  Scenario: Upgrades can be turned off
    Given the CLI is installed at the launcher's location
    And a newer release is published
    And upgrades are declared off
    When the launcher starts
    Then the release service is not asked
    And the installed CLI is left as it was

  @error @external-dependency
  Scenario: The release service is unreachable but the CLI is installed
    Given the CLI is installed at the launcher's location
    And the release service is unreachable
    When the launcher starts
    Then I am warned the release service could not be reached
    And the server answers a session

  @error @external-dependency
  Scenario: The release service is unreachable and no CLI is installed
    Given no CLI is installed on this machine
    And the release service is unreachable
    When the launcher starts
    Then the launcher stops with a message naming the release service
    And nothing is placed at the launcher's location

  @security @mvp
  Scenario: A download that does not run is never installed
    Given no CLI is installed on this machine
    And the newest published release is corrupt
    When the launcher starts
    Then the launcher stops with a message saying the download could not be verified
    And nothing is placed at the launcher's location
