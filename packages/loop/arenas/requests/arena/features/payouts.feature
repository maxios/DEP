@play @area-payouts
Feature: Handling payouts requests

  @happy-path
  Scenario Outline: A payouts request is handled
    Given a <size> request in <currency> from a <tier> customer
    When the request is handled under this scenario's policy
    Then the request is <outcome>

    Examples:
      | size   | currency | tier     | outcome   |
      | medium | EUR      | new      | converted |
      | medium | GBP      | gold     | converted |
      | medium | USD      | platinum | accepted  |
      | medium | USD      | silver   | accepted  |
      | medium | GBP      | new      | converted |
      | medium | JPY      | platinum | converted |
      | small  | JPY      | gold     | converted |
      | small  | EUR      | platinum | converted |
      | large  | GBP      | platinum | converted |
      | small  | USD      | platinum | accepted  |
      | large  | GBP      | new      | refused   |
      | medium | EUR      | silver   | converted |

  @edge-case
  Scenario Outline: A payouts request at the edge of policy is handled
    Given a <size> request in <currency> from a <tier> customer
    When the request is handled under this scenario's policy
    Then the request is <outcome>

    Examples:
      | size   | currency | tier     | outcome   |
      | medium | USD      | new      | pending   |
      | small  | GBP      | gold     | converted |
      | large  | JPY      | new      | refused   |
      | large  | JPY      | silver   | converted |
      | medium | GBP      | silver   | converted |
      | large  | GBP      | new      | refused   |
      | medium | USD      | platinum | accepted  |
      | large  | JPY      | platinum | converted |
      | large  | JPY      | gold     | converted |
      | small  | EUR      | silver   | converted |
      | small  | JPY      | gold     | converted |
      | large  | GBP      | gold     | converted |

  @validation
  Scenario: A payouts request with no amount is refused
    Given a request with no amount
    When the request is handled under this scenario's policy
    Then the request is refused
