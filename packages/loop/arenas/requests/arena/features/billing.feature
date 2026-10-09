@play @area-billing
Feature: Handling billing requests

  @happy-path
  Scenario Outline: A billing request is handled
    Given a <size> request in <currency> from a <tier> customer
    When the request is handled under this scenario's policy
    Then the request is <outcome>

    Examples:
      | size   | currency | tier     | outcome   |
      | large  | EUR      | gold     | converted |
      | large  | EUR      | platinum | converted |
      | medium | JPY      | platinum | converted |
      | large  | GBP      | gold     | converted |
      | small  | USD      | new      | pending   |
      | medium | USD      | platinum | accepted  |
      | small  | JPY      | silver   | converted |
      | small  | EUR      | silver   | converted |
      | large  | USD      | platinum | accepted  |
      | large  | USD      | new      | refused   |
      | medium | JPY      | new      | converted |
      | small  | GBP      | new      | converted |

  @edge-case
  Scenario Outline: A billing request at the edge of policy is handled
    Given a <size> request in <currency> from a <tier> customer
    When the request is handled under this scenario's policy
    Then the request is <outcome>

    Examples:
      | size   | currency | tier     | outcome   |
      | small  | EUR      | gold     | converted |
      | small  | JPY      | silver   | converted |
      | small  | EUR      | silver   | converted |
      | medium | USD      | silver   | accepted  |
      | large  | USD      | new      | refused   |
      | large  | JPY      | gold     | converted |
      | medium | JPY      | silver   | converted |
      | large  | GBP      | new      | refused   |
      | large  | USD      | silver   | accepted  |
      | medium | USD      | new      | pending   |
      | small  | EUR      | platinum | converted |
      | small  | USD      | platinum | accepted  |

  @validation
  Scenario: A billing request with no amount is refused
    Given a request with no amount
    When the request is handled under this scenario's policy
    Then the request is refused
