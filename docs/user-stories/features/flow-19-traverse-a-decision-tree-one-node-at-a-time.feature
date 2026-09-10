@flow-19 @ai-agent @dap @mvp
Feature: FLOW-19 Traverse a decision tree one node at a time
  """
  As an AI agent following a project's procedure,
  I want to be handed one decision node at a time with only what that node needs,
  so that I act on the project's actual logic without loading the whole procedure into context.
  """
  # Source: cli/src/dap/commands/node.ts
  # Source: cli/src/dap/output.ts
  # Spec: dap/trees/validate-and-fix.md

  @happy-path @mvp
  Scenario: Load the starting node of a tree
    Given the tree "validate-and-fix" starts at the node "run-validation"
    When I ask for that node of that tree
    Then I am given only that node
    And I am shown what kind of node it is
    And I am shown what it asks me to do and what it expects to learn
    And I am told which node to load next

  @happy-path
  Scenario Outline: Each kind of node tells me what it needs
    # Source: cli/src/dap/output.ts
    When I ask for a node of kind "<kind>"
    Then it is marked with "<mark>"
    And I am shown "<what_i_am_given>"

    Examples:
      | kind     | mark | what_i_am_given                                                     |
      | observe  | [?]  | how to gather the information, what to gather it with, and what it yields |
      | decide   | [>]  | each condition and the node to go to when it holds                  |
      | act      | [!]  | what kind of action to take, its details, and whether the tree ends here |
      | delegate | [@]  | which tree takes over, what context travels with it, and where control returns |

  @happy-path
  Scenario: A branching node always offers a fallback
    # Source: dap/trees/validate-and-fix.md
    Given a branching node in a tree
    When I ask for that node
    Then its last condition is the fallback that holds when no other condition does

  @happy-path @security
  Scenario: A node that needs a human decision stops the traversal
    # Source: dap/trees/validate-and-fix.md
    Given a node that gathers its information from a human
    When I ask for that node
    Then I am given the question to put to the human and the choices they may pick from
    And I am told what the answer will be called and which node to load next
    And I do not continue past that node until the human has answered

  @happy-path
  Scenario: Follow a whole procedure to its end
    Given I have loaded the starting node of "validate-and-fix"
    When I keep loading the node each answered node points me to
    Then I eventually reach a node that ends the tree
    And every node I acted on was one the previous node pointed me to

  @edge-case
  Scenario: A delegating node hands over to another tree
    Given a node that delegates to another tree
    When I ask for that node
    Then I am told which tree takes over
    And I am told whether control returns to this tree and where

  @validation
  Scenario: Ask for a tree that does not exist
    # Source: cli/src/dap/commands/node.ts
    When I ask for a node of the tree "make-coffee"
    Then I am told that tree was not found
    And I am told which trees do exist
    And the request exits unsuccessfully

  @validation
  Scenario: Ask for a node the tree does not hold
    When I ask for the node "brew" of the tree "validate-and-fix"
    Then I am told that node was not found in that tree, naming both
    And I am told which nodes that tree does hold
    And the request exits unsuccessfully

  @happy-path
  Scenario: Take a node as data
    When I ask for a node in machine-readable form
    Then I receive the tree it belongs to and the node with its identifier, kind, description and every field it declares
