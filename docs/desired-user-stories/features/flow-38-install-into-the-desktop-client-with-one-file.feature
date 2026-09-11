@flow-38 @project-lead @install @should
Feature: FLOW-38 Install into the desktop client with one file
  """
  As a project lead who does not want a terminal,
  I want a bundle the desktop client installs by itself — the CLI inside, the project asked for on install,
  so that no terminal, script, runtime or configuration file is ever involved.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: cli/scripts/bundle.ts
  # Source: https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md

  @happy-path @should
  Scenario: A bundle is produced for a platform
    Given a built CLI for "windows-x64"
    When I build the desktop bundle for it
    Then I receive one bundle file for "windows-x64"
    And it holds a manifest and the CLI under the server directory

  @data-driven @should
  Scenario Outline: The manifest tells the desktop client what it needs
    Given a built CLI for "<platform>"
    When I build the desktop bundle for it
    Then the manifest declares a binary server whose command is the bundled CLI
    And the manifest asks the person for the project root when installing
    And the manifest names the platform "<desktop-platform>"
    And the manifest carries the CLI's version

    Examples:
      | platform     | desktop-platform |
      | windows-x64  | win32            |
      | darwin-arm64 | darwin           |
      | linux-x64    | linux            |

  @validation
  Scenario: Reject a platform with no built CLI
    When I build the desktop bundle for a platform that was not built
    Then the request is refused
    And I am told which platforms are built
