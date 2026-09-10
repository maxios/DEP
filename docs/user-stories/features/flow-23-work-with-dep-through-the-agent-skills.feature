@flow-23 @ai-agent @plugin @should
Feature: FLOW-23 Work with DEP through the agent skills
  """
  As an AI agent installed in a project as the DEP plugin,
  I want validation, generation, auditing and syncing offered as named capabilities that run the project's own procedures,
  so that a user gets the project's documented behaviour without describing the protocol to me first.
  """
  # Source: .claude-plugin/plugin.json
  # Source: skills/dep-validate/SKILL.md
  # Spec: CLAUDE.md

  @happy-path @mvp
  Scenario Outline: Each offered capability runs the procedure that covers it
    # Source: skills/dep-validate/SKILL.md
    Given the DEP plugin is installed in the project
    When the user asks for "<capability>"
    Then the procedure "<tree>" is resolved for that request
    And I follow that procedure one node at a time rather than improvising

    Examples:
      | capability            | tree                 |
      | dep-validate          | validate-and-fix     |
      | dep-generate          | generate-doc-set     |
      | dep-audit             | audit-existing-docs  |
      | dep-sync              | sync-stale-docs      |

  @happy-path
  Scenario: Install the plugin from the marketplace
    Given the project publishes a plugin marketplace
    When the user adds that marketplace and installs the DEP plugin
    Then the four DEP capabilities become available to them

  @happy-path
  Scenario: Make the toolchain available before doing any work
    # Source: skills/dep-validate/SKILL.md
    Given the dep CLI is not reachable in the environment
    When the user asks for a DEP capability
    Then the CLI is installed and made reachable before any documentation work begins

  @happy-path
  Scenario: Record DEP as active in the project on first use
    # Source: skills/dep-validate/SKILL.md
    Given the project's agent instructions do not yet record DEP as active
    When the user asks for a DEP capability for the first time
    Then the project's agent instructions are extended to record DEP and DAP as active
    And later sessions in that project use DEP without being asked to

  @edge-case
  Scenario: Already-active projects are not re-bootstrapped
    Given the project's agent instructions already record DEP as active
    When the user asks for a DEP capability
    Then the instructions are left unchanged

  @happy-path @security
  Scenario: A capability stops for a human decision when its procedure says to
    Given a procedure reaches a node that needs a human decision
    When I am following that procedure on the user's behalf
    Then I put the question and its choices to the user
    And I wait for their answer before continuing

  @happy-path
  Scenario: Report findings without changing documents unless asked
    # Source: skills/dep-validate/SKILL.md
    Given the user asked for validation and nothing more
    When the procedure surfaces failures and warnings
    Then I report them, separating structural failures from best-practice warnings
    And I do not modify any document

  @happy-path
  Scenario: Judgements no tool can make are reported alongside the tool's verdict
    # Source: skills/dep-validate/SKILL.md
    Given a document whose declared type does not match how its body is written
    When the user asks for validation
    Then the mismatch is reported as a type-purity finding
    And it is reported alongside the checks the toolchain performed

  @edge-case
  Scenario: A project that is not configured for DEP
    Given the project holds no DEP configuration
    When the user asks for validation
    Then I report that audience and freshness checks cannot run without it

  @edge-case
  Scenario: Metadata is never edited by hand
    # Source: skills/dep-validate/SKILL.md
    Given a document's metadata has to change to satisfy a procedure
    When I apply that change
    Then it is applied through the toolchain's metadata capabilities rather than by editing the document's frontmatter
