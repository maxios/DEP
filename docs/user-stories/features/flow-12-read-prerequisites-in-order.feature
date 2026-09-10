@flow-12 @human-author @navigation @should
Feature: FLOW-12 Read prerequisites in order
  """
  As a reader facing an advanced document,
  I want the chain of documents I should read first, in order,
  so that I am not blocked by concepts the document assumes I already know.
  """
  # Source: cli/src/commands/prereqs.ts

  @happy-path @mvp
  Scenario: Get the reading order for a document with a prerequisite chain
    Given a document requires another document, which itself requires a third
    When I ask for the prerequisites of the first
    Then I am shown the prerequisites numbered in the order I should read them
    And the deepest prerequisite comes first
    And I am told to read the document I asked about last

  @edge-case
  Scenario: A document with no prerequisites
    Given a document declares no prerequisites
    When I ask for its prerequisites
    Then I am told it has no prerequisites

  @edge-case
  Scenario: A prerequisite shared by two branches is read once
    Given two prerequisites of a document both require the same third document
    When I ask for the prerequisites
    Then that third document appears once in the reading order
    And it comes before both documents that require it

  @edge-case
  Scenario: Only prerequisite relationships are followed
    Given a document teaches one document and requires another
    When I ask for its prerequisites
    Then only the required document is part of the chain

  @edge-case
  Scenario: A circular prerequisite chain is reported rather than followed forever
    # Source: cli/src/commands/prereqs.ts
    Given two documents require each other
    When I ask for the prerequisites of one of them
    Then I am still given a reading order
    And I am warned that a circular prerequisite dependency was detected in the chain

  @edge-case
  Scenario: A prerequisite outside the set is skipped
    Given a document requires a path that is not part of the set
    When I ask for its prerequisites
    Then that path is not part of the reading order

  @error
  Scenario: The document is not part of the set
    Given "docs/nope.md" is not part of the documentation set
    When I ask for its prerequisites
    Then I am told the document was not found in the graph, naming it
    And the request exits unsuccessfully

  @happy-path
  Scenario: Take the chain as data
    When I ask for a document's prerequisites in machine-readable form
    Then I receive the document I asked about, the chain in reading order with each title, and whether a circular dependency was found
