Feature: The range control governs every number on the page

  Four ranges map onto the bucket ladder, and the control never claims a
  view it cannot draw: spend exists only at day width, and history past
  retention is a named limit, not a silent absence.

  Background:
    Given a running gateway "relay" serving the virtual model "creative"

  Scenario Outline: Each range draws its own bucket width
    Given "relay" has a month of served history
    When the person selects the <range> range
    Then the chart caption names <width> buckets

    Examples:
      | range | width  |
      | 1h    | minute |
      | 24h   | hour   |
      | 7d    | hour   |
      | 30d   | day    |

  Scenario: Switching the range moves every reading together
    Given "relay" has a month of served history
    When the person switches the range from 24h to 7d
    Then the tiles, the chart, and the breakdown all read the last 7 days

  Scenario: A sub-day spend tile prints today so far
    Given "relay" served requests today
    And the range stands at 1h
    When the person reads the spend tile
    Then the face prints today's spend so far and says so

  Scenario: Selecting spend snaps the range to a day width
    Given the range stands at 24h
    When the person selects the spend tile
    Then the range control moves to 7d
    And the chart draws spend by day

  Scenario: Spend keeps a standing day-width range
    Given the range stands at 30d
    When the person selects the spend tile
    Then the range control stays at 30d

  Scenario: A range past retention stands inert with its reason
    Given usage retention holds 7 days
    When the person reads the range control
    Then the 30d segment cannot be pressed
    And the segment names the retention window as the reason

  Scenario: The chart marks where retained history begins
    Given "relay" has served for longer than the 30-day retention window
    When the person reads the 30d chart
    Then an annotation marks the oldest retained day
