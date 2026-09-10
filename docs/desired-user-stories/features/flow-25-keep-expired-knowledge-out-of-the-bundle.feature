@flow-25 @ai-agent @lifecycle @mvp
Feature: FLOW-25 Keep expired knowledge out of the bundle
  """
  As an AI agent that will state what it retrieves as fact,
  I want knowledge that is past its review date withheld or clearly marked,
  so that I never present expired truth with the same confidence as verified truth.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#freshness
  # Source: cli/src/graph.ts

  Background:
    Given a project whose documents declare when they were last verified
    And whose configuration declares a review cadence per document type

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @mvp
  Scenario: Expired knowledge is withheld by default
    Given a document that is past its review cadence matches my question
    When I ask for context
    Then its passages are absent from the bundle
    And I am told a matching document was withheld for being past its review date

  @happy-path @mvp
  Scenario: Ageing knowledge is served but marked
    Given a document approaching its review cadence matches my question
    When I ask for context
    Then its passages are present in the bundle
    And each carries the date it was last verified
    And each is marked as approaching its review date

  @happy-path
  Scenario: Ask for expired knowledge deliberately
    Given expired documents match my question
    When I ask for context and declare that expired knowledge is acceptable
    Then their passages are present in the bundle
    And each is marked as past its review date
    And each carries the date it was last verified

  # ─────────────────────────────────────────────
  # Data-Driven
  # ─────────────────────────────────────────────

  @data-driven
  Scenario Outline: How each freshness state reaches the bundle
    Given a matching document whose freshness is "<state>"
    When I ask for context without declaring a freshness preference
    Then it is "<treatment>"

    Examples:
      | state  | treatment                            |
      | fresh  | served without a freshness remark    |
      | ageing | served and marked as ageing          |
      | stale  | withheld and reported as withheld    |

  @data-driven
  Scenario Outline: A document's declared confidence reaches the consumer
    Given a matching document that declares confidence "<confidence>"
    When I ask for context
    Then its passages carry the declared confidence "<confidence>"

    Examples:
      | confidence |
      | high       |
      | medium     |
      | low        |
      | stale      |

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case @mvp
  Scenario: An expired document that a served passage depends on
    # Design: docs/desired-user-stories/context-engine-design.md#freshness
    Given a fresh passage is selected for the bundle
    And a document it requires is past its review date
    When I ask for context
    Then the required document is present in the bundle
    And it is marked as past its review date
    And I am told it was included because a served passage requires it

  @edge-case
  Scenario: Everything that matches has expired
    Given every document matching my question is past its review date
    When I ask for context without declaring that expired knowledge is acceptable
    Then I receive an empty bundle
    And I am told matches exist but all of them have expired
    And I am told the most recent verification date among them

  @edge-case
  Scenario: A document claims it was verified in the future
    Given a document declares a verification date later than today
    When I ask for context
    Then it is treated as verified now
    And I am told its verification date is later than today

  @error
  Scenario: No review cadence is declared for a document's type
    Given the project's configuration declares no review cadence for a matched document's type
    When I ask for context
    Then its passages are present in the bundle
    And each is marked as having unknown freshness
    And I am told which cadence the configuration is missing

  @validation
  Scenario: Reject an unknown freshness preference
    When I ask for context declaring a freshness preference the product does not define
    Then the request is refused
    And I am told which freshness preferences are accepted
