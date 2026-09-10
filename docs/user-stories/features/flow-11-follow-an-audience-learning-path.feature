@flow-11 @project-lead @navigation @should
Feature: FLOW-11 Follow an audience learning path
  """
  As a project lead onboarding into a new role,
  I want an ordered reading path that starts at my role's entry point and only includes what is meant for me,
  so that I learn the system in the order its authors intended.
  """
  # Source: cli/src/commands/roadmap.ts
  # Spec: .docspec

  @happy-path @mvp
  Scenario: Read the path for my role
    Given the project declares an audience "human-author" with an entry point document
    And the entry point teaches further documents meant for that audience
    When I ask for the learning path for "human-author"
    Then I am told the audience name and where the path starts
    And the steps are numbered in reading order
    And each step is shown with its document type and title
    And I am told how many documents the path holds

  @happy-path
  Scenario: Side references are offered without interrupting the path
    # Source: cli/src/commands/roadmap.ts
    Given a step in the path also points at documents it uses or that explain it
    When I ask for the learning path
    Then those documents are offered alongside that step as further reading
    And they are not numbered as steps of their own

  @edge-case
  Scenario: Documents meant for other audiences are left out
    Given the entry point teaches a document that is only meant for another audience
    When I ask for the learning path for my audience
    Then that document is not part of my path

  @edge-case
  Scenario: A document reached twice appears once
    Given two steps both teach the same document
    When I ask for the learning path
    Then that document appears once in the path

  @edge-case
  Scenario: The path stops where the teaching relationships stop
    Given the entry point declares no teaching or follow-on relationships
    When I ask for the learning path
    Then the path holds only the entry point

  @validation
  Scenario: Ask for a role the project does not define
    # Source: cli/src/commands/roadmap.ts
    Given the project declares the audiences "ai-generator", "ai-agent", "human-author" and "project-lead"
    When I ask for the learning path for "designer"
    Then I am told that audience is unknown and which audience identifiers are valid
    And the request exits unsuccessfully

  @error
  Scenario: The role's entry point does not exist
    Given an audience whose declared entry point document is missing from the set
    When I ask for that audience's learning path
    Then I am told the entry point was not found in the graph, naming it
    And the request exits unsuccessfully

  @happy-path
  Scenario: Take the path as data
    When I ask for a learning path in machine-readable form
    Then I receive the audience, its entry point and each step with its number, path, type, title and further reading
