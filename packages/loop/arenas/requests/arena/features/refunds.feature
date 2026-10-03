@play @area-refunds
Feature: Handling refunds requests

  @happy-path
  Scenario Outline: A refunds request is handled
    Given a <size> request in <currency> from a <tier> customer
    When the request is handled under this scenario's policy
    Then the request is <outcome>

    Examples:
      | size   | currency | tier     | outcome   |
      | small  | GBP      | new      | converted |
      | small  | JPY      | silver   | converted |
      | medium | EUR      | platinum | converted |
      | medium | JPY      | platinum | converted |
      | medium | GBP      | platinum | converted |
      | small  | USD      | new      | pending   |
      | medium | JPY      | new      | converted |
      | large  | USD      | silver   | accepted  |
      | medium | USD      | silver   | accepted  |
      | large  | GBP      | new      | refused   |
      | small  | GBP      | platinum | converted |
      | large  | GBP      | platinum | converted |

  @edge-case
  Scenario Outline: A refunds request at the edge of policy is handled
    Given a <size> request in <currency> from a <tier> customer
    When the request is handled under this scenario's policy
    Then the request is <outcome>

    Examples:
      | size   | currency | tier     | outcome   |
      | medium | EUR      | new      | converted |
      | large  | USD      | silver   | accepted  |
      | medium | GBP      | gold     | converted |
      | medium | GBP      | platinum | converted |
      | large  | USD      | gold     | accepted  |
      | small  | JPY      | gold     | converted |
      | small  | GBP      | gold     | converted |
      | small  | EUR      | new      | converted |
      | large  | JPY      | new      | refused   |
      | small  | JPY      | new      | converted |
      | large  | GBP      | new      | refused   |
      | small  | EUR      | gold     | converted |

  @validation
  Scenario: A refunds request with no amount is refused
    Given a request with no amount
    When the request is handled under this scenario's policy
    Then the request is refused
