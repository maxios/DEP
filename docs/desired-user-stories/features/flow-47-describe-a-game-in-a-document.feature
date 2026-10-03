@flow-47 @developer @loop @should
Feature: FLOW-47 Describe a game in a document
  """
  As someone setting an agent a task it should get better at,
  I want to write the rules of the game in a documentation file — which scenarios are the
  levels, what makes two situations the same, where the player may write, and who keeps score —
  so that the game is reviewed and kept current like any other documentation, and so the
  player can never be given a way to judge itself.
  """
  # Design: docs/desired-user-stories/liveness-design.md#notating-the-game
  # Source: packages/loop/src/game

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path
  Scenario: Read a game from its document
    Given a game document that names an arena of scenarios and which of them are in play
    When I read the game
    Then every scenario in play is a level
    And no scenario outside the selection is a level

  @happy-path
  Scenario: Each level is a situation the store can recognise
    Given a game whose situations are described by a scenario's tags and its example row
    When I read the game
    Then each level's situation carries the features the game names
    And two rows of the same outline are different situations that share their tags

  @happy-path
  Scenario: A game document is documentation like any other
    Given a game document in the project's documentation
    When the documentation set is validated
    Then the game document is checked like any other reference

  # ─────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────

  @validation
  Scenario: Refuse a game the player could score
    Given a game document that lets something other than the scenarios keep score
    When I read the game
    Then I am told the scenarios must be the only judge

  @validation
  Scenario: Refuse a game that lets the player write where it is judged
    Given a game document whose writable paths reach the scenarios' own steps
    When I read the game
    Then I am told the player may not write where it is judged

  @validation
  Scenario: Refuse a game whose arena is missing
    Given a game document that names an arena that does not exist
    When I read the game
    Then I am told the arena cannot be found

  @error
  Scenario: Refuse a situation the engine cannot read
    Given a game document that describes situations by something its scenarios do not have
    When I read the game
    Then I am told which part of the situation cannot be read
