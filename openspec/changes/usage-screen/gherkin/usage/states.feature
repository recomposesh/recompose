Feature: Missing data reads as missing, never as zero

  A zero on this screen is a claim. While history loads, placeholders
  hold the shape; time the app cannot account for reads unknown; and a
  refused read names itself while the range control keeps matching what
  actually draws.

  Background:
    Given a running gateway "relay" serving the virtual model "creative"

  Scenario: A history-backed range loads as placeholders, never zeros
    Given "relay" has a week of served history
    And the stored history answers slowly
    When the person selects the 7d range
    Then each tile keeps its label and draws a dash instead of a figure
    And the chart draws its axis and caption without bars

  Scenario: An idle hour reads a true zero
    Given "relay" served nothing in the last hour
    When the person selects the 1h range
    Then the tiles read zero rather than placeholders

  Scenario: Minutes before the app can account for read unknown
    Given the app restarted 10 minutes ago
    When the person reads the 1h chart
    Then the minutes before the restart draw as gaps labelled unknown
    And never as zeros

  Scenario: A refused history read names itself and keeps the control honest
    Given the stored usage history cannot be read
    When the person selects the 7d range
    Then an inline card names the failed read and offers Retry
    And the range control moves to 1h so it matches what draws

  Scenario: Retry restores the refused range
    Given a refusal card stands after selecting 7d
    And the stored history can be read again
    When the person presses Retry
    Then the 7-day view draws and the card leaves
    And the range control reads 7d
