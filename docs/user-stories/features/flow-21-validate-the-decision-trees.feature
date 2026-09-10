@flow-21 @human-author @dap @mvp
Feature: FLOW-21 Validate the decision trees
  """
  As an author who owns a project's procedures,
  I want each tree checked for reachability, complete branching, and a defined ending on every route,
  so that an agent following a tree can never fall off the end of it.
  """
  # Source: cli/src/dap/commands/validate.ts

  @happy-path @mvp
  Scenario: A sound set of trees passes
    Given every tree declares complete metadata, a starting node that exists, and reaches an ending on every route
    And no two trees claim the same trigger and no tree delegates in a circle
    When I ask for the trees to be validated
    Then I am told how many trees were checked and how many passed, warned and failed
    And every tree is reported as passing
    And the request exits successfully

  @validation @mvp
  Scenario Outline: Reject a tree that an agent could not follow
    # Source: cli/src/dap/commands/validate.ts
    Given a tree that has "<defect>"
    When I ask for the trees to be validated
    Then that tree is reported as failing
    And I am told "<told>"
    And the request exits unsuccessfully

    Examples:
      | defect                                              | told                                        |
      | a starting node that is not among its nodes         | the starting node was not found in the tree |
      | a node no route from the start reaches              | which nodes are unreachable                 |
      | a route that ends without an ending or a delegation | which nodes are dead ends                   |
      | a branching node with no fallback condition         | which branching node has no fallback        |
      | missing metadata                                    | which metadata fields are missing           |
      | an invalid confidence                               | that the confidence is invalid              |

  @validation
  Scenario Outline: Reject a node that does not declare what its kind requires
    # Source: cli/src/dap/commands/validate.ts
    Given a node of kind "<kind>" that does not declare "<missing>"
    When I ask for the trees to be validated
    Then that tree is reported as failing
    And I am told which node is incomplete and what it is missing

    Examples:
      | kind     | missing                       |
      | observe  | how it gathers information    |
      | observe  | what it yields                |
      | decide   | its conditions                |
      | act      | what kind of action it takes  |
      | delegate | which tree it delegates to    |

  @edge-case
  Scenario: A revision loop is allowed, a true cycle is not
    # Source: cli/src/dap/commands/validate.ts
    Given a tree where a route returns to an earlier node through a branching node that also has a way out
    When I ask for the trees to be validated
    Then that tree is not reported as failing for being cyclic
    And I am told how many revision loops were found and that they are allowed

  @validation
  Scenario: Reject a true cycle with no way out
    Given a tree where a route returns to an earlier node with no branch leaving the loop
    When I ask for the trees to be validated
    Then that tree is reported as failing
    And I am shown the looping route
    And the request exits unsuccessfully

  @validation
  Scenario: Reject two trees that claim the same trigger
    # Source: cli/src/dap/commands/validate.ts
    Given two trees declare the same trigger
    When I ask for the trees to be validated
    Then the set-wide check on trigger uniqueness is reported as failing
    And I am told which trigger is claimed by which trees
    And the request exits unsuccessfully

  @validation
  Scenario: Reject trees that delegate to each other in a circle
    Given two trees each delegate to the other
    When I ask for the trees to be validated
    Then the set-wide check on delegation cycles is reported as failing
    And I am shown the circle
    And the request exits unsuccessfully

  @edge-case
  Scenario: A missing documentation reference warns rather than fails
    # Source: cli/src/dap/commands/validate.ts
    Given the project resolves documentation references from its trees
    And a node refers to a document that does not exist
    When I ask for the trees to be validated
    Then that tree is reported as warning rather than failing
    And I am told which reference could not be found and where it was looked for
    And the request exits successfully

  @edge-case @lifecycle
  Scenario: A tree past its review cadence warns rather than fails
    Given a tree last verified more than twice its review cadence ago
    When I ask for the trees to be validated
    Then it is reported as warning
    And I am told the tree exceeds its review cadence
    And the request exits successfully

  @happy-path
  Scenario: Take the verdict as data
    When I ask for the trees to be validated in machine-readable form
    Then I receive one entry per tree with its verdict and every individual check, plus the set-wide checks
