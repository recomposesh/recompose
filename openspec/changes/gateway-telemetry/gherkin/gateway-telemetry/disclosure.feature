Feature: The footer's control opens the logs drawer

  The footer stays passive, selectable text. A discrete Logs control at its
  trailing end opens the drawer, and the Gateway menu carries the same
  command as its twin.

  Background:
    Given the gateway detail of a running gateway "relay"

  Scenario: The Logs control opens the drawer
    Given the logs drawer stands closed
    When the person presses the Logs control at the footer's end
    Then the logs drawer opens under the stage

  Scenario: The close control returns the drawer
    Given an open logs drawer
    When the person takes the close control
    Then the drawer leaves
    And the footer stands as before

  Scenario: The keyboard alone opens the drawer
    Given the logs drawer stands closed
    When the person opens the drawer using only the keyboard
    Then the logs drawer stands open

  Scenario: Show Logs in the Gateway menu opens the drawer
    Given the logs drawer stands closed
    When the person picks "Show Logs" from the Gateway menu
    Then the logs drawer opens
    And the menu item reads checked

  Scenario: Show Logs closes what it opened
    Given the drawer stands open through the menu
    When the person picks "Show Logs" again
    Then the drawer leaves

  Scenario: The footer reading copies as text
    Given a footer reading live traffic
    When the person selects the footer text and copies it
    Then the clipboard holds the reading
