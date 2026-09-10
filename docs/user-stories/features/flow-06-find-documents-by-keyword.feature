@flow-06 @human-author @search @mvp
Feature: FLOW-06 Find documents by keyword
  """
  As a documentation author looking for where a subject is already covered,
  I want to search the whole set by words and see why each document matched,
  so that I extend the right document instead of writing a duplicate.
  """
  # Source: cli/src/commands/search.ts

  @happy-path @mvp
  Scenario: Find documents that carry all of my words
    Given a project whose documents mention "lifecycle" in titles, tags and prose
    When I search for "lifecycle"
    Then I am told how many documents matched my words
    And each match is shown with its path, its score and its title
    And the matches are ordered with the strongest first

  @happy-path
  Scenario: Understand why a document matched
    Given a document whose tags include "lifecycle" and whose prose mentions it
    When I search for "lifecycle"
    Then I am shown the matching tags for that document
    And I am shown up to three excerpts of the surrounding prose

  @happy-path
  Scenario Outline: A match in the title outranks a match in prose alone
    # Source: cli/src/commands/search.ts
    Given a document whose title contains every word I search for
    And another document that contains those words only in its prose
    When I search for "<query>"
    Then the document matching in the title scores higher than the other

    Examples:
      | query          |
      | type purity    |
      | review cadence |

  @edge-case
  Scenario: All of my words must appear somewhere in the document
    # Source: cli/src/commands/search.ts
    Given a document mentions "lifecycle" but never mentions "vector"
    When I search for "lifecycle vector"
    Then that document is not returned

  @edge-case
  Scenario: Words are matched regardless of case
    Given a document titled "Document Lifecycle"
    When I search for "LIFECYCLE"
    Then that document is returned

  @edge-case
  Scenario: Long excerpts are shortened
    Given a document whose matching prose line is longer than 120 characters
    When I search for a word on that line
    Then the excerpt I am shown is shortened and marked as continuing

  @happy-path
  Scenario: Narrow a search to a type or an audience
    Given documents of several types mention "validation"
    When I search for "validation" among documents of type "how-to"
    Then every match is a how-to
    And references mentioning "validation" are excluded

  @edge-case
  Scenario: Nothing matches
    Given no document mentions "kubernetes"
    When I search for "kubernetes"
    Then I am told that there are no results for "kubernetes"

  @happy-path
  Scenario: Take the matches as data
    When I search for "lifecycle" in machine-readable form
    Then each match carries its path, score, title, whether the title matched, the matching tags and the prose excerpts
