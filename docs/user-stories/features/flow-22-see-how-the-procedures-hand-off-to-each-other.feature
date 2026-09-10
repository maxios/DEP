@flow-22 @human-author @dap @could
Feature: FLOW-22 See how the procedures hand off to each other
  """
  As an author reviewing a project's procedures as a whole,
  I want to see every tree, its size and freshness, and which trees hand off to which,
  so that I can spot procedures that are unreachable, oversized or circular.
  """
  # Source: cli/src/dap/commands/graph.ts
  # Source: cli/src/dap/output.ts

  @happy-path @mvp
  Scenario: See every tree and its hand-offs
    Given a project with several trees, some of which delegate to others
    When I ask how the procedures relate
    Then each tree is shown with its freshness, how many nodes it holds and its confidence
    And each hand-off is shown beneath the tree that makes it, naming the tree it goes to
    And I am told how many trees, hand-offs and circles were found

  @edge-case
  Scenario: A tree that hands off to nobody
    Given a tree that delegates to no other tree
    When I ask how the procedures relate
    Then it is listed with no hand-offs beneath it

  @edge-case
  Scenario: Circular hand-offs are called out
    Given two trees that delegate to each other
    When I ask how the procedures relate
    Then the circle is listed as a chain of tree identifiers
    And the count of circles includes it

  @edge-case
  Scenario: A hand-off to a tree that does not exist
    Given a tree that delegates to a tree the project does not hold
    When I ask how the procedures relate
    Then the hand-off is still shown, naming the tree it points at

  @happy-path
  Scenario: Take the relationships as data
    When I ask how the procedures relate, in machine-readable form
    Then I receive each tree with its location, trigger, node count, freshness and confidence
    And I receive each hand-off as a pair of trees, plus any circles
