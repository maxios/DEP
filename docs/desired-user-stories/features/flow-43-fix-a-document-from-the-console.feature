@flow-43 @human-author @console @should
Feature: FLOW-43 Fix a document from the console
  """
  As someone looking at a document the console has just told me is stale or mis-tagged,
  I want to correct its metadata where I am looking at it,
  so that acting on what the console shows does not mean finding the file and editing
  frontmatter by hand.
  """
  # Design: docs/desired-user-stories/context-engine-design.md#api
  # Source: cli/src/writer.ts
  # Source: cli/src/console/server.ts

  Background:
    Given a project configured for DEP and indexed for retrieval
    And a running console

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: Mark a document reviewed
    Given a document that is past its review date
    When I mark it reviewed from the console
    Then the console counts it as fresh again
    And the document's own file records the new review date

  @happy-path
  Scenario: Change how far a document is trusted
    When I set a document's confidence to "low" from the console
    Then the console reports that confidence
    And the document's own file records it

  @happy-path
  Scenario: Add a tag and take one away
    When I add the tag "reviewed" to a document from the console
    And I take the tag "lifecycle" off the same document from the console
    Then the document carries only the tags I left on it

  @happy-path
  Scenario: Link one document to another
    When I link a document to another as REQUIRES from the console
    Then the graph holds that link
    And the document it points at counts it as incoming

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @validation
  Scenario: Refuse a value the schema does not allow
    When I set a document's confidence to "quite sure" from the console
    Then the change is refused
    And I am told which values are allowed
    And the document is left as it was

  @validation
  Scenario: Refuse a link to a document the set does not have
    When I link a document to one that is not in the set from the console
    Then the change is refused
    And the document is left as it was

  @validation
  Scenario: Refuse to change a file outside the set
    When I try to change a file outside the project from the console
    Then the change is refused
    And the file outside the project is untouched

  @security
  Scenario: A page on another site cannot make the console write
    When another site asks the console to change a document
    Then the change is refused
    And the document is left as it was

  @security
  Scenario: A request addressed to somewhere else is refused
    When a request arrives addressed to a host that is not this machine
    Then the change is refused
    And the document is left as it was
