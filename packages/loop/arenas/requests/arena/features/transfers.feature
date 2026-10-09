@play @area-transfers
Feature: Handling transfers requests

  @happy-path
  Scenario Outline: A transfers request is handled
    Given a <size> request in <currency> from a <tier> customer
    When the request is handled under this scenario's policy
    Then the request is <outcome>

    Examples:
      | size   | currency | tier     | outcome   |
      | medium | USD      | new      | pending   |
      | small  | GBP      | gold     | converted |
      | large  | JPY      | new      | refused   |
      | large  | JPY      | gold     | converted |
      | large  | GBP      | new      | refused   |
      | large  | JPY      | silver   | converted |
      | small  | GBP      | new      | converted |
      | medium | USD      | platinum | accepted  |
      | medium | EUR      | silver   | converted |
      | small  | JPY      | new      | converted |
      | medium | USD      | silver   | accepted  |
      | large  | EUR      | gold     | converted |

  @edge-case
  Scenario Outline: A transfers request at the edge of policy is handled
    Given a <size> request in <currency> from a <tier> customer
    When the request is handled under this scenario's policy
    Then the request is <outcome>

    Examples:
      | size   | currency | tier     | outcome   |
      | large  | GBP      | silver   | converted |
      | small  | GBP      | platinum | converted |
      | small  | EUR      | new      | converted |
      | medium | EUR      | silver   | converted |
      | small  | EUR      | platinum | converted |
      | small  | USD      | silver   | accepted  |
      | small  | USD      | gold     | accepted  |
      | medium | JPY      | silver   | converted |
      | small  | USD      | new      | pending   |
      | large  | EUR      | gold     | converted |
      | small  | GBP      | new      | converted |
      | small  | JPY      | silver   | converted |

  @validation
  Scenario: A transfers request with no amount is refused
    Given a request with no amount
    When the request is handled under this scenario's policy
    Then the request is refused
