@flow-33 @ai-agent @install @mvp
Feature: FLOW-33 Keep the CLI up to date
  """
  As an AI agent whose skills depend on capabilities the CLI only recently gained,
  I want to learn which version is installed and bring it up to the latest release in one step,
  so that a skill never fails on a machine that installed the CLI before the capability existed.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: install.sh
  # Source: .github/workflows/release.yml

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @mvp
  Scenario: Find out which version is installed
    Given the CLI is installed
    When I ask for its version
    Then I am told a version number
    And it is the version the CLI was built from

  @happy-path @mvp
  Scenario: Upgrade to the latest release
    Given the CLI is installed
    And a newer release is published
    When I ask the CLI to upgrade itself
    Then I am told the installed version and the version being installed
    And the installed CLI is replaced with the newer release
    And asking the CLI for its version afterwards reports the newer version

  @happy-path
  Scenario: Check for a newer release without changing anything
    Given the CLI is installed
    And a newer release is published
    When I ask whether a newer release exists
    Then I am told the installed version, the latest version, and that an upgrade is available
    And the installed CLI is left as it was

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case @mvp
  Scenario: Already on the latest release
    Given the CLI is installed
    And the latest published release is the installed version
    When I ask the CLI to upgrade itself
    Then I am told it is already up to date
    And the installed CLI is left as it was

  @edge-case
  Scenario: Running from source rather than an installed binary
    Given the CLI is running from its source tree
    When I ask the CLI to upgrade itself
    Then the request is refused
    And I am told to update the source tree instead

  @edge-case @security @mvp
  Scenario: A downloaded release that does not run is never installed
    Given the CLI is installed
    And the newest published release is corrupt
    When I ask the CLI to upgrade itself
    Then I am told the downloaded release could not be verified
    And the installed CLI is left as it was

  # ─────────────────────────────────────────────
  # Errors
  # ─────────────────────────────────────────────

  @error @external-dependency
  Scenario: The release service cannot be reached
    Given the CLI is installed
    And the release service is unreachable
    When I ask the CLI to upgrade itself
    Then I am told the release service could not be reached
    And the installed CLI is left as it was

  @error @external-dependency
  Scenario: The download fails partway
    Given the CLI is installed
    And a newer release is published
    But its download fails
    When I ask the CLI to upgrade itself
    Then I am told the download failed
    And the installed CLI is left as it was

  @validation
  Scenario: Reject a release that was never published
    Given the CLI is installed
    When I ask the CLI to install a release that does not exist
    Then the request is refused
    And I am told that release is not published
