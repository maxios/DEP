@flow-02 @ai-agent @config @mvp
Feature: FLOW-02 Point the toolchain at a project
  """
  As an AI agent working inside someone else's repository,
  I want to tell the toolchain which project to read and discover what it can do,
  so that every later request operates on the right documentation set.
  """
  # Source: cli/src/index.ts
  # Source: cli/src/config.ts
  # Spec: .docspec

  @happy-path @mvp
  Scenario: Operate on a project I name explicitly
    Given a project whose root holds a ".docspec" declaring its documentation root
    When I make any request and name that project root
    Then the request is answered from that project's documents

  @happy-path
  Scenario: Discover the available capabilities
    # Source: cli/src/index.ts
    When I ask for help
    Then I am shown the documentation requests I can make, including graph, backlinks, validate, query, index, search, vectorize, neighbors, roadmap and prereqs
    And I am shown the metadata requests I can make, including set, bump, tag and link
    And I am shown the decision requests I can make, including dap validate, dap resolve, dap node, dap trace and dap graph
    And I am told that every request accepts a project root and a JSON form

  @happy-path
  Scenario: Ask for something the toolchain does not offer
    Given I name a capability that does not exist
    When I make that request
    Then I am shown the list of capabilities that do exist

  @edge-case
  Scenario: Omit the project root
    # Source: cli/src/index.ts
    Given I do not name a project root
    When I make a request
    Then the parent of my current location is used as the project root

  @edge-case
  Scenario: Decision requests read the project's decision set
    # Source: cli/src/index.ts
    Given the project root holds a "dap" collection with its own ".dapspec"
    When I make a decision request against that project root
    Then the request is answered from that project's decision trees

  @validation @wip @later
  Scenario: Refuse a project that is not configured for DEP
    # Note: assumed behaviour — today an unconfigured project produces an unhandled failure
    #       rather than a readable message. See Open questions.
    Given a project root with no ".docspec"
    When I make a documentation request against it
    Then I am told that the project is not configured for DEP and which file is missing
    And the request exits unsuccessfully
