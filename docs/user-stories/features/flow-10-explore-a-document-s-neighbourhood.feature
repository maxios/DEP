@flow-10 @ai-agent @graph @should
Feature: FLOW-10 Explore a document's neighbourhood
  """
  As an AI agent that has found one relevant document,
  I want to walk outwards from it a controlled number of hops along the relationships I care about,
  so that I load its surrounding context without loading the entire documentation set.
  """
  # Source: cli/src/commands/neighbors.ts

  @happy-path @mvp
  Scenario: Walk two hops in both directions by default
    Given "seed.md" points at documents which point at further documents
    When I ask for the neighbourhood of "seed.md"
    Then the neighbours are grouped by how many hops away they are
    And each neighbour is shown with its relationship and whether it points at my document or is pointed at
    And neighbours reached through another document name the document they came through
    And I am told how many documents are reachable within that many hops

  @happy-path
  Scenario Outline: Control how far the walk goes
    Given a chain of documents each pointing at the next
    When I ask for the neighbourhood of the first within "<hops>" hops
    Then only documents up to "<hops>" hops away are returned

    Examples:
      | hops |
      | 1    |
      | 2    |
      | 3    |

  @happy-path
  Scenario Outline: Control which direction the walk goes
    # Source: cli/src/commands/neighbors.ts
    Given a document that both points at documents and is pointed at by documents
    When I ask for its neighbourhood in the "<direction>" direction
    Then only "<included>" are returned

    Examples:
      | direction | included                       |
      | out       | the documents it points at      |
      | in        | the documents that point at it  |
      | both      | documents in either direction   |

  @happy-path
  Scenario: Follow only the relationships I care about
    Given a document with prerequisite, teaching and prose relationships
    When I ask for its neighbourhood following only prerequisite relationships
    Then every neighbour is reached through a prerequisite relationship

  @edge-case
  Scenario: Each neighbour is reported once, at the nearest hop it was found
    # Source: cli/src/commands/neighbors.ts
    Given a document reachable both directly and through a longer route
    When I ask for the neighbourhood
    Then that document appears once
    And it is not reported again at a further hop

  @edge-case
  Scenario: An isolated document has no neighbourhood
    Given a document with no relationships in either direction
    When I ask for its neighbourhood
    Then I am told no neighbours were found for it within the requested hops

  @edge-case
  Scenario: A relationship pointing outside the set is not walked
    Given a document declares a relationship to a path that is not part of the set
    When I ask for its neighbourhood
    Then that target is not reported as a neighbour

  @error
  Scenario: The starting document is not part of the set
    Given "docs/nope.md" is not part of the documentation set
    When I ask for its neighbourhood
    Then I am told the document was not found in the graph, naming it
    And the request exits unsuccessfully
