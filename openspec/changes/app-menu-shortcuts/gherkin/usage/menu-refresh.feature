Feature: The Usage menu refresh

  Refresh renews the figures in place, on a shortcut of its own that
  never shadows the surface reload.

  Background:
    Given a running gateway "relay" serving the virtual model "creative"
    And the person watches the usage screen

  Scenario: Refresh pulls in traffic served since the last draw
    Given the explorer stands on the last 7 days
    And "relay" served a request through "creative" that the figures do not yet count
    When the person picks Refresh Usage from the Usage menu
    Then the requests tile counts the new request
    And the explorer keeps its place on the last 7 days

  Scenario: Refresh prints a shortcut apart from the reload row's
    Then Refresh Usage prints a shortcut the View menu's reload row does not claim
