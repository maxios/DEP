@flow-30 @developer @indexing @should
Feature: FLOW-30 Keep retrieval current as the documents change
  """
  As a developer whose documentation changes every day,
  I want the retrievable knowledge to follow the documents without a full rebuild,
  so that what my assistant retrieves is what the set actually says right now.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#pipeline
  # Source: cli/src/commands/vectorize.ts

  Background:
    Given a project whose documents have already been indexed for retrieval

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @should
  Scenario: Only what changed is processed again
    Given I have edited three documents out of two hundred
    When I bring the index up to date
    Then I am told three documents were processed again
    And I am told the rest were reused unchanged

  @happy-path @should
  Scenario: A change is retrievable straight away
    Given I have added a paragraph answering a question the set could not answer before
    When I bring the index up to date
    And I ask for context for that question
    Then the new paragraph is present in the bundle

  @happy-path
  Scenario: Bringing the index up to date after each commit
    Given the project brings its index up to date whenever a commit lands
    When a commit changes two documents
    Then the index is brought up to date without my asking
    And I am told which documents were processed again

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: A deleted document stops being retrievable
    Given I have deleted a document
    When I bring the index up to date
    And I ask a question that document used to answer
    Then none of its passages are present in the bundle

  @edge-case
  Scenario: A moved document keeps its knowledge and loses its old address
    Given I have moved a document to a different part of the set
    When I bring the index up to date
    And I ask a question that document answers
    Then its passages are present and name its new location
    And no passage names its previous location

  @edge-case
  Scenario: The retrieval method has changed since the index was built
    Given the index was built with a different retrieval method than the one now configured
    When I bring the index up to date
    Then I am told the index cannot be mixed with a different retrieval method
    And I am told to rebuild it in full
    And the existing index is left as it was

  @validation
  Scenario: Reject an update confined to a document outside the set
    When I confine the update to a document that is not part of the documentation set
    Then the request is refused
    And I am told the document is outside the set
    And the existing index is left as it was

  @error
  Scenario: Bringing the index up to date is interrupted
    Given I interrupt the update partway through
    When I ask for context afterwards
    Then I still receive a bundle from the knowledge indexed before the interruption
    And I am told the index is incomplete
    And running the update again resumes from where it stopped

  @error
  Scenario: A document that cannot be read
    Given one document in the set cannot be read
    When I bring the index up to date
    Then the remaining documents are still processed
    And I am told which document could not be read

  @scheduled @clock @could
  Scenario: Freshness moves on without anyone editing anything
    Given a document has passed its review cadence overnight
    When I ask for context the next day
    Then it is treated as past its review date
    And no re-indexing was needed for that to happen
