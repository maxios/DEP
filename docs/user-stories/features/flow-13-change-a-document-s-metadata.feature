@flow-13 @human-author @metadata @mvp
Feature: FLOW-13 Change a document's metadata
  """
  As a documentation author maintaining a document,
  I want to change its declared metadata through the toolchain rather than by hand,
  so that invalid values are refused before they reach the file and the file's shape stays intact.
  """
  # Source: cli/src/commands/set.ts
  # Source: cli/src/writer.ts

  @happy-path @mvp
  Scenario: Change one field
    Given "docs/reference/metadata-schema.md" declares a confidence of "medium"
    When I declare its confidence to be "high"
    Then I am shown the document and its confidence changing from "medium" to "high"
    And the document now declares a confidence of "high"

  @happy-path
  Scenario: Change several fields at once
    When I declare a document's confidence to be "high" and its owner to be "@dep-core"
    Then I am shown both changes
    And both are recorded on the document

  @happy-path
  Scenario Outline: Declare a list-valued field
    # Source: cli/src/writer.ts
    When I declare a document's "<field>" to be "<value>"
    Then the document records "<field>" as a list of the separate entries

    Examples:
      | field       | value                   |
      | audience    | ai-agent,human-author   |
      | tags        | cli,metadata            |
      | depends_on  | .docspec,seed.md        |

  @happy-path
  Scenario: Preview a change without touching the document
    # Source: cli/src/commands/set.ts
    Given a document declares a confidence of "medium"
    When I preview declaring its confidence to be "low"
    Then I am told the document was not modified
    And I am shown what the change would be
    And the document still declares a confidence of "medium"

  @happy-path
  Scenario: Set a field that was never declared
    Given a document that declares no tags
    When I declare its tags to be "cli"
    Then I am shown the field changing from unset to "cli"

  @validation @mvp
  Scenario Outline: Refuse a value the project does not allow
    # Source: cli/src/writer.ts
    When I declare a document's "<field>" to be "<value>"
    Then I am told the value is invalid and which values are allowed
    And the document is left unchanged
    And the request exits unsuccessfully

    Examples:
      | field         | value          |
      | confidence    | certain        |
      | type          | guide          |
      | audience      | sales-team     |
      | created       | last Tuesday   |
      | last_verified | soon           |

  @validation
  Scenario: Refuse a field that is not part of the schema
    # Source: cli/src/commands/set.ts
    When I declare a document's "priority" to be "high"
    Then I am told "priority" is not a known metadata field
    And I am told which fields are known
    And the request exits unsuccessfully

  @validation
  Scenario: Accept a document type the project defines for itself
    Given the project declares its own document type
    When I declare a document's type to be that type
    Then the change is recorded

  @validation
  Scenario: Declare nothing
    When I ask to change a document without naming any field
    Then I am shown how to name a field and an example
    And the request exits unsuccessfully

  @error
  Scenario Outline: Refuse a file that is not a DEP document
    # Source: cli/src/writer.ts
    Given "<file_state>"
    When I declare a metadata field on it
    Then I am told "<message>", naming the file
    And the request exits unsuccessfully

    Examples:
      | file_state                                  | message                              |
      | a markdown file with no frontmatter at all  | No frontmatter found                 |
      | a markdown file whose frontmatter has no DEP metadata | No dep: block in frontmatter |

  @edge-case
  Scenario: The document's prose survives the change
    Given a document with prose, code samples and links
    When I declare a metadata field on it
    Then its prose, code samples and links are unchanged

  @happy-path
  Scenario: Take the change as data
    When I declare a metadata field in machine-readable form
    Then I receive the document path and each field with its old and new value
