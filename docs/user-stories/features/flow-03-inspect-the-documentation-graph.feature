@flow-03 @human-author @graph @mvp
Feature: FLOW-03 Inspect the documentation graph
  """
  As a documentation author inheriting a documentation set,
  I want to see every document, its freshness and how the documents point at each other,
  so that I can understand the shape of the set before changing anything.
  """
  # Source: cli/src/commands/graph.ts
  # Source: cli/src/graph.ts
  # Source: cli/src/output.ts

  @happy-path @mvp
  Scenario: See the whole set grouped by document type
    # Source: cli/src/output.ts
    Given a project with documents of several types
    When I ask for the documentation graph
    Then the documents are grouped under their type
    And each document is shown with its freshness state and its declared confidence
    And each typed relationship is shown as its relationship name and its target
    And I am told how many documents, relationships, unreachable documents and dependency cycles were found

  @happy-path
  Scenario: Take the graph as data
    Given a project with documents and relationships
    When I ask for the graph in machine-readable form
    Then I receive every document with its type, audiences, confidence, freshness, outgoing links and incoming links
    And I receive the relationship list, the unreachable documents, the cycles, and the same counts

  @happy-path
  Scenario Outline: Take the graph as a drawing
    # Source: cli/src/output.ts
    Given a project with typed relationships between documents
    When I ask for the graph as "<form>"
    Then I receive a "<form>" description of the graph
    And documents are coloured by type
    And untyped relationships picked up from prose links are left out

    Examples:
      | form    |
      | dot     |
      | mermaid |

  @edge-case
  Scenario: A document outside the documentation root still counts
    # Source: cli/src/graph.ts
    Given the project has a seed document at its root
    When I ask for the documentation graph
    Then the seed document appears in the graph

  @edge-case
  Scenario: Files without DEP metadata are left out
    # Source: cli/src/parser.ts
    Given the documentation root also holds markdown files with no DEP metadata
    When I ask for the documentation graph
    Then those files do not appear in the graph
    And they are not counted in the totals

  @edge-case
  Scenario: A prose link that duplicates a typed relationship is not counted twice
    # Source: cli/src/graph.ts
    Given a document declares a typed relationship to another document
    And its prose also links to that same document
    When I ask for the documentation graph
    Then only the typed relationship is reported between those two documents

  @edge-case
  Scenario: Documents nobody can reach are called out
    # Source: cli/src/graph.ts
    Given a document that no audience entry point, index or other document leads to
    When I ask for the documentation graph
    Then that document is listed as unreachable
    And the unreachable count includes it

  @edge-case
  Scenario: A dependency cycle is called out
    Given two documents each declare the other as a prerequisite
    When I ask for the documentation graph
    Then the cycle is listed as a chain of document paths
    And the cycle count includes it

  @edge-case
  Scenario: An empty documentation set
    Given a project whose documentation root holds no documents with DEP metadata
    When I ask for the documentation graph
    Then I am told the set holds no documents, relationships, unreachable documents or cycles
