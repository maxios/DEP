@flow-20 @human-author @dap @should
Feature: FLOW-20 Visualise a decision tree
  """
  As an author reviewing a project's procedures,
  I want to see a whole decision tree at once, and the list of routes through it,
  so that I can judge whether the procedure is complete before an agent follows it.
  """
  # Source: cli/src/dap/commands/trace.ts
  # Source: cli/src/dap/output.ts

  @happy-path @mvp
  Scenario: See a tree from its starting node outwards
    Given the tree "validate-and-fix"
    When I ask to see that tree
    Then I am shown its nodes as a hierarchy starting from its starting node
    And each node is marked with its kind
    And each branch is labelled with the condition that leads down it
    And nodes that end the tree are shown at the ends of the branches

  @happy-path
  Scenario: Node details are shown inline
    # Source: cli/src/dap/output.ts
    Given a tree whose nodes gather information, delegate, and take action
    When I ask to see that tree
    Then a node that gathers information shows how it gathers it
    And a node that delegates shows which tree it delegates to
    And a node that acts shows what it acts with

  @happy-path
  Scenario: See every route through the tree
    When I ask to see a tree in machine-readable form
    Then I receive the tree's starting node, how many nodes it holds, and every route from the start to an end

  @edge-case
  Scenario: A route that loops back is marked rather than followed forever
    # Source: cli/src/dap/output.ts
    Given a tree where a revision branch returns to an earlier node
    When I ask to see that tree
    Then the returning branch is marked as a loop back to that node
    And the drawing terminates

  @edge-case
  Scenario: A branch pointing at a node that does not exist is marked
    Given a tree where a branch points at a node the tree does not hold
    When I ask to see that tree
    Then that branch is shown as missing

  @edge-case
  Scenario: The starting node does not exist
    Given a tree whose declared starting node is not among its nodes
    When I ask to see that tree
    Then I am told the starting node was not found, naming it

  @validation
  Scenario: Ask to see a tree that does not exist
    When I ask to see the tree "make-coffee"
    Then I am told that tree was not found
    And I am told which trees do exist
    And the request exits unsuccessfully
