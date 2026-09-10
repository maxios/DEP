@flow-04 @human-author @validation @mvp
Feature: FLOW-04 Validate documents and graph integrity
  """
  As a documentation author responsible for a documentation set,
  I want one verdict per document plus a verdict on the set as a whole,
  so that I know exactly what breaks DEP compliance before I publish or merge.
  """
  # Source: cli/src/commands/validate.ts
  # Spec: docs/how-to/validate-a-document.md

  @happy-path @mvp
  Scenario: A compliant set passes
    Given every document declares complete, valid metadata
    And every relationship points at a document that exists
    And every audience entry point exists
    And no document is unreachable and no prerequisite cycle exists
    When I ask for validation
    Then I am told how many documents were checked and how many passed, warned and failed
    And every document is reported as passing
    And the set is reported as having no unreachable documents, no prerequisite cycles and no missing entry points
    And the request exits successfully

  @happy-path
  Scenario: Take the verdict as data
    Given a documentation set with a mix of passing and failing documents
    When I ask for validation in machine-readable form
    Then I receive one entry per document with its verdict and the outcome of each individual check
    And I receive the outcome of each set-wide check

  # ─────────────────────────────────────────────
  # Per-document checks
  # ─────────────────────────────────────────────

  @validation @mvp
  Scenario Outline: Reject a document whose metadata breaks the schema
    # Source: cli/src/commands/validate.ts
    Given a document that declares "<defect>"
    When I ask for validation
    Then that document is reported as failing
    And I am told "<message>"
    And the request exits unsuccessfully

    Examples:
      | defect                                      | message                                          |
      | no owner and no confidence                  | Missing: owner, confidence                       |
      | a type of "guide"                           | Unknown type: guide                              |
      | an audience of "sales-team"                 | Unknown audiences: sales-team                    |
      | a relationship of "MENTIONS"                | Unknown rels: MENTIONS                           |
      | a confidence of "certain"                   | Invalid: certain                                 |
      | a creation date of "last Tuesday"           | Invalid ISO 8601: "last Tuesday"                 |

  @validation
  Scenario: Reject a document that points at something that is not there
    Given a document declares a relationship to a path that holds no file
    When I ask for validation
    Then that document is reported as failing
    And I am told which relationship targets are broken

  @happy-path
  Scenario: Accept the vocabulary a project defines for itself
    # Source: cli/src/commands/validate.ts
    Given the project declares its own document type and its own relationship name
    And a document uses both of them
    When I ask for validation
    Then that document is reported as passing

  @edge-case
  Scenario: Relationships discovered in prose are always acceptable
    Given a document links to another document in its prose only
    When I ask for validation
    Then that link is not reported as an unknown relationship

  # ─────────────────────────────────────────────
  # Freshness is a warning, not a failure
  # ─────────────────────────────────────────────

  @edge-case @lifecycle
  Scenario Outline: Freshness is derived from the review cadence for the type
    # Source: cli/src/graph.ts
    # Spec: .docspec
    Given a reference document whose review cadence is 30 days
    And it was last verified "<age>" ago
    When I ask for validation
    Then its freshness is reported as "<state>"

    Examples:
      | age     | state |
      | 10 days | FRESH |
      | 30 days | FRESH |
      | 45 days | AGING |
      | 60 days | AGING |
      | 90 days | STALE |

  @edge-case @lifecycle
  Scenario: A stale document warns without failing the run
    Given every document is otherwise compliant
    And one document has gone past twice its review cadence
    When I ask for validation
    Then that document is reported as warning rather than failing
    And I am told "Document exceeds review cadence"
    And the request exits successfully

  # ─────────────────────────────────────────────
  # Set-wide checks
  # ─────────────────────────────────────────────

  @validation
  Scenario Outline: Reject a set whose graph is broken
    # Source: cli/src/commands/validate.ts
    Given every document passes its own checks
    And the set has "<set_defect>"
    When I ask for validation
    Then the set-wide check "<check>" is reported as failing
    And I am told which documents or audiences are involved
    And the request exits unsuccessfully

    Examples:
      | set_defect                                        | check                |
      | a document no entry point or index leads to       | No orphans           |
      | two documents that require each other             | No REQUIRES cycles   |
      | an audience whose entry point document is missing | Entry points exist   |

  @edge-case
  Scenario: An index document is a valid starting point
    # Source: cli/src/graph.ts
    Given a document is only reachable from an index document
    When I ask for validation
    Then it is not reported as unreachable
