@flow-55 @human-author @ai-agent @heartbeat @should
Feature: FLOW-55 A document that is waiting wakes its owner
  """
  As the owner of documents that wait on someone or something,
  I want a cheap, regular check that wakes me only when one of them needs me —
  a follow-up that is due, a review that is overdue, something I watch that changed —
  so that open loops are followed up without anyone having to remember them,
  and nothing expensive runs when nothing needs doing.
  """
  # Design: docs/desired-user-stories/liveness-design.md#liveness-without-a-second-vocabulary
  # Source: cli/src/heart/

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: A loop waiting past its follow-up time wakes its owner
    Given a document of mine waiting on someone, asked five hours ago, to follow up after four
    When my heart beats
    Then I am woken
    And I am told which document is waiting, on whom, and since when

  @happy-path
  Scenario: Nothing waiting, nothing woken
    Given documents of mine that are fresh and wait on no one
    When my heart beats
    Then I am not woken

  @happy-path
  Scenario: A document past its review date wakes its owner
    Given a document of mine that is past its review date
    When my heart beats
    Then I am woken
    And I am told the document is due for review

  @happy-path
  Scenario: A change to a document I watch wakes me
    Given a document of mine that watches another document
    And my heart has beaten once already
    When the watched document changes
    And my heart beats
    Then I am woken
    And I am told which watched document changed

  @happy-path
  Scenario: What needs me most comes first
    Given a document of mine past its review date
    And a document of mine waiting past its follow-up time
    When my heart beats
    Then the follow-up is the first thing I am told

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @edge-case
  Scenario: A loop not yet due does not wake its owner, but sets when they look next
    Given a document of mine waiting on someone, asked a minute short of four hours ago, to follow up after four
    When my heart beats
    Then I am not woken
    And my next beat is no later than when the follow-up falls due

  @edge-case
  Scenario: Someone else's documents do not wake me
    Given a document waiting past its follow-up time that someone else owns
    When my heart beats
    Then I am not woken

  @edge-case
  Scenario: An owner with nothing to do is checked less and less often
    Given documents of mine that are fresh and wait on no one
    When my heart beats five times with nothing found
    Then each wait before the next beat is longer than the last, up to a limit

  @edge-case
  Scenario: A change brings an idle owner's next beat forward
    Given an owner whose beats have backed off
    When something changes that concerns them
    Then their next beat comes at the shortest interval

  @edge-case
  Scenario: Every beat is recorded, woken or not
    Given a document of mine waiting past its follow-up time
    When my heart beats twice, with the follow-up answered in between
    Then both beats are recorded
    And the record says how many beats woke me

  # ─────────────────────────────────────────────
  # Error / Security
  # ─────────────────────────────────────────────

  @security
  Scenario: With the kill switch on, owners are checked but never woken
    Given a document of mine waiting past its follow-up time
    And the kill switch is on
    When my heart beats
    Then I am not woken
    And the beat is recorded with what it would have woken me for

  @error
  Scenario: A heart that does not make sense is reported by validation
    Given a document whose heart waits on no one and follows up "soon"
    When the documentation set is validated
    Then the document fails validation
    And I am told what is wrong with its heart
