@flow-16 @human-author @graph @mvp
Feature: FLOW-16 Declare how documents relate
  """
  As a documentation author connecting a new document to the set,
  I want to declare, retype and remove typed relationships between documents,
  so that the graph stays navigable and only the six canonical relationships are used.
  """
  # Source: cli/src/commands/link.ts
  # Spec: seed.md

  @happy-path @mvp
  Scenario: Declare a relationship to another document
    Given "docs/reference/metadata-schema.md" declares no relationships
    When I declare that it teaches "docs/reference/types.md"
    Then I am shown the relationship as added, with its target and relationship name
    And I am told how many relationships the document now declares
    And the document declares that relationship

  @happy-path
  Scenario Outline: Use any canonical relationship
    # Source: cli/src/writer.ts
    When I declare a relationship of "<rel>" to another document
    Then the relationship is recorded as "<rel>"

    Examples:
      | rel      |
      | TEACHES  |
      | USES     |
      | EXPLAINS |
      | DECIDES  |
      | REQUIRES |
      | NEXT     |

  @happy-path
  Scenario: Retype an existing relationship
    # Source: cli/src/commands/link.ts
    Given a document declares that it teaches another document
    When I declare that it requires that same document
    Then I am shown the relationship as updated
    And the document declares one relationship to that target, of the new kind

  @happy-path
  Scenario: Remove a relationship
    Given a document declares a relationship to another document
    When I remove the relationship to that document
    Then I am shown the relationship as removed
    And I am told how many relationships remain
    And the document no longer declares it

  @happy-path
  Scenario: Accept a relationship the project defines for itself
    Given the project declares its own relationship name
    When I declare a relationship using that name
    Then the relationship is recorded

  @validation
  Scenario: Refuse a relationship name that is not allowed
    # Source: cli/src/writer.ts
    When I declare a relationship of "MENTIONS" to another document
    Then I am told the relationship is invalid and which relationships are allowed
    And the document is left unchanged
    And the request exits unsuccessfully

  @validation
  Scenario: Declare a relationship without saying what kind
    When I declare a relationship to a target without naming its kind
    Then I am told the kind is required and which kinds are valid
    And the request exits unsuccessfully

  @validation
  Scenario: Declare a relationship without a target
    When I ask to change a document's relationships without naming a target
    Then I am shown how to name a target and a kind, with an example
    And the request exits unsuccessfully

  @edge-case
  Scenario: Declare a relationship that already exists exactly
    # Source: cli/src/commands/link.ts
    Given a document already declares that it teaches another document
    When I declare that same relationship again
    Then I am told the relationship already exists
    And the request exits unsuccessfully

  @edge-case
  Scenario: Remove a relationship that was never declared
    Given a document declares no relationship to "docs/reference/types.md"
    When I remove the relationship to that document
    Then I am told no such relationship was found, naming the document and the target
    And the request exits unsuccessfully

  @edge-case
  Scenario: A declared relationship shows up in the graph immediately
    Given I declare that one document requires another
    When I ask what points at the target document
    Then the source document is listed under the prerequisite relationship

  @error
  Scenario: The file is not a DEP document
    Given a markdown file with no DEP metadata
    When I declare a relationship on it
    Then I am told it carries no DEP metadata, naming the file
    And the request exits unsuccessfully

  @happy-path
  Scenario: Take the outcome as data
    When I declare a relationship in machine-readable form
    Then I receive the document path, whether the relationship was added, updated or removed, and the document's resulting relationships
