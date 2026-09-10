# DEP — User Stories (BDD)

Black-box acceptance criteria for the Documentation Engineering Protocol toolchain: the `dep`
CLI, the DAP decision engine inside it, the installer, and the Claude Code plugin skills.

Every step below is either an **input** an actor provides or an **observable output** the product
returns. Nothing describes internals. Source references (`# Source:` / `# Spec:`) are attached as
comments so each feature stays traceable to the code or spec it was derived from.

Assumptions and known deviations are tagged `@wip @later` inline and listed under
[Open questions](#open-questions) at the end of this file.

```gherkin
@flow-01 @project-lead @install @mvp
Feature: FLOW-01 Install the DEP CLI
  """
  As a project lead evaluating DEP,
  I want to install the dep CLI with a single command,
  so that I can try DEP on my own project without setting up a runtime or build toolchain.
  """
  # Source: install.sh
  # Spec: README.md

  # ─────────────────────────────────────────────
  # Happy Path
  # ─────────────────────────────────────────────

  @happy-path @mvp
  Scenario: Install the latest release on a supported machine
    # Source: install.sh
    Given I am on a supported platform
    And a release binary is published for that platform
    When I request an installation
    Then I am told which platform was detected and which release is being fetched
    And the CLI is placed at "$HOME/.dep/bin/dep" as an executable
    And I am told "DEP CLI installed to $HOME/.dep/bin/dep"

  @happy-path
  Scenario: Be told how to make the CLI reachable
    Given "$HOME/.dep/bin" is not part of my command search path
    When the installation completes
    Then I am told to prepend "$HOME/.dep/bin" to my command search path
    And I am told I can add that line to a shell profile such as "~/.zshrc" or "~/.bashrc"

  @happy-path
  Scenario: Install a pinned version instead of the latest
    Given I declare the version I want
    When I request an installation
    Then the release matching that version is fetched instead of the latest one
    And I am told which release is being fetched

  @edge-case
  Scenario: Reinstall over an existing installation
    Given a dep CLI is already installed at "$HOME/.dep/bin/dep"
    When I request an installation again
    Then the installed CLI is replaced with the freshly fetched one
    And it remains executable

  @edge-case
  Scenario: Installing when the search path is already set up
    Given "$HOME/.dep/bin" is already part of my command search path
    When the installation completes
    Then I am not given any search-path instructions

  # ─────────────────────────────────────────────
  # Validation & Errors
  # ─────────────────────────────────────────────

  @validation
  Scenario Outline: Refuse to install on an unsupported machine
    # Source: install.sh
    Given my machine reports "<platform_report>"
    When I request an installation
    Then I am told "<message>"
    And nothing is installed
    And the installation exits unsuccessfully

    Examples:
      | platform_report          | message                                       |
      | an operating system of Windows_NT | Error: Unsupported operating system: Windows_NT |
      | a processor of riscv64   | Error: Unsupported architecture: riscv64      |

  @error
  Scenario: No download tool is available
    Given neither curl nor wget is available on my machine
    When I request an installation
    Then I am told "Error: curl or wget is required"
    And nothing is installed
    And the installation exits unsuccessfully

  @error @external-dependency
  Scenario: The release cannot be fetched
    Given I am on a supported platform
    And the requested release cannot be downloaded
    When I request an installation
    Then the installation exits unsuccessfully
    And no partially written CLI is left behind as executable

# ═══════════════════════════════════════════════════════════════════════════

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

# ═══════════════════════════════════════════════════════════════════════════

@flow-03 @human-author @graph @mvp
Feature: FLOW-03 Inspect the documentation graph
  """
  As a documentation author inheriting a documentation set,
  I want to see every document, its freshness and how the documents point at each other,
  so that I can understand the shape of the set before changing anything.
  """
  # Source: cli/src/commands/graph.ts
  # Source: cli/src/graph.ts
  # Source: cli/src/output.ts

  @happy-path @mvp
  Scenario: See the whole set grouped by document type
    # Source: cli/src/output.ts
    Given a project with documents of several types
    When I ask for the documentation graph
    Then the documents are grouped under their type
    And each document is shown with its freshness state and its declared confidence
    And each typed relationship is shown as its relationship name and its target
    And I am told how many documents, relationships, unreachable documents and dependency cycles were found

  @happy-path
  Scenario: Take the graph as data
    Given a project with documents and relationships
    When I ask for the graph in machine-readable form
    Then I receive every document with its type, audiences, confidence, freshness, outgoing links and incoming links
    And I receive the relationship list, the unreachable documents, the cycles, and the same counts

  @happy-path
  Scenario Outline: Take the graph as a drawing
    # Source: cli/src/output.ts
    Given a project with typed relationships between documents
    When I ask for the graph as "<form>"
    Then I receive a "<form>" description of the graph
    And documents are coloured by type
    And untyped relationships picked up from prose links are left out

    Examples:
      | form    |
      | dot     |
      | mermaid |

  @edge-case
  Scenario: A document outside the documentation root still counts
    # Source: cli/src/graph.ts
    Given the project has a seed document at its root
    When I ask for the documentation graph
    Then the seed document appears in the graph

  @edge-case
  Scenario: Files without DEP metadata are left out
    # Source: cli/src/parser.ts
    Given the documentation root also holds markdown files with no DEP metadata
    When I ask for the documentation graph
    Then those files do not appear in the graph
    And they are not counted in the totals

  @edge-case
  Scenario: A prose link that duplicates a typed relationship is not counted twice
    # Source: cli/src/graph.ts
    Given a document declares a typed relationship to another document
    And its prose also links to that same document
    When I ask for the documentation graph
    Then only the typed relationship is reported between those two documents

  @edge-case
  Scenario: Documents nobody can reach are called out
    # Source: cli/src/graph.ts
    Given a document that no audience entry point, index or other document leads to
    When I ask for the documentation graph
    Then that document is listed as unreachable
    And the unreachable count includes it

  @edge-case
  Scenario: A dependency cycle is called out
    Given two documents each declare the other as a prerequisite
    When I ask for the documentation graph
    Then the cycle is listed as a chain of document paths
    And the cycle count includes it

  @edge-case
  Scenario: An empty documentation set
    Given a project whose documentation root holds no documents with DEP metadata
    When I ask for the documentation graph
    Then I am told the set holds no documents, relationships, unreachable documents or cycles

# ═══════════════════════════════════════════════════════════════════════════

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

# ═══════════════════════════════════════════════════════════════════════════

@flow-05 @ai-agent @metadata @mvp
Feature: FLOW-05 Query documents by metadata
  """
  As an AI agent asked to work on part of a documentation set,
  I want to narrow the set down by type, audience, tag, confidence, freshness or owner,
  so that I load only the documents that matter to the task instead of the whole set.
  """
  # Source: cli/src/commands/query.ts

  @happy-path @mvp
  Scenario: Narrow the set to one document type
    Given a project with tutorials, references and explanations
    When I ask for the documents of type "reference"
    Then I am told how many documents matched
    And each match is shown with its type, audiences, freshness and confidence
    And no document of another type is included

  @data-driven
  Scenario Outline: Narrow the set on any single dimension
    # Source: cli/src/commands/query.ts
    Given a project whose documents vary in type, audience, tag, confidence, freshness and owner
    When I ask for the documents whose "<dimension>" is "<value>"
    Then every match carries that "<dimension>"
    And nothing else is included

    Examples:
      | dimension  | value        |
      | type       | how-to       |
      | audience   | ai-agent     |
      | tag        | metadata     |
      | confidence | high         |
      | lifecycle  | STALE        |
      | owner      | @dep-core    |

  @happy-path
  Scenario: Combine narrowing dimensions
    Given a project with references owned by two different owners
    When I ask for the references owned by "@dep-core"
    Then every match is a reference owned by "@dep-core"
    And a reference owned by anyone else is excluded

  @edge-case
  Scenario: Freshness is matched regardless of how I capitalise it
    # Source: cli/src/commands/query.ts
    Given the set holds stale documents
    When I ask for the documents whose freshness is "stale"
    Then the stale documents are returned

  @edge-case
  Scenario: Nothing matches
    Given no document carries the tag "billing"
    When I ask for the documents tagged "billing"
    Then I am told "No documents match the query."

  @edge-case
  Scenario: No narrowing at all
    Given a project with documents
    When I ask for documents without narrowing anything
    Then every document in the set is returned

  @happy-path
  Scenario: Take the matches as data
    When I ask for the documents of type "how-to" in machine-readable form
    Then each match carries its path, type, audiences, confidence, freshness, owner and tags

# ═══════════════════════════════════════════════════════════════════════════

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

# ═══════════════════════════════════════════════════════════════════════════

@flow-07 @ai-agent @search @should
Feature: FLOW-07 Build the semantic index
  """
  As an AI agent that will search a documentation set by meaning,
  I want to build and incrementally refresh a semantic index of the set,
  so that meaning-based search is available without re-processing documents that have not changed.
  """
  # Source: cli/src/commands/vectorize.ts
  # Source: cli/src/vectorstore/chunker.ts

  @happy-path @mvp
  Scenario: Build the index for the first time
    Given a project with documents and no semantic index
    When I ask for the set to be indexed
    Then I am told which embedding provider is being prepared
    And I am told how many documents were newly indexed and how many passages they produced
    And I am told which model was used and how many dimensions it produces
    And I am told the index is held at ".dep-vectors.db"

  @happy-path
  Scenario: Preview the work without building anything
    # Source: cli/src/commands/vectorize.ts
    Given a project with documents
    When I ask for a preview of indexing
    Then I am told how many documents and how many passages would be indexed
    And I am told the passage count for each document
    And no index is created

  @happy-path
  Scenario: Refresh only what changed
    Given a set that has already been indexed
    And one document has been edited since
    When I ask for the set to be indexed again
    Then the edited document is reported as updated
    And every unchanged document is reported as skipped

  @happy-path
  Scenario: Add a new document to an existing index
    Given a set that has already been indexed
    And a new document has been added to the set
    When I ask for the set to be indexed again
    Then the new document is reported as newly indexed

  @edge-case
  Scenario: Drop documents that have left the set
    # Source: cli/src/commands/vectorize.ts
    Given a set that has already been indexed
    And a previously indexed document has been removed from the set
    When I ask for the set to be indexed again
    Then I am told that document was removed from the index
    And searching by meaning never returns it again

  @edge-case
  Scenario: Rebuild everything on demand
    Given a set that has already been indexed and nothing has changed
    When I ask for the index to be rebuilt from scratch
    Then every document is re-indexed rather than skipped

  @edge-case
  Scenario: A document that yields no passages is skipped
    Given a document whose body holds no indexable content
    When I ask for the set to be indexed
    Then that document is reported as skipped

  @happy-path
  Scenario Outline: Choose where the meaning comes from
    # Source: cli/src/embeddings/provider.ts
    Given the project can reach the "<provider>" embedding provider
    When I ask for the set to be indexed with "<provider>"
    Then the index records "<provider>" as the source of its meaning

    Examples:
      | provider |
      | local    |
      | openai   |

  @error
  Scenario: Refuse to mix two models in one index
    # Source: cli/src/commands/vectorize.ts
    Given an index built with one embedding model
    When I ask for the set to be indexed with a different model
    Then I am told the index and the requested model disagree, naming both
    And I am told to ask for a rebuild instead
    And the existing index is left untouched
    And the request exits unsuccessfully

  @happy-path
  Scenario: Take the indexing outcome as data
    When I ask for the set to be indexed in machine-readable form
    Then I receive the counts of new, updated, skipped and removed documents, the total passages and the model used

# ═══════════════════════════════════════════════════════════════════════════

@flow-08 @ai-agent @search @should
Feature: FLOW-08 Search by meaning
  """
  As an AI agent answering a question phrased in my own words,
  I want to find the documents that are about that question rather than the ones repeating my wording,
  so that I still find the right document when the set uses different vocabulary than the question.
  """
  # Source: cli/src/commands/search.ts

  @happy-path @mvp
  Scenario: Find documents about a subject phrased differently
    # Source: cli/src/commands/search.ts
    Given the set has been indexed for meaning
    And a document explains staleness without ever using the word "outdated"
    When I search by meaning for "how do I know a document is outdated"
    Then that document is among the matches
    And each match is shown with its similarity and the passage that matched

  @happy-path
  Scenario: Long matched passages are shortened
    Given the set has been indexed for meaning
    When I search by meaning for any subject
    Then each matched passage I am shown is shortened to a readable excerpt and marked as continuing

  @edge-case
  Scenario: The number of matches is capped
    # Source: cli/src/commands/search.ts
    Given the set has been indexed for meaning
    And more than ten documents are related to my question
    When I search by meaning
    Then at most ten matches are returned
    And they are ordered with the most similar first

  @happy-path
  Scenario: Combine meaning with wording
    # Source: cli/src/commands/search.ts
    Given the set has been indexed for meaning
    When I search for "lifecycle" by both meaning and wording
    Then documents that are about the subject and documents that use the word are both eligible
    And each match's placement reflects mostly its similarity and partly its wording
    And at most ten matches are returned

  @happy-path
  Scenario: Narrow a meaning-based search to a type or audience
    Given the set has been indexed for meaning
    When I search by meaning among documents of type "explanation"
    Then every match is an explanation

  @edge-case @wip @later
  Scenario: Narrowing does not surface further matches
    # Note: narrowing is applied after the closest passages are retrieved, so a document that would
    #       match the filter can fall outside the retrieved set. See Open questions.
    Given the set has been indexed for meaning
    And only one explanation is related to my question, ranked below the twenty closest passages
    When I search by meaning among documents of type "explanation"
    Then I am told there are no results

  @error
  Scenario: The set has not been indexed for meaning yet
    # Source: cli/src/commands/search.ts
    Given the project has no semantic index
    When I search by meaning
    Then I am told no index was found and that indexing must run first
    And the request exits unsuccessfully

  @edge-case
  Scenario: The index has fallen behind the set
    Given the set has been indexed for meaning
    And a document has been edited since it was indexed
    When I search by meaning
    Then the passages I am shown are the ones captured at indexing time

# ═══════════════════════════════════════════════════════════════════════════

@flow-09 @human-author @graph @mvp
Feature: FLOW-09 Trace what points at a document
  """
  As a documentation author about to change or retire a document,
  I want to see every document that points at it and how,
  so that I can judge the impact of my change before making it.
  """
  # Source: cli/src/commands/backlinks.ts
  # Source: cli/src/output.ts

  @happy-path @mvp
  Scenario: See who points at a document, grouped by relationship
    Given several documents point at "docs/reference/metadata-schema.md" with different relationships
    When I ask what points at that document
    Then the sources are grouped under the relationship they use
    And every source document is named

  @edge-case
  Scenario: Nothing points at the document
    Given no document points at "docs/reference/metadata-schema.md"
    When I ask what points at that document
    Then I am told no incoming links were found for it

  @edge-case
  Scenario: A prose link counts as an incoming link
    # Source: cli/src/parser.ts
    Given another document links to "docs/reference/metadata-schema.md" in its prose only
    When I ask what points at that document
    Then that document is listed under the untyped relationship

  @edge-case
  Scenario: The document can be named from anywhere
    Given I am not standing at the project root
    When I ask what points at a document using a path relative to the project root
    Then the answer is about that document

  @error
  Scenario: The document is not part of the set
    # Source: cli/src/commands/backlinks.ts
    Given "docs/reference/nope.md" is not part of the documentation set
    When I ask what points at it
    Then I am told the document was not found in the graph, naming it
    And the request exits unsuccessfully

  @happy-path
  Scenario: Take the incoming links as data
    When I ask what points at a document in machine-readable form
    Then I receive the document's path and each incoming link with its source and relationship

# ═══════════════════════════════════════════════════════════════════════════

@flow-10 @ai-agent @graph @should
Feature: FLOW-10 Explore a document's neighbourhood
  """
  As an AI agent that has found one relevant document,
  I want to walk outwards from it a controlled number of hops along the relationships I care about,
  so that I load its surrounding context without loading the entire documentation set.
  """
  # Source: cli/src/commands/neighbors.ts

  @happy-path @mvp
  Scenario: Walk two hops in both directions by default
    Given "seed.md" points at documents which point at further documents
    When I ask for the neighbourhood of "seed.md"
    Then the neighbours are grouped by how many hops away they are
    And each neighbour is shown with its relationship and whether it points at my document or is pointed at
    And neighbours reached through another document name the document they came through
    And I am told how many documents are reachable within that many hops

  @happy-path
  Scenario Outline: Control how far the walk goes
    Given a chain of documents each pointing at the next
    When I ask for the neighbourhood of the first within "<hops>" hops
    Then only documents up to "<hops>" hops away are returned

    Examples:
      | hops |
      | 1    |
      | 2    |
      | 3    |

  @happy-path
  Scenario Outline: Control which direction the walk goes
    # Source: cli/src/commands/neighbors.ts
    Given a document that both points at documents and is pointed at by documents
    When I ask for its neighbourhood in the "<direction>" direction
    Then only "<included>" are returned

    Examples:
      | direction | included                       |
      | out       | the documents it points at      |
      | in        | the documents that point at it  |
      | both      | documents in either direction   |

  @happy-path
  Scenario: Follow only the relationships I care about
    Given a document with prerequisite, teaching and prose relationships
    When I ask for its neighbourhood following only prerequisite relationships
    Then every neighbour is reached through a prerequisite relationship

  @edge-case
  Scenario: Each neighbour is reported once, at the nearest hop it was found
    # Source: cli/src/commands/neighbors.ts
    Given a document reachable both directly and through a longer route
    When I ask for the neighbourhood
    Then that document appears once
    And it is not reported again at a further hop

  @edge-case
  Scenario: An isolated document has no neighbourhood
    Given a document with no relationships in either direction
    When I ask for its neighbourhood
    Then I am told no neighbours were found for it within the requested hops

  @edge-case
  Scenario: A relationship pointing outside the set is not walked
    Given a document declares a relationship to a path that is not part of the set
    When I ask for its neighbourhood
    Then that target is not reported as a neighbour

  @error
  Scenario: The starting document is not part of the set
    Given "docs/nope.md" is not part of the documentation set
    When I ask for its neighbourhood
    Then I am told the document was not found in the graph, naming it
    And the request exits unsuccessfully

# ═══════════════════════════════════════════════════════════════════════════

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

# ═══════════════════════════════════════════════════════════════════════════

@flow-12 @human-author @navigation @should
Feature: FLOW-12 Read prerequisites in order
  """
  As a reader facing an advanced document,
  I want the chain of documents I should read first, in order,
  so that I am not blocked by concepts the document assumes I already know.
  """
  # Source: cli/src/commands/prereqs.ts

  @happy-path @mvp
  Scenario: Get the reading order for a document with a prerequisite chain
    Given a document requires another document, which itself requires a third
    When I ask for the prerequisites of the first
    Then I am shown the prerequisites numbered in the order I should read them
    And the deepest prerequisite comes first
    And I am told to read the document I asked about last

  @edge-case
  Scenario: A document with no prerequisites
    Given a document declares no prerequisites
    When I ask for its prerequisites
    Then I am told it has no prerequisites

  @edge-case
  Scenario: A prerequisite shared by two branches is read once
    Given two prerequisites of a document both require the same third document
    When I ask for the prerequisites
    Then that third document appears once in the reading order
    And it comes before both documents that require it

  @edge-case
  Scenario: Only prerequisite relationships are followed
    Given a document teaches one document and requires another
    When I ask for its prerequisites
    Then only the required document is part of the chain

  @edge-case
  Scenario: A circular prerequisite chain is reported rather than followed forever
    # Source: cli/src/commands/prereqs.ts
    Given two documents require each other
    When I ask for the prerequisites of one of them
    Then I am still given a reading order
    And I am warned that a circular prerequisite dependency was detected in the chain

  @edge-case
  Scenario: A prerequisite outside the set is skipped
    Given a document requires a path that is not part of the set
    When I ask for its prerequisites
    Then that path is not part of the reading order

  @error
  Scenario: The document is not part of the set
    Given "docs/nope.md" is not part of the documentation set
    When I ask for its prerequisites
    Then I am told the document was not found in the graph, naming it
    And the request exits unsuccessfully

  @happy-path
  Scenario: Take the chain as data
    When I ask for a document's prerequisites in machine-readable form
    Then I receive the document I asked about, the chain in reading order with each title, and whether a circular dependency was found

# ═══════════════════════════════════════════════════════════════════════════

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

# ═══════════════════════════════════════════════════════════════════════════

@flow-14 @human-author @lifecycle @mvp
Feature: FLOW-14 Re-verify documents in bulk
  """
  As a documentation author who has just reviewed a batch of documents,
  I want to record that they were verified today, one by one or by the whole batch,
  so that freshness reflects the review I actually did without editing each file by hand.
  """
  # Source: cli/src/commands/bump.ts

  @happy-path @mvp
  Scenario: Re-verify a single document
    Given "docs/reference/metadata-schema.md" was last verified months ago
    When I record that document as verified
    Then I am shown its verification date moving from the old date to now
    And it is reported as fresh from now on

  @happy-path
  Scenario: Re-verify the entire set
    Given a set of documents with mixed verification dates
    When I record the whole set as verified
    Then every document carrying DEP metadata is re-verified
    And I am told how many documents were updated

  @happy-path
  Scenario Outline: Re-verify only part of the set
    # Source: cli/src/commands/bump.ts
    Given a set whose documents vary in type, freshness, owner, confidence, audience and tags
    When I record as verified only the documents whose "<dimension>" is "<value>"
    Then only documents carrying that "<dimension>" are re-verified
    And the rest keep their previous verification date

    Examples:
      | dimension  | value      |
      | type       | reference  |
      | lifecycle  | STALE      |
      | owner      | @dep-core  |
      | confidence | low        |
      | audience   | ai-agent   |
      | tag        | cli        |

  @happy-path
  Scenario: Re-verify documents matching a path pattern
    Given the set holds documents under several directories
    When I record as verified the documents matching a path pattern
    Then only documents whose path matches the pattern are re-verified

  @happy-path
  Scenario: Preview a bulk re-verification
    When I preview re-verifying the whole set
    Then I am told no files were modified
    And I am shown, for each document, the date it would move from and to
    And I am told how many documents would be updated

  @edge-case
  Scenario: Every document gets the same verification moment
    # Source: cli/src/commands/bump.ts
    When I record several documents as verified in one request
    Then every one of them records the same verification moment

  @edge-case
  Scenario: Nothing matches the narrowing
    Given no document in the set is stale
    When I record as verified only the stale documents
    Then I am told no matching documents were found
    And nothing is modified

  @edge-case
  Scenario: Files that are not DEP documents are skipped, not failed
    Given the documentation root also holds a markdown file with no DEP metadata
    When I record the whole set as verified
    Then that file is reported as skipped for having no DEP metadata
    And every DEP document is still re-verified

  @validation
  Scenario: Name neither a document nor the whole set
    When I ask to record verification without naming a document or the whole set
    Then I am shown how to name a document, a pattern or the whole set
    And the request exits unsuccessfully

  @happy-path
  Scenario: Take the outcome as data
    When I record the whole set as verified in machine-readable form
    Then I receive each updated document with its old and new verification date, and the list of skipped files

# ═══════════════════════════════════════════════════════════════════════════

@flow-15 @human-author @metadata @should
Feature: FLOW-15 Curate a document's tags
  """
  As a documentation author organising a growing set,
  I want to add and remove tags on a document in one request,
  so that the set stays searchable by subject without me editing metadata by hand.
  """
  # Source: cli/src/commands/tag.ts

  @happy-path @mvp
  Scenario: Add a tag
    Given a document tagged "metadata"
    When I add the tag "cli" to it
    Then I am shown "cli" as added
    And I am shown the document's full tag list afterwards
    And the document is tagged "metadata" and "cli"

  @happy-path
  Scenario: Add and remove tags in the same request
    Given a document tagged "draft" and "metadata"
    When I add "cli" and remove "draft"
    Then I am shown "cli" as added and "draft" as removed
    And the document is tagged "metadata" and "cli"

  @happy-path
  Scenario: Add several tags at once
    When I add the tags "cli" and "tools" in one request
    Then both are shown as added
    And both are recorded on the document

  @edge-case
  Scenario: Adding a tag the document already carries
    # Source: cli/src/commands/tag.ts
    Given a document already tagged "cli"
    When I add the tag "cli"
    Then I am warned that the tag is already present
    And the document's tags are unchanged

  @edge-case
  Scenario: Removing a tag the document does not carry
    Given a document that is not tagged "draft"
    When I remove the tag "draft"
    Then I am warned that the tag was not found
    And the document's tags are unchanged

  @edge-case
  Scenario: Tagging a document that carries no tags yet
    Given a document that declares no tags
    When I add the tag "cli"
    Then the document is tagged "cli"

  @edge-case
  Scenario: Tag order reflects the order tags were added
    Given a document tagged "metadata"
    When I add "cli" and then "tools" in one request
    Then the document's tags are listed as "metadata", "cli", "tools"

  @validation
  Scenario: Ask to curate tags without saying what to change
    When I ask to curate a document's tags without naming a tag to add or remove
    Then I am shown how to name tags to add or remove, with an example
    And the request exits unsuccessfully

  @error
  Scenario: The file is not a DEP document
    Given a markdown file with no DEP metadata
    When I add a tag to it
    Then I am told it carries no DEP metadata, naming the file
    And the request exits unsuccessfully

  @happy-path
  Scenario: Take the outcome as data
    When I curate a document's tags in machine-readable form
    Then I receive the document path, its resulting tags, what was added, what was removed and any warnings

# ═══════════════════════════════════════════════════════════════════════════

@flow-16 @human-author @graph @mvp
Feature: FLOW-16 Declare how documents relate
  """
  As a documentation author connecting a new document to the set,
  I want to declare, retype and remove typed relationships between documents,
  so that the graph stays navigable and only the six canonical relationships are used.
  """
  # Source: cli/src/commands/link.ts
  # Spec: seed.md

  @happy-path @mvp
  Scenario: Declare a relationship to another document
    Given "docs/reference/metadata-schema.md" declares no relationships
    When I declare that it teaches "docs/reference/types.md"
    Then I am shown the relationship as added, with its target and relationship name
    And I am told how many relationships the document now declares
    And the document declares that relationship

  @happy-path
  Scenario Outline: Use any canonical relationship
    # Source: cli/src/writer.ts
    When I declare a relationship of "<rel>" to another document
    Then the relationship is recorded as "<rel>"

    Examples:
      | rel      |
      | TEACHES  |
      | USES     |
      | EXPLAINS |
      | DECIDES  |
      | REQUIRES |
      | NEXT     |

  @happy-path
  Scenario: Retype an existing relationship
    # Source: cli/src/commands/link.ts
    Given a document declares that it teaches another document
    When I declare that it requires that same document
    Then I am shown the relationship as updated
    And the document declares one relationship to that target, of the new kind

  @happy-path
  Scenario: Remove a relationship
    Given a document declares a relationship to another document
    When I remove the relationship to that document
    Then I am shown the relationship as removed
    And I am told how many relationships remain
    And the document no longer declares it

  @happy-path
  Scenario: Accept a relationship the project defines for itself
    Given the project declares its own relationship name
    When I declare a relationship using that name
    Then the relationship is recorded

  @validation
  Scenario: Refuse a relationship name that is not allowed
    # Source: cli/src/writer.ts
    When I declare a relationship of "MENTIONS" to another document
    Then I am told the relationship is invalid and which relationships are allowed
    And the document is left unchanged
    And the request exits unsuccessfully

  @validation
  Scenario: Declare a relationship without saying what kind
    When I declare a relationship to a target without naming its kind
    Then I am told the kind is required and which kinds are valid
    And the request exits unsuccessfully

  @validation
  Scenario: Declare a relationship without a target
    When I ask to change a document's relationships without naming a target
    Then I am shown how to name a target and a kind, with an example
    And the request exits unsuccessfully

  @edge-case
  Scenario: Declare a relationship that already exists exactly
    # Source: cli/src/commands/link.ts
    Given a document already declares that it teaches another document
    When I declare that same relationship again
    Then I am told the relationship already exists
    And the request exits unsuccessfully

  @edge-case
  Scenario: Remove a relationship that was never declared
    Given a document declares no relationship to "docs/reference/types.md"
    When I remove the relationship to that document
    Then I am told no such relationship was found, naming the document and the target
    And the request exits unsuccessfully

  @edge-case
  Scenario: A declared relationship shows up in the graph immediately
    Given I declare that one document requires another
    When I ask what points at the target document
    Then the source document is listed under the prerequisite relationship

  @error
  Scenario: The file is not a DEP document
    Given a markdown file with no DEP metadata
    When I declare a relationship on it
    Then I am told it carries no DEP metadata, naming the file
    And the request exits unsuccessfully

  @happy-path
  Scenario: Take the outcome as data
    When I declare a relationship in machine-readable form
    Then I receive the document path, whether the relationship was added, updated or removed, and the document's resulting relationships

# ═══════════════════════════════════════════════════════════════════════════

@flow-17 @ai-generator @indexing @should
Feature: FLOW-17 Regenerate the index documents
  """
  As a documentation generator maintaining a set,
  I want index documents to be produced from the set's own metadata,
  so that readers always have an up-to-date way in and nobody maintains link lists by hand.
  """
  # Source: cli/src/commands/index-gen.ts
  # Spec: .docspec

  @happy-path @mvp
  Scenario: Produce one index per document type directory
    Given the project maps each document type to its own directory
    And each of those directories holds documents
    When I ask for the index documents to be regenerated
    Then an index is written into each of those directories
    And I am told which index documents were updated
    And each entry names its document, its freshness, its confidence and its audiences

  @happy-path @mvp
  Scenario: Produce the root index
    Given the project declares several audiences and holds documents of several types
    When I ask for the index documents to be regenerated
    Then a root index is written into the documentation root
    And it lists, for each audience, that audience's entry point and the documents meant for it
    And it lists the documents grouped by type

  @happy-path
  Scenario: Preview what would be written
    When I preview regenerating the index documents
    Then I am told which index documents would be written
    And nothing is written

  @happy-path
  Scenario: Take the generated indexes as data
    When I ask for the index documents in machine-readable form
    Then I receive each index document's path and its full content
    And nothing is written

  @edge-case
  Scenario: A type directory with no documents gets no index
    Given the project maps a document type to a directory that holds no documents
    When I ask for the index documents to be regenerated
    Then no index is written into that directory

  @edge-case
  Scenario: Index documents do not list themselves
    Given a directory that already holds an index document
    When I ask for the index documents to be regenerated
    Then that index does not list itself as an entry

  @edge-case
  Scenario: A regenerated index is recognisable as generated
    When I ask for the index documents to be regenerated
    Then each directory index is marked as automatically generated

  @edge-case
  Scenario: Regenerating twice produces the same result
    Given the index documents have just been regenerated and nothing else has changed
    When I ask for them to be regenerated again
    Then their content is unchanged apart from the moment of generation

  @edge-case
  Scenario: A generated index keeps the set reachable
    Given a document is listed only by a generated index
    When I ask for validation
    Then that document is not reported as unreachable

  @edge-case @wip @later
  Scenario: Index documents are correct when I am not standing at the project root
    # Note: assumed behaviour — titles and relative paths in the generated indexes are currently
    #       resolved against the current location rather than the project root. See Open questions.
    Given I am not standing at the project root
    When I ask for the index documents of that project to be regenerated
    Then every entry shows the document's real title
    And every link is relative to the index document that holds it

# ═══════════════════════════════════════════════════════════════════════════

@flow-18 @ai-agent @dap @mvp
Feature: FLOW-18 Resolve a request to a decision tree
  """
  As an AI agent receiving a request in the user's own words,
  I want to find out whether a decision tree already covers that request and how strong the match is,
  so that I follow the project's own procedure instead of improvising one.
  """
  # Source: cli/src/dap/commands/resolve.ts
  # Spec: dap/dap-seed.md

  @happy-path @mvp
  Scenario: Match a request to the tree that covers it
    Given the project declares a tree triggered by "validate DEP documentation and fix issues"
    When I ask which tree covers "validate DEP documentation and fix issues"
    Then that tree is returned as the strongest match
    And I am shown its identifier, its trigger, the node to start at and where the tree lives

  @happy-path
  Scenario Outline: The strength of a match reflects how it was recognised
    # Source: cli/src/dap/commands/resolve.ts
    Given a tree triggered by "validate DEP documentation and fix issues"
    And that tree also declares the phrase "validate documentation" and the intent "validate_docs"
    When I ask which tree covers "<request>"
    Then the match is reported with a strength of "<strength>"

    Examples:
      | request                                  | strength |
      | validate DEP documentation and fix issues | 100      |
      | validate_docs                            | 95       |
      | validate documentation                   | 90       |
      | validate DEP documentation               | 80       |

  @happy-path
  Scenario: Match on a partial phrasing of my own
    Given a tree triggered by "documentation may be out of date"
    When I ask which tree covers "my documentation is out of date"
    Then that tree is returned with a strength reflecting how much of my request it recognised

  @happy-path
  Scenario: Several trees can match, strongest first
    Given more than one tree recognises part of my request
    When I ask which tree covers it
    Then every matching tree is returned
    And they are ordered from strongest to weakest match

  @edge-case
  Scenario: Wording is matched regardless of case
    When I ask which tree covers "VALIDATE DOCUMENTATION"
    Then the tree triggered by that phrase is returned

  @edge-case
  Scenario: No tree covers the request
    Given no tree recognises anything in my request
    When I ask which tree covers "book me a flight"
    Then I am told no trees match that request

  @happy-path
  Scenario: Take the matches as data
    When I ask which tree covers a request, in machine-readable form
    Then I receive my request and each match with its identifier, trigger, starting node, strength and location

  @edge-case @wip @later
  Scenario: A tree that declares no subjects is still matchable
    # Note: assumed behaviour — subject matching currently assumes every tree declares subjects.
    #       See Open questions.
    Given a tree that declares a trigger but no subjects
    When I ask which tree covers that trigger
    Then that tree is returned as a match

# ═══════════════════════════════════════════════════════════════════════════

@flow-19 @ai-agent @dap @mvp
Feature: FLOW-19 Traverse a decision tree one node at a time
  """
  As an AI agent following a project's procedure,
  I want to be handed one decision node at a time with only what that node needs,
  so that I act on the project's actual logic without loading the whole procedure into context.
  """
  # Source: cli/src/dap/commands/node.ts
  # Source: cli/src/dap/output.ts
  # Spec: dap/trees/validate-and-fix.md

  @happy-path @mvp
  Scenario: Load the starting node of a tree
    Given the tree "validate-and-fix" starts at the node "run-validation"
    When I ask for that node of that tree
    Then I am given only that node
    And I am shown what kind of node it is
    And I am shown what it asks me to do and what it expects to learn
    And I am told which node to load next

  @happy-path
  Scenario Outline: Each kind of node tells me what it needs
    # Source: cli/src/dap/output.ts
    When I ask for a node of kind "<kind>"
    Then it is marked with "<mark>"
    And I am shown "<what_i_am_given>"

    Examples:
      | kind     | mark | what_i_am_given                                                     |
      | observe  | [?]  | how to gather the information, what to gather it with, and what it yields |
      | decide   | [>]  | each condition and the node to go to when it holds                  |
      | act      | [!]  | what kind of action to take, its details, and whether the tree ends here |
      | delegate | [@]  | which tree takes over, what context travels with it, and where control returns |

  @happy-path
  Scenario: A branching node always offers a fallback
    # Source: dap/trees/validate-and-fix.md
    Given a branching node in a tree
    When I ask for that node
    Then its last condition is the fallback that holds when no other condition does

  @happy-path @security
  Scenario: A node that needs a human decision stops the traversal
    # Source: dap/trees/validate-and-fix.md
    Given a node that gathers its information from a human
    When I ask for that node
    Then I am given the question to put to the human and the choices they may pick from
    And I am told what the answer will be called and which node to load next
    And I do not continue past that node until the human has answered

  @happy-path
  Scenario: Follow a whole procedure to its end
    Given I have loaded the starting node of "validate-and-fix"
    When I keep loading the node each answered node points me to
    Then I eventually reach a node that ends the tree
    And every node I acted on was one the previous node pointed me to

  @edge-case
  Scenario: A delegating node hands over to another tree
    Given a node that delegates to another tree
    When I ask for that node
    Then I am told which tree takes over
    And I am told whether control returns to this tree and where

  @validation
  Scenario: Ask for a tree that does not exist
    # Source: cli/src/dap/commands/node.ts
    When I ask for a node of the tree "make-coffee"
    Then I am told that tree was not found
    And I am told which trees do exist
    And the request exits unsuccessfully

  @validation
  Scenario: Ask for a node the tree does not hold
    When I ask for the node "brew" of the tree "validate-and-fix"
    Then I am told that node was not found in that tree, naming both
    And I am told which nodes that tree does hold
    And the request exits unsuccessfully

  @happy-path
  Scenario: Take a node as data
    When I ask for a node in machine-readable form
    Then I receive the tree it belongs to and the node with its identifier, kind, description and every field it declares

# ═══════════════════════════════════════════════════════════════════════════

@flow-20 @human-author @dap @should
Feature: FLOW-20 Visualise a decision tree
  """
  As an author reviewing a project's procedures,
  I want to see a whole decision tree at once, and the list of routes through it,
  so that I can judge whether the procedure is complete before an agent follows it.
  """
  # Source: cli/src/dap/commands/trace.ts
  # Source: cli/src/dap/output.ts

  @happy-path @mvp
  Scenario: See a tree from its starting node outwards
    Given the tree "validate-and-fix"
    When I ask to see that tree
    Then I am shown its nodes as a hierarchy starting from its starting node
    And each node is marked with its kind
    And each branch is labelled with the condition that leads down it
    And nodes that end the tree are shown at the ends of the branches

  @happy-path
  Scenario: Node details are shown inline
    # Source: cli/src/dap/output.ts
    Given a tree whose nodes gather information, delegate, and take action
    When I ask to see that tree
    Then a node that gathers information shows how it gathers it
    And a node that delegates shows which tree it delegates to
    And a node that acts shows what it acts with

  @happy-path
  Scenario: See every route through the tree
    When I ask to see a tree in machine-readable form
    Then I receive the tree's starting node, how many nodes it holds, and every route from the start to an end

  @edge-case
  Scenario: A route that loops back is marked rather than followed forever
    # Source: cli/src/dap/output.ts
    Given a tree where a revision branch returns to an earlier node
    When I ask to see that tree
    Then the returning branch is marked as a loop back to that node
    And the drawing terminates

  @edge-case
  Scenario: A branch pointing at a node that does not exist is marked
    Given a tree where a branch points at a node the tree does not hold
    When I ask to see that tree
    Then that branch is shown as missing

  @edge-case
  Scenario: The starting node does not exist
    Given a tree whose declared starting node is not among its nodes
    When I ask to see that tree
    Then I am told the starting node was not found, naming it

  @validation
  Scenario: Ask to see a tree that does not exist
    When I ask to see the tree "make-coffee"
    Then I am told that tree was not found
    And I am told which trees do exist
    And the request exits unsuccessfully

# ═══════════════════════════════════════════════════════════════════════════

@flow-21 @human-author @dap @mvp
Feature: FLOW-21 Validate the decision trees
  """
  As an author who owns a project's procedures,
  I want each tree checked for reachability, complete branching, and a defined ending on every route,
  so that an agent following a tree can never fall off the end of it.
  """
  # Source: cli/src/dap/commands/validate.ts

  @happy-path @mvp
  Scenario: A sound set of trees passes
    Given every tree declares complete metadata, a starting node that exists, and reaches an ending on every route
    And no two trees claim the same trigger and no tree delegates in a circle
    When I ask for the trees to be validated
    Then I am told how many trees were checked and how many passed, warned and failed
    And every tree is reported as passing
    And the request exits successfully

  @validation @mvp
  Scenario Outline: Reject a tree that an agent could not follow
    # Source: cli/src/dap/commands/validate.ts
    Given a tree that has "<defect>"
    When I ask for the trees to be validated
    Then that tree is reported as failing
    And I am told "<told>"
    And the request exits unsuccessfully

    Examples:
      | defect                                              | told                                        |
      | a starting node that is not among its nodes         | the starting node was not found in the tree |
      | a node no route from the start reaches              | which nodes are unreachable                 |
      | a route that ends without an ending or a delegation | which nodes are dead ends                   |
      | a branching node with no fallback condition         | which branching node has no fallback        |
      | missing metadata                                    | which metadata fields are missing           |
      | an invalid confidence                               | that the confidence is invalid              |

  @validation
  Scenario Outline: Reject a node that does not declare what its kind requires
    # Source: cli/src/dap/commands/validate.ts
    Given a node of kind "<kind>" that does not declare "<missing>"
    When I ask for the trees to be validated
    Then that tree is reported as failing
    And I am told which node is incomplete and what it is missing

    Examples:
      | kind     | missing                       |
      | observe  | how it gathers information    |
      | observe  | what it yields                |
      | decide   | its conditions                |
      | act      | what kind of action it takes  |
      | delegate | which tree it delegates to    |

  @edge-case
  Scenario: A revision loop is allowed, a true cycle is not
    # Source: cli/src/dap/commands/validate.ts
    Given a tree where a route returns to an earlier node through a branching node that also has a way out
    When I ask for the trees to be validated
    Then that tree is not reported as failing for being cyclic
    And I am told how many revision loops were found and that they are allowed

  @validation
  Scenario: Reject a true cycle with no way out
    Given a tree where a route returns to an earlier node with no branch leaving the loop
    When I ask for the trees to be validated
    Then that tree is reported as failing
    And I am shown the looping route
    And the request exits unsuccessfully

  @validation
  Scenario: Reject two trees that claim the same trigger
    # Source: cli/src/dap/commands/validate.ts
    Given two trees declare the same trigger
    When I ask for the trees to be validated
    Then the set-wide check on trigger uniqueness is reported as failing
    And I am told which trigger is claimed by which trees
    And the request exits unsuccessfully

  @validation
  Scenario: Reject trees that delegate to each other in a circle
    Given two trees each delegate to the other
    When I ask for the trees to be validated
    Then the set-wide check on delegation cycles is reported as failing
    And I am shown the circle
    And the request exits unsuccessfully

  @edge-case
  Scenario: A missing documentation reference warns rather than fails
    # Source: cli/src/dap/commands/validate.ts
    Given the project resolves documentation references from its trees
    And a node refers to a document that does not exist
    When I ask for the trees to be validated
    Then that tree is reported as warning rather than failing
    And I am told which reference could not be found and where it was looked for
    And the request exits successfully

  @edge-case @lifecycle
  Scenario: A tree past its review cadence warns rather than fails
    Given a tree last verified more than twice its review cadence ago
    When I ask for the trees to be validated
    Then it is reported as warning
    And I am told the tree exceeds its review cadence
    And the request exits successfully

  @happy-path
  Scenario: Take the verdict as data
    When I ask for the trees to be validated in machine-readable form
    Then I receive one entry per tree with its verdict and every individual check, plus the set-wide checks

# ═══════════════════════════════════════════════════════════════════════════

@flow-22 @human-author @dap @could
Feature: FLOW-22 See how the procedures hand off to each other
  """
  As an author reviewing a project's procedures as a whole,
  I want to see every tree, its size and freshness, and which trees hand off to which,
  so that I can spot procedures that are unreachable, oversized or circular.
  """
  # Source: cli/src/dap/commands/graph.ts
  # Source: cli/src/dap/output.ts

  @happy-path @mvp
  Scenario: See every tree and its hand-offs
    Given a project with several trees, some of which delegate to others
    When I ask how the procedures relate
    Then each tree is shown with its freshness, how many nodes it holds and its confidence
    And each hand-off is shown beneath the tree that makes it, naming the tree it goes to
    And I am told how many trees, hand-offs and circles were found

  @edge-case
  Scenario: A tree that hands off to nobody
    Given a tree that delegates to no other tree
    When I ask how the procedures relate
    Then it is listed with no hand-offs beneath it

  @edge-case
  Scenario: Circular hand-offs are called out
    Given two trees that delegate to each other
    When I ask how the procedures relate
    Then the circle is listed as a chain of tree identifiers
    And the count of circles includes it

  @edge-case
  Scenario: A hand-off to a tree that does not exist
    Given a tree that delegates to a tree the project does not hold
    When I ask how the procedures relate
    Then the hand-off is still shown, naming the tree it points at

  @happy-path
  Scenario: Take the relationships as data
    When I ask how the procedures relate, in machine-readable form
    Then I receive each tree with its location, trigger, node count, freshness and confidence
    And I receive each hand-off as a pair of trees, plus any circles

# ═══════════════════════════════════════════════════════════════════════════

@flow-23 @ai-agent @plugin @should
Feature: FLOW-23 Work with DEP through the agent skills
  """
  As an AI agent installed in a project as the DEP plugin,
  I want validation, generation, auditing and syncing offered as named capabilities that run the project's own procedures,
  so that a user gets the project's documented behaviour without describing the protocol to me first.
  """
  # Source: .claude-plugin/plugin.json
  # Source: skills/dep-validate/SKILL.md
  # Spec: CLAUDE.md

  @happy-path @mvp
  Scenario Outline: Each offered capability runs the procedure that covers it
    # Source: skills/dep-validate/SKILL.md
    Given the DEP plugin is installed in the project
    When the user asks for "<capability>"
    Then the procedure "<tree>" is resolved for that request
    And I follow that procedure one node at a time rather than improvising

    Examples:
      | capability            | tree                 |
      | dep-validate          | validate-and-fix     |
      | dep-generate          | generate-doc-set     |
      | dep-audit             | audit-existing-docs  |
      | dep-sync              | sync-stale-docs      |

  @happy-path
  Scenario: Install the plugin from the marketplace
    Given the project publishes a plugin marketplace
    When the user adds that marketplace and installs the DEP plugin
    Then the four DEP capabilities become available to them

  @happy-path
  Scenario: Make the toolchain available before doing any work
    # Source: skills/dep-validate/SKILL.md
    Given the dep CLI is not reachable in the environment
    When the user asks for a DEP capability
    Then the CLI is installed and made reachable before any documentation work begins

  @happy-path
  Scenario: Record DEP as active in the project on first use
    # Source: skills/dep-validate/SKILL.md
    Given the project's agent instructions do not yet record DEP as active
    When the user asks for a DEP capability for the first time
    Then the project's agent instructions are extended to record DEP and DAP as active
    And later sessions in that project use DEP without being asked to

  @edge-case
  Scenario: Already-active projects are not re-bootstrapped
    Given the project's agent instructions already record DEP as active
    When the user asks for a DEP capability
    Then the instructions are left unchanged

  @happy-path @security
  Scenario: A capability stops for a human decision when its procedure says to
    Given a procedure reaches a node that needs a human decision
    When I am following that procedure on the user's behalf
    Then I put the question and its choices to the user
    And I wait for their answer before continuing

  @happy-path
  Scenario: Report findings without changing documents unless asked
    # Source: skills/dep-validate/SKILL.md
    Given the user asked for validation and nothing more
    When the procedure surfaces failures and warnings
    Then I report them, separating structural failures from best-practice warnings
    And I do not modify any document

  @happy-path
  Scenario: Judgements no tool can make are reported alongside the tool's verdict
    # Source: skills/dep-validate/SKILL.md
    Given a document whose declared type does not match how its body is written
    When the user asks for validation
    Then the mismatch is reported as a type-purity finding
    And it is reported alongside the checks the toolchain performed

  @edge-case
  Scenario: A project that is not configured for DEP
    Given the project holds no DEP configuration
    When the user asks for validation
    Then I report that audience and freshness checks cannot run without it

  @edge-case
  Scenario: Metadata is never edited by hand
    # Source: skills/dep-validate/SKILL.md
    Given a document's metadata has to change to satisfy a procedure
    When I apply that change
    Then it is applied through the toolchain's metadata capabilities rather than by editing the document's frontmatter
```

## Open questions

Behaviours below were assumed while writing these stories, or are known deviations between the
stories and today's code. Each is tagged `@wip @later` in the scenario that depends on it.

1. **Unconfigured project has no readable error** (FLOW-02) — a project root with no `.docspec`
   produces an unhandled file-read failure rather than a message naming the missing file.
   Source: `cli/src/config.ts`.
2. **Narrowing a meaning-based search is applied after retrieval** (FLOW-08) — the twenty closest
   passages are retrieved first and the type/audience filter is applied to those, so a matching
   document ranked below that cut is never returned. Should filtering happen before retrieval, or
   should the retrieval depth grow when a filter is present? Source: `cli/src/commands/search.ts`.
3. **Generated index documents resolve titles and links against the current location** (FLOW-17) —
   index generation reads titles relative to where the request was made and writes root-index links
   against a hard-coded `docs` prefix, so regenerating from outside the project root, or in a project
   whose documentation root is not `docs`, produces wrong titles and links. The root index also
   carries a hard-coded creation date. Source: `cli/src/commands/index-gen.ts`.
4. **Link targets are resolved against the current location** (FLOW-03, FLOW-09) — relationship
   targets are made relative to where the request was made rather than to the project root, so the
   graph can come out differently depending on where the request is made from.
   Source: `cli/src/parser.ts`.
5. **Trees that declare no subjects** (FLOW-18) — subject matching assumes every tree declares
   subjects; a tree without them may not be matchable. Should subjects be required, or optional?
   Source: `cli/src/dap/commands/resolve.ts`.
6. **Skill documentation names a command form that does not exist** (FLOW-23) — the packaged skills
   instruct the agent to run `dep dep dap resolve` and `dep dep dap node`; the real forms are
   `dep dap resolve` and `dep dap node`. Should the skills be corrected, or should the doubled form
   be accepted? Source: `skills/dep-validate/SKILL.md`.
7. **Freshness of a decision tree uses one cadence for all trees** (FLOW-21) — documents get a
   review cadence per type, trees get a single project-wide cadence. Intentional?
   Source: `dap/.dapspec`, `cli/src/dap/tree-builder.ts`.
8. **Behaviours deliberately left out** — no scenarios were written for output that carries no
   observable verdict: the colour palette used in graph drawings, the exact glyphs used for
   freshness, and the progress counter shown while indexing.
