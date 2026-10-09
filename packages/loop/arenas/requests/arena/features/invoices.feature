@play @area-invoices
Feature: Handling invoices requests

  @happy-path
  Scenario Outline: A invoices request is handled
    Given a <size> request in <currency> from a <tier> customer
    When the request is handled under this scenario's policy
    Then the request is <outcome>

    Examples:
      | size   | currency | tier     | outcome   |
      | large  | EUR      | new      | refused   |
      | large  | USD      | gold     | accepted  |
      | medium | EUR      | platinum | converted |
      | large  | GBP      | silver   | converted |
      | medium | EUR      | new      | converted |
      | medium | GBP      | platinum | converted |
      | small  | EUR      | gold     | converted |
      | medium | USD      | new      | pending   |
      | large  | GBP      | platinum | converted |
      | small  | JPY      | platinum | converted |
      | medium | JPY      | gold     | converted |
      | large  | EUR      | gold     | converted |

  @edge-case
  Scenario Outline: A invoices request at the edge of policy is handled
    Given a <size> request in <currency> from a <tier> customer
    When the request is handled under this scenario's policy
    Then the request is <outcome>

    Examples:
      | size   | currency | tier     | outcome   |
      | large  | USD      | silver   | accepted  |
      | medium | JPY      | silver   | converted |
      | medium | USD      | gold     | accepted  |
      | medium | EUR      | new      | converted |
      | large  | USD      | platinum | accepted  |
      | small  | JPY      | new      | converted |
      | medium | JPY      | gold     | converted |
      | small  | JPY      | platinum | converted |
      | small  | USD      | new      | pending   |
      | small  | JPY      | silver   | converted |
      | large  | JPY      | silver   | converted |
      | small  | GBP      | silver   | converted |

  @validation
  Scenario: A invoices request with no amount is refused
    Given a request with no amount
    When the request is handled under this scenario's policy
    Then the request is refused
