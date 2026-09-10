@flow-08 @ai-agent @search @should
Feature: FLOW-08 Search by meaning
  """
  As an AI agent answering a question phrased in my own words,
  I want to find the documents that are about that question rather than the ones repeating my wording,
  so that I still find the right document when the set uses different vocabulary than the question.
  """
  # Source: cli/src/commands/search.ts

  @happy-path @mvp
  Scenario: Find documents about a subject phrased differently
    # Source: cli/src/commands/search.ts
    Given the set has been indexed for meaning
    And a document explains staleness without ever using the word "outdated"
    When I search by meaning for "how do I know a document is outdated"
    Then that document is among the matches
    And each match is shown with its similarity and the passage that matched

  @happy-path
  Scenario: Long matched passages are shortened
    Given the set has been indexed for meaning
    When I search by meaning for any subject
    Then each matched passage I am shown is shortened to a readable excerpt and marked as continuing

  @edge-case
  Scenario: The number of matches is capped
    # Source: cli/src/commands/search.ts
    Given the set has been indexed for meaning
    And more than ten documents are related to my question
    When I search by meaning
    Then at most ten matches are returned
    And they are ordered with the most similar first

  @happy-path
  Scenario: Combine meaning with wording
    # Source: cli/src/commands/search.ts
    Given the set has been indexed for meaning
    When I search for "lifecycle" by both meaning and wording
    Then documents that are about the subject and documents that use the word are both eligible
    And each match's placement reflects mostly its similarity and partly its wording
    And at most ten matches are returned

  @happy-path
  Scenario: Narrow a meaning-based search to a type or audience
    Given the set has been indexed for meaning
    When I search by meaning among documents of type "explanation"
    Then every match is an explanation

  @edge-case @wip @later
  Scenario: Narrowing does not surface further matches
    # Note: narrowing is applied after the closest passages are retrieved, so a document that would
    #       match the filter can fall outside the retrieved set. See Open questions.
    Given the set has been indexed for meaning
    And only one explanation is related to my question, ranked below the twenty closest passages
    When I search by meaning among documents of type "explanation"
    Then I am told there are no results

  @error
  Scenario: The set has not been indexed for meaning yet
    # Source: cli/src/commands/search.ts
    Given the project has no semantic index
    When I search by meaning
    Then I am told no index was found and that indexing must run first
    And the request exits unsuccessfully

  @edge-case
  Scenario: The index has fallen behind the set
    Given the set has been indexed for meaning
    And a document has been edited since it was indexed
    When I search by meaning
    Then the passages I am shown are the ones captured at indexing time
