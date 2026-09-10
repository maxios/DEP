@flow-05 @ai-agent @metadata @mvp
Feature: FLOW-05 Query documents by metadata
  """
  As an AI agent asked to work on part of a documentation set,
  I want to narrow the set down by type, audience, tag, confidence, freshness or owner,
  so that I load only the documents that matter to the task instead of the whole set.
  """
  # Source: cli/src/commands/query.ts

  @happy-path @mvp
  Scenario: Narrow the set to one document type
    Given a project with tutorials, references and explanations
    When I ask for the documents of type "reference"
    Then I am told how many documents matched
    And each match is shown with its type, audiences, freshness and confidence
    And no document of another type is included

  @data-driven
  Scenario Outline: Narrow the set on any single dimension
    # Source: cli/src/commands/query.ts
    Given a project whose documents vary in type, audience, tag, confidence, freshness and owner
    When I ask for the documents whose "<dimension>" is "<value>"
    Then every match carries that "<dimension>"
    And nothing else is included

    Examples:
      | dimension  | value        |
      | type       | how-to       |
      | audience   | ai-agent     |
      | tag        | metadata     |
      | confidence | high         |
      | lifecycle  | STALE        |
      | owner      | @dep-core    |

  @happy-path
  Scenario: Combine narrowing dimensions
    Given a project with references owned by two different owners
    When I ask for the references owned by "@dep-core"
    Then every match is a reference owned by "@dep-core"
    And a reference owned by anyone else is excluded

  @edge-case
  Scenario: Freshness is matched regardless of how I capitalise it
    # Source: cli/src/commands/query.ts
    Given the set holds stale documents
    When I ask for the documents whose freshness is "stale"
    Then the stale documents are returned

  @edge-case
  Scenario: Nothing matches
    Given no document carries the tag "billing"
    When I ask for the documents tagged "billing"
    Then I am told "No documents match the query."

  @edge-case
  Scenario: No narrowing at all
    Given a project with documents
    When I ask for documents without narrowing anything
    Then every document in the set is returned

  @happy-path
  Scenario: Take the matches as data
    When I ask for the documents of type "how-to" in machine-readable form
    Then each match carries its path, type, audiences, confidence, freshness, owner and tags
