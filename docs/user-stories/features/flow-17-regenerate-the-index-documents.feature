@flow-17 @ai-generator @indexing @should
Feature: FLOW-17 Regenerate the index documents
  """
  As a documentation generator maintaining a set,
  I want index documents to be produced from the set's own metadata,
  so that readers always have an up-to-date way in and nobody maintains link lists by hand.
  """
  # Source: cli/src/commands/index-gen.ts
  # Spec: .docspec

  @happy-path @mvp
  Scenario: Produce one index per document type directory
    Given the project maps each document type to its own directory
    And each of those directories holds documents
    When I ask for the index documents to be regenerated
    Then an index is written into each of those directories
    And I am told which index documents were updated
    And each entry names its document, its freshness, its confidence and its audiences

  @happy-path @mvp
  Scenario: Produce the root index
    Given the project declares several audiences and holds documents of several types
    When I ask for the index documents to be regenerated
    Then a root index is written into the documentation root
    And it lists, for each audience, that audience's entry point and the documents meant for it
    And it lists the documents grouped by type

  @happy-path
  Scenario: Preview what would be written
    When I preview regenerating the index documents
    Then I am told which index documents would be written
    And nothing is written

  @happy-path
  Scenario: Take the generated indexes as data
    When I ask for the index documents in machine-readable form
    Then I receive each index document's path and its full content
    And nothing is written

  @edge-case
  Scenario: A type directory with no documents gets no index
    Given the project maps a document type to a directory that holds no documents
    When I ask for the index documents to be regenerated
    Then no index is written into that directory

  @edge-case
  Scenario: Index documents do not list themselves
    Given a directory that already holds an index document
    When I ask for the index documents to be regenerated
    Then that index does not list itself as an entry

  @edge-case
  Scenario: A regenerated index is recognisable as generated
    When I ask for the index documents to be regenerated
    Then each directory index is marked as automatically generated

  @edge-case
  Scenario: Regenerating twice produces the same result
    Given the index documents have just been regenerated and nothing else has changed
    When I ask for them to be regenerated again
    Then their content is unchanged apart from the moment of generation

  @edge-case
  Scenario: A generated index keeps the set reachable
    Given a document is listed only by a generated index
    When I ask for validation
    Then that document is not reported as unreachable

  @edge-case
  Scenario: Index documents are correct when I am not standing at the project root
    Given I am not standing at the project root
    When I ask for the index documents of that project to be regenerated
    Then every entry shows the document's real title
    And every link is relative to the index document that holds it

  @edge-case
  Scenario: Root index links are right whatever the documentation root is called
    Given the project keeps its documents in a documentation root that is not a top-level docs folder
    When I ask for the index documents to be regenerated
    Then a root index is written into the documentation root
    And every link is relative to the index document that holds it

  @edge-case
  Scenario: Regenerating keeps what the root index says about itself
    Given the root index names its owner, when it was created, its tags and a document it relates to
    When I ask for the index documents to be regenerated
    Then the root index still names that owner, that creation date, those tags and that relationship
    And it records that it was verified now

  @edge-case
  Scenario: A first root index belongs to the project's fallback owner
    Given the project names a fallback owner and has no root index yet
    When I ask for the index documents to be regenerated
    Then the root index names the fallback owner as its owner
    And it records that it was created now
