@flow-14 @human-author @lifecycle @mvp
Feature: FLOW-14 Re-verify documents in bulk
  """
  As a documentation author who has just reviewed a batch of documents,
  I want to record that they were verified today, one by one or by the whole batch,
  so that freshness reflects the review I actually did without editing each file by hand.
  """
  # Source: cli/src/commands/bump.ts

  @happy-path @mvp
  Scenario: Re-verify a single document
    Given "docs/reference/metadata-schema.md" was last verified months ago
    When I record that document as verified
    Then I am shown its verification date moving from the old date to now
    And it is reported as fresh from now on

  @happy-path
  Scenario: Re-verify the entire set
    Given a set of documents with mixed verification dates
    When I record the whole set as verified
    Then every document carrying DEP metadata is re-verified
    And I am told how many documents were updated

  @happy-path
  Scenario Outline: Re-verify only part of the set
    # Source: cli/src/commands/bump.ts
    Given a set whose documents vary in type, freshness, owner, confidence, audience and tags
    When I record as verified only the documents whose "<dimension>" is "<value>"
    Then only documents carrying that "<dimension>" are re-verified
    And the rest keep their previous verification date

    Examples:
      | dimension  | value      |
      | type       | reference  |
      | lifecycle  | STALE      |
      | owner      | @dep-core  |
      | confidence | low        |
      | audience   | ai-agent   |
      | tag        | cli        |

  @happy-path
  Scenario: Re-verify documents matching a path pattern
    Given the set holds documents under several directories
    When I record as verified the documents matching a path pattern
    Then only documents whose path matches the pattern are re-verified

  @happy-path
  Scenario: Preview a bulk re-verification
    When I preview re-verifying the whole set
    Then I am told no files were modified
    And I am shown, for each document, the date it would move from and to
    And I am told how many documents would be updated

  @edge-case
  Scenario: Every document gets the same verification moment
    # Source: cli/src/commands/bump.ts
    When I record several documents as verified in one request
    Then every one of them records the same verification moment

  @edge-case
  Scenario: Nothing matches the narrowing
    Given no document in the set is stale
    When I record as verified only the stale documents
    Then I am told no matching documents were found
    And nothing is modified

  @edge-case
  Scenario: Files that are not DEP documents are skipped, not failed
    Given the documentation root also holds a markdown file with no DEP metadata
    When I record the whole set as verified
    Then that file is reported as skipped for having no DEP metadata
    And every DEP document is still re-verified

  @validation
  Scenario: Name neither a document nor the whole set
    When I ask to record verification without naming a document or the whole set
    Then I am shown how to name a document, a pattern or the whole set
    And the request exits unsuccessfully

  @happy-path
  Scenario: Take the outcome as data
    When I record the whole set as verified in machine-readable form
    Then I receive each updated document with its old and new verification date, and the list of skipped files
