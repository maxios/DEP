@flow-07 @ai-agent @search @should
Feature: FLOW-07 Build the semantic index
  """
  As an AI agent that will search a documentation set by meaning,
  I want to build and incrementally refresh a semantic index of the set,
  so that meaning-based search is available without re-processing documents that have not changed.
  """
  # Source: cli/src/commands/vectorize.ts
  # Source: cli/src/vectorstore/chunker.ts

  @happy-path @mvp
  Scenario: Build the index for the first time
    Given a project with documents and no semantic index
    When I ask for the set to be indexed
    Then I am told which embedding provider is being prepared
    And I am told how many documents were newly indexed and how many passages they produced
    And I am told which model was used and how many dimensions it produces
    And I am told the index is held at ".dep-vectors.db"

  @happy-path
  Scenario: Preview the work without building anything
    # Source: cli/src/commands/vectorize.ts
    Given a project with documents
    When I ask for a preview of indexing
    Then I am told how many documents and how many passages would be indexed
    And I am told the passage count for each document
    And no index is created

  @happy-path
  Scenario: Refresh only what changed
    Given a set that has already been indexed
    And one document has been edited since
    When I ask for the set to be indexed again
    Then the edited document is reported as updated
    And every unchanged document is reported as skipped

  @happy-path
  Scenario: Add a new document to an existing index
    Given a set that has already been indexed
    And a new document has been added to the set
    When I ask for the set to be indexed again
    Then the new document is reported as newly indexed

  @edge-case
  Scenario: Drop documents that have left the set
    # Source: cli/src/commands/vectorize.ts
    Given a set that has already been indexed
    And a previously indexed document has been removed from the set
    When I ask for the set to be indexed again
    Then I am told that document was removed from the index
    And searching by meaning never returns it again

  @edge-case
  Scenario: Rebuild everything on demand
    Given a set that has already been indexed and nothing has changed
    When I ask for the index to be rebuilt from scratch
    Then every document is re-indexed rather than skipped

  @edge-case
  Scenario: A document that yields no passages is skipped
    Given a document whose body holds no indexable content
    When I ask for the set to be indexed
    Then that document is reported as skipped

  @happy-path
  Scenario Outline: Choose where the meaning comes from
    # Source: cli/src/embeddings/provider.ts
    Given the project can reach the "<provider>" embedding provider
    When I ask for the set to be indexed with "<provider>"
    Then the index records "<provider>" as the source of its meaning

    Examples:
      | provider |
      | local    |
      | openai   |

  @error
  Scenario: Refuse to mix two models in one index
    # Source: cli/src/commands/vectorize.ts
    Given an index built with one embedding model
    When I ask for the set to be indexed with a different model
    Then I am told the index and the requested model disagree, naming both
    And I am told to ask for a rebuild instead
    And the existing index is left untouched
    And the request exits unsuccessfully

  @happy-path
  Scenario: Take the indexing outcome as data
    When I ask for the set to be indexed in machine-readable form
    Then I receive the counts of new, updated, skipped and removed documents, the total passages and the model used
