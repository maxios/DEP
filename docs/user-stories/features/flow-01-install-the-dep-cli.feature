@flow-01 @project-lead @install @mvp
Feature: FLOW-01 Install the DEP CLI
  """
  As a project lead evaluating DEP,
  I want to install the dep CLI with a single command,
  so that I can try DEP on my own project without setting up a runtime or build toolchain.
  """
  # Source: install.sh
  # Spec: README.md

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @mvp
  Scenario: Install the latest release on a supported machine
    # Source: install.sh
    Given I am on a supported platform
    And a release binary is published for that platform
    When I request an installation
    Then I am told which platform was detected and which release is being fetched
    And the CLI is placed at "$HOME/.dep/bin/dep" as an executable
    And I am told "DEP CLI installed to $HOME/.dep/bin/dep"

  @happy-path
  Scenario: Be told how to make the CLI reachable
    Given "$HOME/.dep/bin" is not part of my command search path
    When the installation completes
    Then I am told to prepend "$HOME/.dep/bin" to my command search path
    And I am told I can add that line to a shell profile such as "~/.zshrc" or "~/.bashrc"

  @happy-path
  Scenario: Install a pinned version instead of the latest
    Given I declare the version I want
    When I request an installation
    Then the release matching that version is fetched instead of the latest one
    And I am told which release is being fetched

  @edge-case
  Scenario: Reinstall over an existing installation
    Given a dep CLI is already installed at "$HOME/.dep/bin/dep"
    When I request an installation again
    Then the installed CLI is replaced with the freshly fetched one
    And it remains executable

  @edge-case
  Scenario: Installing when the search path is already set up
    Given "$HOME/.dep/bin" is already part of my command search path
    When the installation completes
    Then I am not given any search-path instructions

  # ─────────────────────────────────────────────
  # Validation & Errors
  # ─────────────────────────────────────────────

  @validation
  Scenario Outline: Refuse to install on an unsupported machine
    # Source: install.sh
    Given my machine reports "<platform_report>"
    When I request an installation
    Then I am told "<message>"
    And nothing is installed
    And the installation exits unsuccessfully

    Examples:
      | platform_report          | message                                       |
      | an operating system of Windows_NT | Error: Unsupported operating system: Windows_NT |
      | a processor of riscv64   | Error: Unsupported architecture: riscv64      |

  @error
  Scenario: No download tool is available
    Given neither curl nor wget is available on my machine
    When I request an installation
    Then I am told "Error: curl or wget is required"
    And nothing is installed
    And the installation exits unsuccessfully

  @error @external-dependency
  Scenario: The release cannot be fetched
    Given I am on a supported platform
    And the requested release cannot be downloaded
    When I request an installation
    Then the installation exits unsuccessfully
    And no partially written CLI is left behind as executable
