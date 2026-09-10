@flow-15 @human-author @metadata @should
Feature: FLOW-15 Curate a document's tags
  """
  As a documentation author organising a growing set,
  I want to add and remove tags on a document in one request,
  so that the set stays searchable by subject without me editing metadata by hand.
  """
  # Source: cli/src/commands/tag.ts

  @happy-path @mvp
  Scenario: Add a tag
    Given a document tagged "metadata"
    When I add the tag "cli" to it
    Then I am shown "cli" as added
    And I am shown the document's full tag list afterwards
    And the document is tagged "metadata" and "cli"

  @happy-path
  Scenario: Add and remove tags in the same request
    Given a document tagged "draft" and "metadata"
    When I add "cli" and remove "draft"
    Then I am shown "cli" as added and "draft" as removed
    And the document is tagged "metadata" and "cli"

  @happy-path
  Scenario: Add several tags at once
    When I add the tags "cli" and "tools" in one request
    Then both are shown as added
    And both are recorded on the document

  @edge-case
  Scenario: Adding a tag the document already carries
    # Source: cli/src/commands/tag.ts
    Given a document already tagged "cli"
    When I add the tag "cli"
    Then I am warned that the tag is already present
    And the document's tags are unchanged

  @edge-case
  Scenario: Removing a tag the document does not carry
    Given a document that is not tagged "draft"
    When I remove the tag "draft"
    Then I am warned that the tag was not found
    And the document's tags are unchanged

  @edge-case
  Scenario: Tagging a document that carries no tags yet
    Given a document that declares no tags
    When I add the tag "cli"
    Then the document is tagged "cli"

  @edge-case
  Scenario: Tag order reflects the order tags were added
    Given a document tagged "metadata"
    When I add "cli" and then "tools" in one request
    Then the document's tags are listed as "metadata", "cli", "tools"

  @validation
  Scenario: Ask to curate tags without saying what to change
    When I ask to curate a document's tags without naming a tag to add or remove
    Then I am shown how to name tags to add or remove, with an example
    And the request exits unsuccessfully

  @error
  Scenario: The file is not a DEP document
    Given a markdown file with no DEP metadata
    When I add a tag to it
    Then I am told it carries no DEP metadata, naming the file
    And the request exits unsuccessfully

  @happy-path
  Scenario: Take the outcome as data
    When I curate a document's tags in machine-readable form
    Then I receive the document path, its resulting tags, what was added, what was removed and any warnings
