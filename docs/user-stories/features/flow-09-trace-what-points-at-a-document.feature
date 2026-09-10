@flow-09 @human-author @graph @mvp
Feature: FLOW-09 Trace what points at a document
  """
  As a documentation author about to change or retire a document,
  I want to see every document that points at it and how,
  so that I can judge the impact of my change before making it.
  """
  # Source: cli/src/commands/backlinks.ts
  # Source: cli/src/output.ts

  @happy-path @mvp
  Scenario: See who points at a document, grouped by relationship
    Given several documents point at "docs/reference/metadata-schema.md" with different relationships
    When I ask what points at that document
    Then the sources are grouped under the relationship they use
    And every source document is named

  @edge-case
  Scenario: Nothing points at the document
    Given no document points at "docs/reference/metadata-schema.md"
    When I ask what points at that document
    Then I am told no incoming links were found for it

  @edge-case
  Scenario: A prose link counts as an incoming link
    # Source: cli/src/parser.ts
    Given another document links to "docs/reference/metadata-schema.md" in its prose only
    When I ask what points at that document
    Then that document is listed under the untyped relationship

  @edge-case
  Scenario: The document can be named from anywhere
    Given I am not standing at the project root
    When I ask what points at a document using a path relative to the project root
    Then the answer is about that document

  @error
  Scenario: The document is not part of the set
    # Source: cli/src/commands/backlinks.ts
    Given "docs/reference/nope.md" is not part of the documentation set
    When I ask what points at it
    Then I am told the document was not found in the graph, naming it
    And the request exits unsuccessfully

  @happy-path
  Scenario: Take the incoming links as data
    When I ask what points at a document in machine-readable form
    Then I receive the document's path and each incoming link with its source and relationship
