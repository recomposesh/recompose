Feature: The Usage menu mirrors the chart

  The metric submenu names exactly the series the chart draws, and the
  data table item's tick reads what the person sees.

  Background:
    Given the app is on the usage screen

  Scenario: The metric submenu names only what the chart draws
    Then the Metric submenu names Requests, Latency, Tokens, and Spend and nothing else

  Scenario: Show Data Table opens the twin and ticks
    When the person picks Show Data Table from the Usage menu
    Then the data table twin opens
    And the menu tick reads on

  Scenario: Closing the twin on screen clears the tick
    Given the data table twin stands open
    When the person closes the data table on screen
    Then the Usage menu's data table tick reads off
