@flow-27 @ai-agent @graph @mvp
Feature: FLOW-27 Pull in what the answer assumes I already know
  """
  As an AI agent given a passage that answers my question,
  I want the knowledge that passage assumes pulled in with it, in reading order,
  so that I understand the answer rather than merely holding it.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#pipeline
  # Source: cli/src/commands/prereqs.ts
  # Source: cli/src/commands/neighbors.ts

  Background:
    Given a project whose documents declare typed relationships to each other

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @mvp
  Scenario: Prerequisites arrive with the passage that needs them
    Given the passage answering my question comes from a document that requires another document
    When I ask for context
    Then the required document is present in the bundle
    And it appears before the passage that requires it

  @happy-path @mvp
  Scenario: Widely-depended-upon knowledge outranks an isolated match
    Given two documents match my question equally well
    And many other documents in the set require the first one
    And nothing requires the second
    When I ask for context
    Then the first appears before the second in the bundle
    And if only one of them fits the budget, it is the first

  @happy-path
  Scenario: Limit how far the expansion reaches
    When I ask for context and declare how many relationships deep the expansion may reach
    Then no passage in the bundle is further from a matched passage than the depth I declared
    And I am told how many passages were reached by expansion rather than by matching

  # ─────────────────────────────────────────────
  # Data-Driven
  # ─────────────────────────────────────────────

  @data-driven
  Scenario Outline: How each kind of relationship pulls knowledge in
    Given a matched document relates to a neighbouring document as "<relationship>"
    When I ask for context with a budget that can hold only some of the candidates
    Then the neighbour's chance of being pulled in is "<influence>"

    Examples:
      | relationship | influence |
      | REQUIRES     | strongest |
      | TEACHES      | strong    |
      | EXPLAINS     | strong    |
      | USES         | moderate  |
      | NEXT         | weak      |
      | INLINE       | weakest   |

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case @mvp
  Scenario: Expansion can never overflow the budget
    Given a matched passage requires more knowledge than the budget can hold
    When I ask for context
    Then the bundle's total size is still at or below the budget
    And I am told the prerequisite chain did not fit
    And I am given the ordered list of what was left out

  @edge-case
  Scenario: Documents that require each other in a circle
    Given two documents each require the other
    And one of them matches my question
    When I ask for context
    Then the bundle is still produced
    And each document appears at most once
    And I am told the requirement chain closes on itself

  @error
  Scenario: A prerequisite that no longer exists
    Given a matched document requires a document that is absent from the set
    When I ask for context
    Then the bundle is still produced
    And I am told which required document could not be found

  @validation
  Scenario Outline: Reject an expansion depth that cannot be honoured
    When I ask for context declaring an expansion depth of "<depth>"
    Then the request is refused
    And I am told "<message>"

    Examples:
      | depth | message                                  |
      | -1    | expansion depth must not be negative     |
      | deep  | expansion depth must be a whole number   |

  @edge-case
  Scenario: Expansion is skipped when it is not wanted
    When I ask for context and decline expansion along relationships
    Then every passage in the bundle is there because it matched my question
    And no passage is present solely because another passage requires it
